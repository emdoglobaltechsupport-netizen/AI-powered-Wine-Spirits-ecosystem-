-- =============================================================
-- VINTORA — Wine Investment Marketplace (Vintora Vault)
-- Source of truth: vintora/20-wine-investment-marketplace.md §§3–6
-- Extends 0001_initial.sql (lots, vault_holdings, trades). Plain
-- PostgreSQL 16; Citus calls commented. All money in minor units
-- with currency + FX provenance. Ledgers, orders, fees, custody
-- events and snapshots are append-only. USDC settlement is
-- recorded by reference; funds move only via the licensed
-- settlement partner.
-- =============================================================

BEGIN;

-- ---------- extend baseline lots ----------
ALTER TABLE lots
  ADD COLUMN IF NOT EXISTS tenant_id uuid NOT NULL
    DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  ADD COLUMN IF NOT EXISTS lot_code text,
  ADD COLUMN IF NOT EXISTS seller_id uuid REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS vintage integer,
  ADD COLUMN IF NOT EXISTS producer text,
  ADD COLUMN IF NOT EXISTS appellation text,
  ADD COLUMN IF NOT EXISTS region text,
  ADD COLUMN IF NOT EXISTS country_code char(2),
  ADD COLUMN IF NOT EXISTS format_ml integer DEFAULT 750,
  ADD COLUMN IF NOT EXISTS condition_score integer CHECK (condition_score BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS provenance_score integer CHECK (provenance_score BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS rarity_score integer CHECK (rarity_score BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS provenance_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS insured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS fair_value_minor bigint,
  ADD COLUMN IF NOT EXISTS currency_code char(3) DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS last_valuation_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX lots_tenant_status_idx ON lots (tenant_id, status, lot_code);
COMMENT ON TABLE lots IS
  'A physically custodied fine-wine lot. Condition/provenance/rarity scores are evidence-backed and versioned via custody_events.';

-- ---------- extend baseline holdings ----------
ALTER TABLE vault_holdings
  ADD COLUMN IF NOT EXISTS tenant_id uuid NOT NULL
    DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  ADD COLUMN IF NOT EXISTS portfolio_id uuid,
  ADD COLUMN IF NOT EXISTS high_water_mark_usd numeric(14,2),
  ADD COLUMN IF NOT EXISTS currency_code char(3) DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'closed', 'transferred')),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX vault_holdings_tenant_user_idx
  ON vault_holdings (tenant_id, user_id, status, lot_id);

-- ---------- extend baseline trades ----------
ALTER TABLE trades
  ADD COLUMN IF NOT EXISTS tenant_id uuid NOT NULL
    DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  ADD COLUMN IF NOT EXISTS order_id uuid,
  ADD COLUMN IF NOT EXISTS side text NOT NULL DEFAULT 'buy'
    CHECK (side IN ('buy', 'sell')),
  ADD COLUMN IF NOT EXISTS execution_fee_minor bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS currency_code char(3) DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS fx_rate numeric(18,8),
  ADD COLUMN IF NOT EXISTS fx_locked_at timestamptz,
  ADD COLUMN IF NOT EXISTS settlement_ref text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'settled'
    CHECK (status IN ('pending', 'settled', 'failed', 'cancelled')),
  ADD COLUMN IF NOT EXISTS idempotency_key text;

CREATE UNIQUE INDEX trades_idempotency_idx
  ON trades (tenant_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX trades_tenant_lot_idx ON trades (tenant_id, lot_id, executed_at DESC);

-- ---------- listings, bids, orders ----------
CREATE TABLE vault_listings (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             uuid NOT NULL,
  user_id               uuid NOT NULL REFERENCES users(id),
  lot_id                uuid NOT NULL REFERENCES lots(id),
  fraction_available    numeric(9,6) NOT NULL CHECK (fraction_available > 0 AND fraction_available <= 1),
  fraction_increment    numeric(9,6) NOT NULL DEFAULT 0.000001,
  minimum_usd           numeric(14,2) NOT NULL DEFAULT 25 CHECK (minimum_usd >= 25),
  ask_price_minor       bigint NOT NULL CHECK (ask_price_minor > 0),
  currency_code         char(3) NOT NULL REFERENCES currencies(code),
  settlement_asset      text NOT NULL DEFAULT 'USDC',
  status                text NOT NULL DEFAULT 'active'
                          CHECK (status IN ('draft', 'active', 'paused', 'sold', 'cancelled')),
  fee_schedule_version  text NOT NULL DEFAULT 'v1',
  provenance_ref        text,
  condition_grade       text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  expires_at            timestamptz
);
CREATE INDEX vault_listings_lot_idx
  ON vault_listings (tenant_id, lot_id, status, ask_price_minor, created_at);

CREATE TABLE vault_bids (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL,
  user_id             uuid NOT NULL REFERENCES users(id),
  lot_id              uuid NOT NULL REFERENCES lots(id),
  bid_price_minor     bigint NOT NULL CHECK (bid_price_minor > 0),
  currency_code       char(3) NOT NULL REFERENCES currencies(code),
  fraction_requested  numeric(9,6) NOT NULL CHECK (fraction_requested > 0 AND fraction_requested <= 1),
  status              text NOT NULL DEFAULT 'open'
                        CHECK (status IN ('open', 'partial', 'filled', 'cancelled', 'paused')),
  anomaly_flag        boolean NOT NULL DEFAULT false,
  placed_at           timestamptz NOT NULL DEFAULT now(),
  expires_at          timestamptz
);
CREATE INDEX vault_bids_book_idx
  ON vault_bids (tenant_id, lot_id, status, bid_price_minor DESC, placed_at);

CREATE TABLE vault_orders (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL,
  user_id             uuid NOT NULL REFERENCES users(id),
  lot_id              uuid NOT NULL REFERENCES lots(id),
  listing_id          uuid REFERENCES vault_listings(id),
  bid_id              uuid REFERENCES vault_bids(id),
  side                text NOT NULL CHECK (side IN ('buy', 'sell')),
  order_type          text NOT NULL CHECK (order_type IN ('market', 'limit', 'best_execution')),
  fraction            numeric(9,6) NOT NULL CHECK (fraction > 0 AND fraction <= 1),
  limit_price_minor   bigint,
  currency_code       char(3) NOT NULL REFERENCES currencies(code),
  status              text NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'open', 'partially_filled', 'filled',
                                          'cancelled', 'paused', 'failed')),
  filled_fraction     numeric(9,6) NOT NULL DEFAULT 0,
  average_price_minor bigint,
  kyc_checked_at      timestamptz,
  risk_ack_version    text,
  anomaly_flag        boolean NOT NULL DEFAULT false,
  idempotency_key     text NOT NULL,
  placed_at           timestamptz NOT NULL DEFAULT now(),
  settled_at          timestamptz,
  UNIQUE (tenant_id, idempotency_key)
);
CREATE INDEX vault_orders_user_idx
  ON vault_orders (tenant_id, user_id, status, placed_at DESC);
