-- =============================================================
-- VINTORA — Loyalty & Rewards domain (Vintora Rewards)
-- Source of truth: vintora/18-loyalty-rewards-module.md §§2–3
-- Extends 0001_initial.sql (loyalty_accounts, loyalty_transactions,
-- rewards). Plain PostgreSQL 16; Citus calls commented for the
-- sharded deployment. All business rows are tenant + user scoped.
-- Ledger, rule, history, badge and challenge rows are append-only.
-- =============================================================

BEGIN;

-- ---------- extend baseline account ----------
-- loyalty_accounts is globally keyed by user_id in 0001; add a tenant
-- column with a canonical default so it can be RLS-scoped like other domains.
ALTER TABLE loyalty_accounts
  ADD COLUMN IF NOT EXISTS tenant_id uuid NOT NULL
    DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  ADD COLUMN IF NOT EXISTS status_protected_until timestamptz,
  ADD COLUMN IF NOT EXISTS qualifying_spend_minor bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cashback_balance_minor bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS currency_code char(3) DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS last_activity_at timestamptz,
  ADD COLUMN IF NOT EXISTS privacy_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- ---------- extend baseline points ledger ----------
-- Baseline columns: id, user_id, account_id, type, points, source_module,
-- reference_id, idempotency_key (UNIQUE).
ALTER TABLE loyalty_transactions
  ADD COLUMN IF NOT EXISTS tenant_id uuid NOT NULL
    DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  ADD COLUMN IF NOT EXISTS direction text NOT NULL DEFAULT 'earn'
    CHECK (direction IN ('earn', 'redeem', 'expire', 'adjust', 'clawback')),
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS rule_version text,
  ADD COLUMN IF NOT EXISTS balance_after integer,
  ADD COLUMN IF NOT EXISTS event_id text,
  ADD COLUMN IF NOT EXISTS metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS loyalty_transactions_user_time_idx
  ON loyalty_transactions (tenant_id, user_id, created_at DESC);
CREATE INDEX loyalty_transactions_expiry_idx
  ON loyalty_transactions (tenant_id, expires_at)
  WHERE direction = 'earn' AND expires_at IS NOT NULL;
CREATE UNIQUE INDEX loyalty_transactions_event_idx
  ON loyalty_transactions (tenant_id, event_id)
  WHERE event_id IS NOT NULL;
COMMENT ON TABLE loyalty_transactions IS
  'Append-only points ledger. Balance is derived from SUM(points).';

-- Baseline rewards catalogue is a reference table; extend it for redemptions.
ALTER TABLE rewards
  ADD COLUMN IF NOT EXISTS reward_type text NOT NULL DEFAULT 'catalogue'
    CHECK (reward_type IN ('catalogue', 'experience', 'partner', 'cashback')),
  ADD COLUMN IF NOT EXISTS points_cost integer,
  ADD COLUMN IF NOT EXISTS cashback_cost_minor bigint,
  ADD COLUMN IF NOT EXISTS market text,
  ADD COLUMN IF NOT EXISTS requires_age boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS stock integer,
  ADD COLUMN IF NOT EXISTS terms text;

-- ---------- versioned rules ----------
CREATE TABLE earn_rules (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL,
  code              text NOT NULL,
  source_module     text NOT NULL,
  market            text NOT NULL DEFAULT '*',
  points_per_usd    integer NOT NULL DEFAULT 0,
  flat_points       integer NOT NULL DEFAULT 0,
  quality_multiplier numeric(6,3) NOT NULL DEFAULT 1.0,
  per_event_cap     integer NOT NULL DEFAULT 10000,
  per_period_cap    integer NOT NULL DEFAULT 100000,
  expiry_months     integer NOT NULL DEFAULT 12,
  requires_age      boolean NOT NULL DEFAULT true,
  allowed_skus      uuid[] NOT NULL DEFAULT '{}',
  excluded_skus     uuid[] NOT NULL DEFAULT '{}',
  exclude_luxury    boolean NOT NULL DEFAULT false,
  version           text NOT NULL,
  enabled           boolean NOT NULL DEFAULT true,
  effective_from    timestamptz NOT NULL DEFAULT now(),
  effective_to      timestamptz,
  UNIQUE (tenant_id, code, version),
  CHECK (quality_multiplier > 0 AND expiry_months > 0)
);
CREATE INDEX earn_rules_lookup_idx
  ON earn_rules (tenant_id, source_module, market, effective_from, effective_to);

