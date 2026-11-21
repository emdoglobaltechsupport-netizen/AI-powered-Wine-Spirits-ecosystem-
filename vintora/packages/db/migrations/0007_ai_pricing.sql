-- =============================================================
-- VINTORA — AI Pricing Engine (Market / Seller cross-cutting)
-- Source of truth: vintora/19-ai-pricing-engine.md §§2–6
-- Extends 0003_seller_dashboard.sql (price_benchmarks,
-- seller_recommendations). Plain PostgreSQL 16; Citus calls commented.
-- All tables are tenant-partitioned. Decision, audit and experiment
-- rows are append-only. Monetary rows use minor units + FX provenance.
-- =============================================================

BEGIN;

-- ---------- extend canonical benchmark table from 0003 ----------
ALTER TABLE price_benchmarks
  ADD COLUMN IF NOT EXISTS confidence numeric(5,4) CHECK (confidence BETWEEN 0 AND 1),
  ADD COLUMN IF NOT EXISTS source_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dispersion_bps integer,
  ADD COLUMN IF NOT EXISTS methodology_version text,
  ADD COLUMN IF NOT EXISTS observed_at timestamptz;

CREATE INDEX price_benchmarks_market_idx
  ON price_benchmarks (tenant_id, market, as_of DESC);

-- ---------- competitor data ----------
CREATE TABLE competitor_sources (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL,
  code             text NOT NULL,
  name             text NOT NULL,
  source_type      text NOT NULL CHECK (source_type IN ('licensed', 'public', 'internal')),
  licence_ref      text,
  terms_url        text,
  allowed_markets  text[] NOT NULL DEFAULT '{}',
  rate_limit_rpm   integer NOT NULL DEFAULT 60,
  status           text NOT NULL DEFAULT 'active'
                     CHECK (status IN ('active', 'paused', 'revoked')),
  last_fetch_at    timestamptz,
  UNIQUE (tenant_id, code)
);
COMMENT ON TABLE competitor_sources IS
  'Only licensed or permitted sources. Terms/ToS reference is mandatory.';

CREATE TABLE competitor_offers (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL,
  source_id        uuid NOT NULL REFERENCES competitor_sources(id),
  sku_id           uuid REFERENCES skus(id),          -- resolved SKU, null if unmatched
  raw_title        text NOT NULL,
  producer         text,
  appellation      text,
  vintage          integer,
  volume_ml        integer,
  condition_grade  text,
  observed_price_minor bigint NOT NULL CHECK (observed_price_minor > 0),
  currency_code    char(3) NOT NULL REFERENCES currencies(code),
  normalized_minor bigint,                             -- target currency + condition adj.
  normalization_fx numeric(18,8),
  fx_locked_at     timestamptz,
  match_score      numeric(5,4) CHECK (match_score BETWEEN 0 AND 1),
  match_status     text NOT NULL DEFAULT 'pending'
                     CHECK (match_status IN ('pending', 'matched', 'rejected', 'manual')),
  location_market  text,
  captured_at      timestamptz NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX competitor_offers_source_idx
  ON competitor_offers (tenant_id, source_id, captured_at DESC);
CREATE INDEX competitor_offers_sku_idx
  ON competitor_offers (tenant_id, sku_id, captured_at DESC);

-- ---------- forecasts and elasticity ----------
CREATE TABLE demand_forecasts (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL,
  sku_id           uuid NOT NULL REFERENCES skus(id),
  market           text NOT NULL,
  horizon          text NOT NULL CHECK (horizon IN ('7d', '14d', '30d')),
  as_of            date NOT NULL,
  p50_units        integer NOT NULL CHECK (p50_units >= 0),
  p90_units        integer NOT NULL CHECK (p90_units >= 0),
  cold_start       boolean NOT NULL DEFAULT false,
  model_version    text NOT NULL,
  trained_at       timestamptz,
  model_run_id     uuid,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, sku_id, market, horizon, as_of, model_version)
);
CREATE INDEX demand_forecasts_latest_idx
  ON demand_forecasts (tenant_id, sku_id, horizon, as_of DESC);