COMMENT ON TABLE vault_orders IS
  'Append-only order intents. State changes are new rows/status transitions with audit events.';

-- ---------- portfolio ----------
CREATE TABLE vault_portfolios (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             uuid NOT NULL,
  user_id               uuid NOT NULL REFERENCES users(id),
  currency_code         char(3) NOT NULL REFERENCES currencies(code),
  total_value_minor     bigint NOT NULL DEFAULT 0,
  cost_basis_minor      bigint NOT NULL DEFAULT 0,
  unrealised_pnl_minor  bigint NOT NULL DEFAULT 0,
  realised_pnl_minor    bigint NOT NULL DEFAULT 0,
  high_water_mark_minor bigint NOT NULL DEFAULT 0,
  risk_ack_version      text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id)
);

CREATE TABLE portfolio_snapshots (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             uuid NOT NULL,
  portfolio_id          uuid NOT NULL REFERENCES vault_portfolios(id) ON DELETE CASCADE,
  user_id               uuid NOT NULL REFERENCES users(id),
  as_of                 date NOT NULL,
  total_value_minor     bigint NOT NULL,
  cost_basis_minor      bigint NOT NULL,
  unrealised_pnl_minor  bigint NOT NULL,
  realised_pnl_minor    bigint NOT NULL,
  allocation_json       jsonb NOT NULL DEFAULT '{}'::jsonb,
  risk_json             jsonb NOT NULL DEFAULT '{}'::jsonb,
  model_version         text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, portfolio_id, as_of)
);
CREATE INDEX portfolio_snapshots_user_idx
  ON portfolio_snapshots (tenant_id, user_id, as_of DESC);