CREATE TABLE cashback_rules (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL,
  code                text NOT NULL,
  market              text NOT NULL,
  tier_min            text NOT NULL CHECK (tier_min IN ('bronze','silver','gold','platinum')),
  source              text NOT NULL CHECK (source IN ('partner','card','marketplace')),
  rate_bps            integer NOT NULL CHECK (rate_bps >= 0),
  per_event_cap_minor bigint NOT NULL DEFAULT 0,
  annual_cap_minor    bigint NOT NULL DEFAULT 0,
  market_allows_rebate boolean NOT NULL DEFAULT true,
  currency_code       char(3) NOT NULL REFERENCES currencies(code),
  version             text NOT NULL,
  enabled             boolean NOT NULL DEFAULT true,
  effective_from      timestamptz NOT NULL DEFAULT now(),
  effective_to        timestamptz,
  UNIQUE (tenant_id, code, version, market)
);
CREATE INDEX cashback_rules_lookup_idx
  ON cashback_rules (tenant_id, market, tier_min, source, effective_from, effective_to);

CREATE TABLE tier_rules (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL,
  tier             text NOT NULL CHECK (tier IN ('bronze','silver','gold','platinum')),
  rank             integer NOT NULL CHECK (rank >= 0),
  threshold_minor  bigint NOT NULL CHECK (threshold_minor >= 0),
  earn_multiplier  numeric(6,3) NOT NULL DEFAULT 1.0,
  benefits_json    jsonb NOT NULL DEFAULT '[]'::jsonb,
  protection_days  integer NOT NULL DEFAULT 0,
  version          text NOT NULL,
  effective_from   date NOT NULL,
  effective_to     date,
  UNIQUE (tenant_id, tier, version),
  CHECK (effective_to IS NULL OR effective_to >= effective_from)
);
CREATE INDEX tier_rules_lookup_idx
  ON tier_rules (tenant_id, effective_from, effective_to);

-- ---------- cashback ledger ----------
CREATE TABLE cashback_ledger (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL,
  user_id          uuid NOT NULL,
  amount_minor     bigint NOT NULL,
  currency_code    char(3) NOT NULL REFERENCES currencies(code),
  source           text NOT NULL CHECK (source IN ('partner','card','marketplace','adjustment')),
  direction        text NOT NULL DEFAULT 'credit'
                     CHECK (direction IN ('credit','debit','expire')),
  reference_id     text,
  rule_version     text,
  fx_rate          numeric(18,8),
  fx_locked_at     timestamptz,
  expires_at       timestamptz,
  idempotency_key  text NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, idempotency_key)
);
CREATE INDEX cashback_ledger_user_idx
  ON cashback_ledger (tenant_id, user_id, created_at DESC);
COMMENT ON TABLE cashback_ledger IS
  'Append-only wallet-credit ledger. Never cash-out, transfer or resale.';

-- ---------- tier history ----------
CREATE TABLE tier_history (
  id               bigserial PRIMARY KEY,
  tenant_id        uuid NOT NULL,
  user_id          uuid NOT NULL,
  from_tier        text,
  to_tier          text NOT NULL,
  qualifying_minor bigint NOT NULL DEFAULT 0,
  reason           text NOT NULL,
  protected        boolean NOT NULL DEFAULT false,
  effective_at     timestamptz NOT NULL DEFAULT now(),
  trace_id         text
);
CREATE INDEX tier_history_user_idx
  ON tier_history (tenant_id, user_id, effective_at DESC);
COMMENT ON TABLE tier_history IS 'Append-only tier audit.';