CREATE TABLE elasticity_estimates (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL,
  sku_id           uuid REFERENCES skus(id),
  segment          text NOT NULL DEFAULT 'sku',
  market           text NOT NULL DEFAULT '*',
  epsilon          numeric(9,5) NOT NULL,
  ci_low           numeric(9,5),
  ci_high          numeric(9,5),
  method           text NOT NULL CHECK (method IN ('double_ml', 'iv', 'experiment', 'category_prior')),
  experiment_backed boolean NOT NULL DEFAULT false,
  price_support_low_minor  bigint,
  price_support_high_minor bigint,
  model_version    text NOT NULL,
  trained_at       timestamptz,
  model_run_id     uuid,
  computed_at      timestamptz NOT NULL DEFAULT now(),
  CHECK (ci_low IS NULL OR ci_high IS NULL OR ci_low <= ci_high)
);
CREATE INDEX elasticity_estimates_sku_idx
  ON elasticity_estimates (tenant_id, sku_id, market, computed_at DESC);

-- ---------- margin and constraints ----------
CREATE TABLE margin_profiles (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL,
  sku_id              uuid NOT NULL REFERENCES skus(id),
  market              text NOT NULL,
  currency_code       char(3) NOT NULL REFERENCES currencies(code),
  unit_cost_minor     bigint NOT NULL CHECK (unit_cost_minor >= 0),
  freight_minor       bigint NOT NULL DEFAULT 0,
  duty_tax_minor      bigint NOT NULL DEFAULT 0,
  storage_minor       bigint NOT NULL DEFAULT 0,
  returns_allowance_minor bigint NOT NULL DEFAULT 0,
  commission_rate     numeric(6,5) NOT NULL CHECK (commission_rate BETWEEN 0 AND 1),
  processing_rate     numeric(6,5) NOT NULL CHECK (processing_rate BETWEEN 0 AND 1),
  current_price_minor bigint NOT NULL,
  contribution_minor  bigint NOT NULL,
  break_even_minor    bigint NOT NULL,
  fx_rate             numeric(18,8),
  fx_locked_at        timestamptz,
  as_of               date NOT NULL,
  UNIQUE (tenant_id, sku_id, market, currency_code, as_of)
);
CREATE INDEX margin_profiles_sku_idx
  ON margin_profiles (tenant_id, sku_id, market, as_of DESC);

CREATE TABLE pricing_constraints (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL,
  seller_id        uuid NOT NULL REFERENCES sellers(id),
  sku_id           uuid NOT NULL REFERENCES skus(id),
  market           text NOT NULL DEFAULT '*',
  floor_minor      bigint NOT NULL CHECK (floor_minor > 0),
  ceiling_minor    bigint NOT NULL CHECK (ceiling_minor > 0),
  brand_band_low_minor  bigint,
  brand_band_high_minor bigint,
  min_margin_bps   integer NOT NULL DEFAULT 0,
  max_discount_bps integer NOT NULL DEFAULT 0,
  max_promos_per_window integer NOT NULL DEFAULT 2,
  luxury           boolean NOT NULL DEFAULT false,
  effective_from   timestamptz NOT NULL DEFAULT now(),
  effective_to     timestamptz,
  CHECK (ceiling_minor >= floor_minor)
);
CREATE INDEX pricing_constraints_lookup_idx
  ON pricing_constraints (tenant_id, sku_id, market, effective_from, effective_to);