-- ---------- valuation, forecast, liquidity, comparables ----------
CREATE TABLE lot_valuations (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL,
  lot_id              uuid NOT NULL REFERENCES lots(id),
  currency_code       char(3) NOT NULL REFERENCES currencies(code),
  fair_value_minor    bigint NOT NULL,
  low_minor           bigint,
  high_minor          bigint,
  last_trade_minor    bigint,
  last_trade_stale    boolean NOT NULL DEFAULT false,
  confidence          numeric(5,4) NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  model_version       text NOT NULL,
  method_version      text NOT NULL,
  as_of               timestamptz NOT NULL DEFAULT now(),
  human_reviewed      boolean NOT NULL DEFAULT false
);
CREATE INDEX lot_valuations_lot_idx
  ON lot_valuations (tenant_id, lot_id, as_of DESC);

CREATE TABLE appreciation_forecasts (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL,
  lot_id              uuid NOT NULL REFERENCES lots(id),
  horizon             text NOT NULL CHECK (horizon IN ('1y', '3y', '5y')),
  low_bps             integer NOT NULL,
  mid_bps             integer NOT NULL,
  high_bps            integer NOT NULL,
  confidence          numeric(5,4) NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  currency_code       char(3) NOT NULL REFERENCES currencies(code),
  model_version       text NOT NULL,
  trained_at          timestamptz,
  as_of               date NOT NULL,
  disclaimer          text NOT NULL DEFAULT 'Estimate range, not a guaranteed return.',
  UNIQUE (tenant_id, lot_id, horizon, as_of, model_version),
  CHECK (low_bps <= mid_bps AND mid_bps <= high_bps)
);
CREATE INDEX appreciation_forecasts_lot_idx
  ON appreciation_forecasts (tenant_id, lot_id, horizon, as_of DESC);

CREATE TABLE liquidity_scores (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             uuid NOT NULL,
  lot_id                uuid NOT NULL REFERENCES lots(id),
  score                 integer NOT NULL CHECK (score BETWEEN 0 AND 100),
  expected_days_to_sell integer,
  bid_depth_minor       bigint,
  confidence            numeric(5,4) NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  explanation_json      jsonb NOT NULL DEFAULT '{}'::jsonb,
  model_version         text NOT NULL,
  as_of                 date NOT NULL,
  UNIQUE (tenant_id, lot_id, as_of, model_version)
);
CREATE INDEX liquidity_scores_lot_idx
  ON liquidity_scores (tenant_id, lot_id, as_of DESC);

CREATE TABLE comparable_sales (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL,
  lot_id              uuid NOT NULL REFERENCES lots(id),
  comparable_lot_id   uuid REFERENCES lots(id),
  source              text NOT NULL CHECK (source IN ('vault_trade', 'external', 'kg_match')),
  price_minor         bigint NOT NULL,
  currency_code       char(3) NOT NULL REFERENCES currencies(code),
  adjustment_json     jsonb NOT NULL DEFAULT '{}'::jsonb,
  match_score         numeric(5,4) CHECK (match_score BETWEEN 0 AND 1),
  sold_at             date,
  as_of               date NOT NULL,
  UNIQUE (tenant_id, lot_id, comparable_lot_id, source, sold_at)
);

-- ---------- market analytics ----------
CREATE TABLE market_indices (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             uuid NOT NULL,
  code                  text NOT NULL,
  name                  text NOT NULL,
  methodology_version   text NOT NULL,
  base_value            numeric(14,4) NOT NULL,
  currency_code         char(3) NOT NULL REFERENCES currencies(code),
  rebalance_frequency   text NOT NULL DEFAULT 'quarterly',
  status                text NOT NULL DEFAULT 'active',
  UNIQUE (tenant_id, code, methodology_version)
);