-- ---------- redemptions and partner offers ----------
CREATE TABLE reward_redemptions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL,
  user_id          uuid NOT NULL,
  reward_code      text NOT NULL REFERENCES rewards(code),
  points_cost      integer NOT NULL,
  cashback_cost_minor bigint NOT NULL DEFAULT 0,
  currency_code    char(3) REFERENCES currencies(code),
  ledger_ref       uuid REFERENCES loyalty_transactions(id),
  fulfilment_ref   text,
  status           text NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'fulfilled', 'cancelled', 'failed')),
  idempotency_key  text NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  fulfilled_at     timestamptz,
  UNIQUE (tenant_id, idempotency_key)
);
CREATE INDEX reward_redemptions_user_idx
  ON reward_redemptions (tenant_id, user_id, status, created_at DESC);

CREATE TABLE partner_offers (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL,
  partner_name     text NOT NULL,
  code             text NOT NULL,
  reward_type      text NOT NULL CHECK (reward_type IN ('points','cashback','experience','discount')),
  headline         text NOT NULL,
  rules_json       jsonb NOT NULL DEFAULT '{}'::jsonb,
  tier_min         text CHECK (tier_min IN ('bronze','silver','gold','platinum')),
  market           text,
  age_gated        boolean NOT NULL DEFAULT true,
  starts_at        timestamptz,
  ends_at          timestamptz,
  status           text NOT NULL DEFAULT 'draft'
                     CHECK (status IN ('draft','active','paused','ended')),
  UNIQUE (tenant_id, code)
);
CREATE INDEX partner_offers_status_idx
  ON partner_offers (tenant_id, status, starts_at, ends_at);

-- ---------- badges ----------
CREATE TABLE reward_badges (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL,
  code             text NOT NULL,
  name             text NOT NULL,
  description      text NOT NULL,
  rarity           text NOT NULL CHECK (rarity IN ('common','rare','epic','legendary')),
  predicate_json   jsonb NOT NULL,
  bonus_points     integer NOT NULL DEFAULT 0,
  requires_age     boolean NOT NULL DEFAULT true,
  display_opt_in   boolean NOT NULL DEFAULT false,
  status           text NOT NULL DEFAULT 'active',
  version          text NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, code, version)
);

CREATE TABLE member_badges (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL,
  user_id          uuid NOT NULL,
  badge_id         uuid NOT NULL REFERENCES reward_badges(id),
  earned_at        timestamptz NOT NULL DEFAULT now(),
  rule_version     text,
  ledger_ref       uuid REFERENCES loyalty_transactions(id),
  UNIQUE (tenant_id, user_id, badge_id)
);
CREATE INDEX member_badges_user_idx ON member_badges (tenant_id, user_id, earned_at DESC);

-- ---------- challenges ----------
CREATE TABLE challenge_definitions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL,
  code             text NOT NULL,
  name             text NOT NULL,
  metric           text NOT NULL CHECK (metric IN
                     ('distinct_regions','tasting_notes','sommelier_sessions',
                      'new_grapes','referrals','club_boxes')),
  target           integer NOT NULL CHECK (target > 0),
  window_days      integer NOT NULL CHECK (window_days > 0),
  reward_points    integer NOT NULL CHECK (reward_points >= 0),
  cooldown_days    integer NOT NULL DEFAULT 90,
  requires_age     boolean NOT NULL DEFAULT true,
  status           text NOT NULL DEFAULT 'active',
  starts_at        timestamptz,
  ends_at          timestamptz,
  version          text NOT NULL,
  UNIQUE (tenant_id, code, version)
);

CREATE TABLE challenge_progress (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL,
  user_id          uuid NOT NULL,
  challenge_id     uuid NOT NULL REFERENCES challenge_definitions(id),
  value            integer NOT NULL DEFAULT 0,
  target           integer NOT NULL,
  status           text NOT NULL DEFAULT 'active'
                     CHECK (status IN ('active','completed','expired','cancelled')),
  started_at       timestamptz NOT NULL DEFAULT now(),
  ends_at          timestamptz NOT NULL,
  completed_at     timestamptz,
  ledger_ref       uuid REFERENCES loyalty_transactions(id),
  UNIQUE (tenant_id, user_id, challenge_id, started_at)
);
CREATE INDEX challenge_progress_active_idx
  ON challenge_progress (tenant_id, user_id, status, ends_at);