-- ---------- decisions ----------
CREATE TABLE price_recommendations (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               uuid NOT NULL,
  seller_id               uuid NOT NULL REFERENCES sellers(id),
  sku_id                  uuid NOT NULL REFERENCES skus(id),
  market                  text NOT NULL,
  currency_code           char(3) NOT NULL REFERENCES currencies(code),
  current_price_minor     bigint NOT NULL,
  proposed_price_minor    bigint NOT NULL,
  expected_gmv_lift_bps   integer,
  expected_margin_lift_bps integer,
  expected_turnover_days  integer,
  rationale_json          jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence              numeric(5,4) NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  model_version           text NOT NULL,
  method_version          text NOT NULL,
  model_run_id            uuid,
  seller_recommendation_id uuid REFERENCES seller_recommendations(id),
  status                  text NOT NULL DEFAULT 'proposed'
                            CHECK (status IN ('proposed', 'approved', 'rejected',
                                              'expired', 'applied', 'reverted')),
  actor_id                uuid REFERENCES users(id),
  decided_at              timestamptz,
  expires_at              timestamptz,
  created_at              timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX price_recommendations_open_idx
  ON price_recommendations (tenant_id, status, created_at DESC)
  WHERE status = 'proposed';
CREATE INDEX price_recommendations_sku_idx
  ON price_recommendations (tenant_id, sku_id, created_at DESC);

CREATE TABLE promotion_recommendations (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                uuid NOT NULL,
  seller_id                uuid NOT NULL REFERENCES sellers(id),
  sku_id                   uuid NOT NULL REFERENCES skus(id),
  market                   text NOT NULL,
  kind                     text NOT NULL CHECK (kind IN
                             ('mixed_case', 'volume_discount', 'points_boost',
                              'early_access', 'free_delivery', 'editorial_feature')),
  discount_bps             integer NOT NULL DEFAULT 0,
  duration_days            integer NOT NULL CHECK (duration_days > 0),
  terms                    text NOT NULL,
  eligible_segment_json    jsonb NOT NULL DEFAULT '{}'::jsonb,
  incremental_margin_minor bigint NOT NULL,
  confidence               numeric(5,4) NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  dilution_score           numeric(6,4),
  model_version            text NOT NULL,
  status                   text NOT NULL DEFAULT 'proposed'
                             CHECK (status IN ('proposed', 'approved', 'rejected',
                                               'expired', 'published')),
  actor_id                 uuid REFERENCES users(id),
  expires_at               timestamptz,
  created_at               timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX promotion_recommendations_open_idx
  ON promotion_recommendations (tenant_id, status, created_at DESC)
  WHERE status = 'proposed';

-- ---------- experiments ----------
CREATE TABLE pricing_experiments (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL,
  name             text NOT NULL,
  model_version    text NOT NULL,
  status           text NOT NULL DEFAULT 'draft'
                     CHECK (status IN ('draft', 'shadow', 'ab_test', 'ramping',
                                       'completed', 'halted')),
  holdout_pct      integer NOT NULL CHECK (holdout_pct BETWEEN 0 AND 100),
  guardrails_json  jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at       timestamptz,
  ended_at         timestamptz,
  halted_reason    text,
  created_by       uuid REFERENCES users(id),
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX pricing_experiments_status_idx
  ON pricing_experiments (tenant_id, status, started_at DESC);

CREATE TABLE pricing_experiment_results (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL,
  experiment_id    uuid NOT NULL REFERENCES pricing_experiments(id) ON DELETE CASCADE,
  arm              text NOT NULL CHECK (arm IN ('control', 'treatment', 'shadow')),
  period_start     date NOT NULL,
  period_end       date NOT NULL,
  gmv_lift_bps     integer,
  margin_lift_bps  integer,
  turnover_days    integer,
  dilution_index   numeric(8,4),
  sample_size      integer NOT NULL DEFAULT 0,
  significant      boolean NOT NULL DEFAULT false,
  computed_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (experiment_id, arm, period_start, period_end)
);

-- ---------- MLOps ----------
CREATE TABLE model_runs (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL,
  model_key        text NOT NULL CHECK (model_key IN
                     ('benchmark', 'forecast', 'elasticity', 'margin',
                      'rl_policy', 'promotion')),
  model_version    text NOT NULL,
  stage            text NOT NULL DEFAULT 'dev'
                     CHECK (stage IN ('dev', 'staging', 'shadow', 'champion', 'retired')),
  mlflow_run_id    text,
  method_version   text,
  trained_at       timestamptz,
  started_at       timestamptz NOT NULL DEFAULT now(),
  finished_at      timestamptz,
  status           text NOT NULL DEFAULT 'running'
                     CHECK (status IN ('running', 'succeeded', 'failed', 'cancelled')),
  summary_json     jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX model_runs_lookup_idx
  ON model_runs (tenant_id, model_key, stage, started_at DESC);

CREATE TABLE model_metrics (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL,
  model_run_id     uuid NOT NULL REFERENCES model_runs(id) ON DELETE CASCADE,
  metric_name      text NOT NULL,
  metric_value     numeric(14,6) NOT NULL,
  segment          text NOT NULL DEFAULT 'overall',
  evaluation_type  text NOT NULL CHECK (evaluation_type IN ('offline', 'backtest', 'online', 'shadow')),
  measured_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX model_metrics_run_idx ON model_metrics (tenant_id, model_run_id, metric_name);

CREATE TABLE pricing_feature_snapshots (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL,
  model_run_id     uuid REFERENCES model_runs(id),
  sku_id           uuid NOT NULL REFERENCES skus(id),
  market           text NOT NULL,
  captured_at      timestamptz NOT NULL DEFAULT now(),
  features_json    jsonb NOT NULL,
  decision_json    jsonb NOT NULL DEFAULT '{}'::jsonb,
  outcome_json     jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX pricing_feature_snapshots_replay_idx
  ON pricing_feature_snapshots (tenant_id, model_run_id, sku_id, captured_at DESC);

-- ---------- audit ----------
CREATE TABLE pricing_audit_events (
  id               bigserial PRIMARY KEY,
  tenant_id        uuid NOT NULL,
  entity_type      text NOT NULL CHECK (entity_type IN
                     ('benchmark', 'recommendation', 'promotion', 'experiment',
                      'model', 'constraint', 'application')),
  entity_id        uuid,
  sku_id           uuid,
  action           text NOT NULL,
  from_value       jsonb,
  to_value         jsonb,
  actor            text NOT NULL,
  reason           text,
  trace_id         text,
  occurred_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX pricing_audit_events_entity_idx
  ON pricing_audit_events (tenant_id, sku_id, occurred_at DESC);
COMMENT ON TABLE pricing_audit_events IS
  'Append-only. Every proposal, approval, application and revert is recorded.';

-- ---------- row-level security ----------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'competitor_sources', 'competitor_offers', 'demand_forecasts',
    'elasticity_estimates', 'margin_profiles', 'pricing_constraints',
    'price_recommendations', 'promotion_recommendations', 'pricing_experiments',
    'pricing_experiment_results', 'model_runs', 'model_metrics',
    'pricing_feature_snapshots', 'pricing_audit_events'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I '
      || 'USING (tenant_id = current_setting(''app.tenant_id'', true)::uuid) '
      || 'WITH CHECK (tenant_id = current_setting(''app.tenant_id'', true)::uuid)',
      t);
  END LOOP;
END $$;

-- Citus distribution notes (apply on the sharded deployment only):
-- SELECT create_distributed_table('competitor_offers', 'tenant_id');
-- SELECT create_distributed_table('demand_forecasts', 'tenant_id');
-- SELECT create_distributed_table('elasticity_estimates', 'tenant_id');
-- SELECT create_distributed_table('price_recommendations', 'tenant_id');
-- SELECT create_distributed_table('promotion_recommendations', 'tenant_id');
-- SELECT create_distributed_table('pricing_feature_snapshots', 'tenant_id');
-- SELECT create_distributed_table('pricing_audit_events', 'tenant_id');
-- Reference/replicated: competitor_sources, price_benchmarks, margin_profiles,
--   pricing_constraints, model_runs, pricing_experiments (co-locate where possible).
-- NOTE: price changes are applied through the Listing service only after
--   seller approval; this migration intentionally contains no trigger that
--   writes listing prices automatically.

COMMIT;