CREATE TABLE market_analytics_daily (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             uuid NOT NULL,
  index_id              uuid REFERENCES market_indices(id),
  lot_id                uuid REFERENCES lots(id),
  as_of                 date NOT NULL,
  index_value           numeric(14,4),
  change_bps            integer,
  volume_minor          bigint NOT NULL DEFAULT 0,
  trade_count           integer NOT NULL DEFAULT 0,
  bid_ask_spread_bps    integer,
  breadth_advancing     integer,
  breadth_declining     integer,
  methodology_version   text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  CHECK (index_id IS NOT NULL OR lot_id IS NOT NULL)
);
CREATE INDEX market_analytics_daily_idx
  ON market_analytics_daily (tenant_id, index_id, lot_id, as_of DESC);

-- ---------- fees ----------
CREATE TABLE fee_charges (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             uuid NOT NULL,
  user_id               uuid NOT NULL REFERENCES users(id),
  holding_id            uuid REFERENCES vault_holdings(id),
  order_id              uuid REFERENCES vault_orders(id),
  trade_id              uuid REFERENCES trades(id),
  fee_type              text NOT NULL CHECK (fee_type IN
                          ('buy', 'sell', 'custody', 'performance', 'adjustment')),
  amount_minor          bigint NOT NULL CHECK (amount_minor >= 0),
  currency_code         char(3) NOT NULL REFERENCES currencies(code),
  rate_bps              integer NOT NULL CHECK (rate_bps >= 0),
  base_minor            bigint,
  period_start          date,
  period_end            date,
  status                text NOT NULL DEFAULT 'charged'
                          CHECK (status IN ('accrued', 'charged', 'waived', 'reversed')),
  idempotency_key       text NOT NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, idempotency_key)
);
CREATE INDEX fee_charges_user_idx
  ON fee_charges (tenant_id, user_id, fee_type, period_end DESC);
COMMENT ON TABLE fee_charges IS
  'Append-only fee ledger. Performance fees require a gain above the high-water mark.';

CREATE TABLE performance_fee_periods (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             uuid NOT NULL,
  user_id               uuid NOT NULL REFERENCES users(id),
  holding_id            uuid NOT NULL REFERENCES vault_holdings(id),
  period_start          date NOT NULL,
  period_end            date NOT NULL,
  opening_hwm_minor     bigint NOT NULL,
  closing_value_minor   bigint NOT NULL,
  gain_above_hwm_minor  bigint NOT NULL DEFAULT 0,
  performance_rate_bps  integer NOT NULL CHECK (performance_rate_bps BETWEEN 500 AND 1500),
  fee_minor             bigint NOT NULL DEFAULT 0,
  new_hwm_minor         bigint NOT NULL,
  fee_charge_id         uuid REFERENCES fee_charges(id),
  computed_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, holding_id, period_start, period_end),
  CHECK (closing_value_minor >= 0 AND new_hwm_minor >= opening_hwm_minor)
);
CREATE INDEX performance_fee_periods_user_idx
  ON performance_fee_periods (tenant_id, user_id, period_end DESC);
COMMENT ON TABLE performance_fee_periods IS
  'HWM audit: fee = max(0, closing - opening_hwm) * rate; never charged on losses or break-even recoveries.';