-- ---------- expiry batch audit ----------
CREATE TABLE points_expiry_batches (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL,
  user_id          uuid NOT NULL,
  ran_at           timestamptz NOT NULL DEFAULT now(),
  points_expired   integer NOT NULL DEFAULT 0,
  activity_found   boolean NOT NULL DEFAULT false,
  ledger_ref       uuid REFERENCES loyalty_transactions(id),
  window_start     timestamptz,
  window_end       timestamptz
);
CREATE INDEX points_expiry_batches_ran_idx
  ON points_expiry_batches (tenant_id, ran_at DESC);

-- ---------- exactly-once event inbox + read model ----------
CREATE TABLE reward_event_inbox (
  event_id       text NOT NULL,
  tenant_id      uuid NOT NULL,
  consumer       text NOT NULL,
  status         text NOT NULL DEFAULT 'applied',
  ledger_ref     uuid,
  applied_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, consumer)
);
CREATE INDEX reward_event_inbox_tenant_idx
  ON reward_event_inbox (tenant_id, applied_at DESC);

CREATE TABLE reward_member_summary (
  tenant_id            uuid NOT NULL,
  user_id              uuid NOT NULL,
  tier                 text NOT NULL DEFAULT 'bronze',
  points_balance       integer NOT NULL DEFAULT 0,
  lifetime_points      integer NOT NULL DEFAULT 0,
  qualifying_minor     bigint NOT NULL DEFAULT 0,
  next_tier            text,
  points_to_next       integer NOT NULL DEFAULT 0,
  progress_bps         integer NOT NULL DEFAULT 0 CHECK (progress_bps BETWEEN 0 AND 10000),
  cashback_minor       bigint NOT NULL DEFAULT 0,
  currency_code        char(3) NOT NULL REFERENCES currencies(code),
  badges_count         integer NOT NULL DEFAULT 0,
  active_challenges    integer NOT NULL DEFAULT 0,
  computed_at          timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, user_id)
);

-- ---------- row-level security ----------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'loyalty_transactions', 'cashback_ledger', 'tier_history',
    'reward_redemptions', 'member_badges', 'challenge_progress',
    'points_expiry_batches', 'reward_member_summary'
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

  -- loyalty_accounts is keyed by user_id only; scope by user + tenant.
  EXECUTE 'ALTER TABLE loyalty_accounts ENABLE ROW LEVEL SECURITY';
  EXECUTE 'CREATE POLICY tenant_user_isolation ON loyalty_accounts '
       || 'USING (user_id = current_setting(''app.user_id'', true)::uuid '
       || 'AND tenant_id = current_setting(''app.tenant_id'', true)::uuid) '
       || 'WITH CHECK (user_id = current_setting(''app.user_id'', true)::uuid '
       || 'AND tenant_id = current_setting(''app.tenant_id'', true)::uuid)';

  -- Versioned rule/catalogue tables are reference data: tenant-only RLS.
  FOREACH t IN ARRAY ARRAY[
    'earn_rules', 'cashback_rules', 'tier_rules', 'partner_offers',
    'reward_badges', 'challenge_definitions', 'reward_event_inbox'
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
-- Reference tables (replicate to every worker): rewards, earn_rules,
--   cashback_rules, tier_rules, reward_badges, challenge_definitions,
--   partner_offers.
-- Distribute the rest on user_id and colocate with loyalty_accounts:
--   loyalty_transactions, cashback_ledger, tier_history, reward_redemptions,
--   member_badges, challenge_progress, points_expiry_batches,
--   reward_member_summary, reward_event_inbox (colocate on tenant_id where
--   the consumer key is event_id).

COMMIT;