-- ---------- custody + audit ----------
CREATE TABLE custody_events (
  id                  bigserial PRIMARY KEY,
  tenant_id           uuid NOT NULL,
  lot_id              uuid NOT NULL REFERENCES lots(id),
  event_type          text NOT NULL CHECK (event_type IN
                        ('intake', 'transfer', 'condition_regrade', 'insurance',
                         'provenance_update', 'dispute', 'release', 'audit')),
  from_custodian      text,
  to_custodian        text,
  from_owner_id       uuid REFERENCES users(id),
  to_owner_id         uuid REFERENCES users(id),
  condition_grade     text,
  condition_score     integer CHECK (condition_score BETWEEN 0 AND 100),
  evidence_hash       bytea,
  evidence_object_key text,
  occurred_at         timestamptz NOT NULL,
  recorded_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX custody_events_lot_idx
  ON custody_events (tenant_id, lot_id, occurred_at);
COMMENT ON TABLE custody_events IS
  'Append-only, unbroken custody chain. Physical bottles stay in the same bonded warehouse on beneficial-owner changes.';

CREATE TABLE vault_audit_events (
  id               bigserial PRIMARY KEY,
  tenant_id        uuid NOT NULL,
  entity_type      text NOT NULL CHECK (entity_type IN
                     ('lot', 'listing', 'order', 'trade', 'holding', 'fee',
                      'valuation', 'anomaly', 'custody')),
  entity_id        text,
  user_id          uuid REFERENCES users(id),
  action           text NOT NULL,
  from_value       jsonb,
  to_value         jsonb,
  actor            text NOT NULL,
  reason           text,
  trace_id         text,
  occurred_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX vault_audit_events_entity_idx
  ON vault_audit_events (tenant_id, entity_type, entity_id, occurred_at DESC);
COMMENT ON TABLE vault_audit_events IS
  'Append-only compliance audit for listings, trades, fees, valuations and anomaly decisions.';

-- ---------- row-level security ----------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'vault_listings', 'vault_bids', 'vault_orders', 'vault_portfolios',
    'portfolio_snapshots', 'fee_charges', 'performance_fee_periods'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY tenant_user_isolation ON %I '
      || 'USING (tenant_id = current_setting(''app.tenant_id'', true)::uuid '
      || 'AND user_id = current_setting(''app.user_id'', true)::uuid) '
      || 'WITH CHECK (tenant_id = current_setting(''app.tenant_id'', true)::uuid '
      || 'AND user_id = current_setting(''app.user_id'', true)::uuid)',
      t);
  END LOOP;

  FOREACH t IN ARRAY ARRAY[
    'lot_valuations', 'appreciation_forecasts', 'liquidity_scores',
    'comparable_sales', 'market_indices', 'market_analytics_daily',
    'custody_events', 'vault_audit_events'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I '
      || 'USING (tenant_id = current_setting(''app.tenant_id'', true)::uuid) '
      || 'WITH CHECK (tenant_id = current_setting(''app.tenant_id'', true)::uuid)',
      t);
  END LOOP;

  -- baseline tables gain tenant scope; keep existing user scope where present
  EXECUTE 'ALTER TABLE lots ENABLE ROW LEVEL SECURITY';
  EXECUTE 'CREATE POLICY tenant_isolation ON lots '
       || 'USING (tenant_id = current_setting(''app.tenant_id'', true)::uuid) '
       || 'WITH CHECK (tenant_id = current_setting(''app.tenant_id'', true)::uuid)';

  FOREACH t IN ARRAY ARRAY['vault_holdings', 'trades'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I '
      || 'USING (tenant_id = current_setting(''app.tenant_id'', true)::uuid) '
      || 'WITH CHECK (tenant_id = current_setting(''app.tenant_id'', true)::uuid)',
      t);
  END LOOP;
END $$;

-- Citus distribution notes (apply on the sharded deployment only):
-- SELECT create_distributed_table('vault_listings', 'tenant_id');
-- SELECT create_distributed_table('vault_bids', 'tenant_id');
-- SELECT create_distributed_table('vault_orders', 'user_id');
-- SELECT create_distributed_table('vault_portfolios', 'user_id');
-- SELECT create_distributed_table('portfolio_snapshots', 'user_id');
-- SELECT create_distributed_table('fee_charges', 'user_id');
-- SELECT create_distributed_table('performance_fee_periods', 'user_id');
-- Reference/replicated: market_indices, market_analytics_daily, lot_valuations,
--   appreciation_forecasts, liquidity_scores, comparable_sales, custody_events.
-- NOTE: no trigger here moves funds. USDC settlement runs only through the
--   licensed settlement partner; this migration records references and fees.

COMMIT;
