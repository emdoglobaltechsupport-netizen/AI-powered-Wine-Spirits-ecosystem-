-- =============================================================
-- VINTORA — Membership & Subscription domain (Vintora Club)
-- Source of truth: vintora/17-membership-subscription-module.md §§2–8
-- Extends 0001_initial.sql (club_plans, subscriptions, club_boxes,
-- loyalty_accounts, loyalty_transactions, rewards).
-- Plain PostgreSQL 16; Citus calls commented for sharded deployment.
-- All business tables are tenant + user partitioned. Invoices, events,
-- curation runs, tier and reward rows are append-only.
-- =============================================================

BEGIN;

-- ---------- baseline tables referenced by the domain extensions ----------
-- These were described in the design but omitted from 0001; create them here
-- so a stock PostgreSQL install can apply the full migration chain.
CREATE TABLE IF NOT EXISTS club_boxes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES subscriptions(id),
  box_month       date NOT NULL,
  status          text NOT NULL DEFAULT 'PLANNED',
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS club_boxes_user_month_idx
  ON club_boxes (tenant_id, user_id, box_month DESC);

CREATE TABLE IF NOT EXISTS rewards (
  code        text PRIMARY KEY,
  name        text NOT NULL,
  description text,
  partner     text,
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Canonical commercial product identity used by membership and allocation
-- tables. The storefront still reads skus + product_content for pricing and
-- editorial copy; this table only supplies stable product foreign keys.
CREATE TABLE IF NOT EXISTS products (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku         text NOT NULL UNIQUE,
  name        text NOT NULL,
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ---------- extend baseline plans ----------
ALTER TABLE club_plans
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS tier text,
  ADD COLUMN IF NOT EXISTS bottle_count smallint,
  ADD COLUMN IF NOT EXISTS inclusions jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS annual_price_usd numeric(10,2),
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

-- Backfill the tier field from the canonical plan code where available.
UPDATE club_plans SET tier = lower(code) WHERE tier IS NULL;

-- ---------- extend baseline subscriptions ----------
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS billing_cycle text NOT NULL DEFAULT 'monthly'
    CHECK (billing_cycle IN ('monthly', 'quarterly', 'annual')),
  ADD COLUMN IF NOT EXISTS payer_ref text,
  ADD COLUMN IF NOT EXISTS next_bill_at timestamptz,
  ADD COLUMN IF NOT EXISTS next_box_month date,
  ADD COLUMN IF NOT EXISTS age_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS preference_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS cadence_anchor_day smallint,
  ADD COLUMN IF NOT EXISTS paused_cycles smallint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS skips_used smallint NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS subscriptions_renewal_idx
  ON subscriptions (status, next_bill_at)
  WHERE status IN ('ACTIVE', 'TRIAL', 'PAST_DUE');

-- Extend baseline boxes with curation/fulfilment state.
ALTER TABLE club_boxes
  ADD COLUMN IF NOT EXISTS curation_run_id uuid,
  ADD COLUMN IF NOT EXISTS rationale_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS cut_off_at timestamptz,
  ADD COLUMN IF NOT EXISTS status text;
UPDATE club_boxes SET status = 'PLANNED' WHERE status IS NULL;

-- ---------- billing and dunning ----------
CREATE TABLE subscription_invoices (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL,
  user_id          uuid NOT NULL,
  subscription_id  uuid NOT NULL REFERENCES subscriptions(id),
  period_start     date NOT NULL,
  period_end       date NOT NULL,
  amount_minor     bigint NOT NULL CHECK (amount_minor >= 0),
  currency_code    char(3) NOT NULL REFERENCES currencies(code),
  fx_rate          numeric(18,8),
  fx_locked_at     timestamptz,
  status           text NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'paid', 'failed', 'refunded', 'void')),
  attempt          integer NOT NULL DEFAULT 1,
  psp_ref          text,
  idempotency_key  text NOT NULL,
  paid_at          timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, idempotency_key),
  CHECK (period_end >= period_start)
);
CREATE INDEX subscription_invoices_sub_idx
  ON subscription_invoices (tenant_id, subscription_id, created_at DESC);
COMMENT ON TABLE subscription_invoices IS
  'Append-only. Retries/refunds create new rows, never UPDATE.';

CREATE TABLE subscription_events (
  id               bigserial PRIMARY KEY,
  tenant_id        uuid NOT NULL,
  user_id          uuid NOT NULL,
  subscription_id  uuid NOT NULL REFERENCES subscriptions(id),
  from_status      text,
  to_status        text NOT NULL,
  reason           text,
  actor            text,
  trace_id         text,
  occurred_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX subscription_events_sub_idx
  ON subscription_events (tenant_id, subscription_id, occurred_at DESC);
COMMENT ON TABLE subscription_events IS 'Append-only audit of every state transition.';

CREATE TABLE box_skips (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL,
  user_id          uuid NOT NULL,
  subscription_id  uuid NOT NULL REFERENCES subscriptions(id),
  month            date NOT NULL,
  reason           text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (subscription_id, month)
);
CREATE INDEX box_skips_user_idx ON box_skips (tenant_id, user_id, month DESC);

-- ---------- curation ----------
CREATE TABLE curation_runs (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL,
  user_id          uuid NOT NULL,
  subscription_id  uuid NOT NULL REFERENCES subscriptions(id),
  box_id           uuid REFERENCES club_boxes(id),
  model_version    text,
  prompt_version   text,
  score            numeric(8,4),
  rationale_json   jsonb NOT NULL DEFAULT '{}'::jsonb,
  accepted         boolean NOT NULL DEFAULT false,
  accepted_by      uuid REFERENCES users(id),
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX curation_runs_box_idx ON curation_runs (tenant_id, box_id);
COMMENT ON TABLE curation_runs IS 'Append-only. Immutable evidence behind "Why these?".';

CREATE TABLE box_items (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL,
  user_id             uuid NOT NULL,
  box_id              uuid NOT NULL REFERENCES club_boxes(id) ON DELETE CASCADE,
  curation_run_id     uuid REFERENCES curation_runs(id),
  product_id          uuid NOT NULL REFERENCES products(id),
  lot_id              uuid REFERENCES lots(id),
  position            integer NOT NULL CHECK (position > 0),
  reason              text,
  substitution_of     uuid REFERENCES box_items(id),
  UNIQUE (box_id, position)
);
CREATE INDEX box_items_box_idx ON box_items (tenant_id, box_id, position);

-- ---------- VIP membership ----------
CREATE TABLE memberships (
  tenant_id              uuid NOT NULL,
  user_id                uuid NOT NULL,
  tier                   text NOT NULL
                           CHECK (tier IN ('good', 'better', 'best', 'icon')),
  points_to_next         integer NOT NULL DEFAULT 0,
  lifetime_boxes         integer NOT NULL DEFAULT 0,
  lifetime_minor         bigint NOT NULL DEFAULT 0,
  status_protected_until timestamptz,
  computed_at            timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, user_id)
);

CREATE TABLE tier_events (
  id            bigserial PRIMARY KEY,
  tenant_id     uuid NOT NULL,
  user_id       uuid NOT NULL,
  from_tier     text,
  to_tier       text NOT NULL,
  reason        text NOT NULL,
  effective_at  timestamptz NOT NULL DEFAULT now(),
  actor         text
);
CREATE INDEX tier_events_user_idx ON tier_events (tenant_id, user_id, effective_at DESC);
COMMENT ON TABLE tier_events IS 'Append-only tier history; no retroactive edits.';

-- ---------- exclusive products and early access ----------
CREATE TABLE exclusive_allocations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL,
  product_id    uuid NOT NULL REFERENCES products(id),
  lot_id        uuid REFERENCES lots(id),
  tier_min      text NOT NULL CHECK (tier_min IN ('good', 'better', 'best', 'icon')),
  quantity      integer NOT NULL CHECK (quantity >= 0),
  allocated     integer NOT NULL DEFAULT 0 CHECK (allocated >= 0),
  released_at   timestamptz,
  expires_at    timestamptz,
  CHECK (allocated <= quantity)
);
CREATE INDEX exclusive_allocations_product_idx
  ON exclusive_allocations (tenant_id, product_id, tier_min);

CREATE TABLE product_releases (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL,
  name          text NOT NULL,
  product_ids   uuid[] NOT NULL DEFAULT '{}',
  total_units   integer NOT NULL CHECK (total_units >= 0),
  status        text NOT NULL DEFAULT 'scheduled'
                  CHECK (status IN ('scheduled', 'open', 'closed', 'cancelled')),
  public_at     timestamptz NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX product_releases_status_idx
  ON product_releases (tenant_id, status, public_at);

CREATE TABLE release_windows (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL,
  release_id    uuid NOT NULL REFERENCES product_releases(id) ON DELETE CASCADE,
  tier          text NOT NULL CHECK (tier IN ('good', 'better', 'best', 'icon')),
  opens_at      timestamptz NOT NULL,
  closes_at     timestamptz NOT NULL,
  UNIQUE (release_id, tier),
  CHECK (closes_at > opens_at)
);
CREATE INDEX release_windows_open_idx
  ON release_windows (tenant_id, tier, opens_at, closes_at);

CREATE TABLE early_access_claims (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL,
  user_id       uuid NOT NULL,
  release_id    uuid NOT NULL REFERENCES product_releases(id),
  allocation_id uuid REFERENCES exclusive_allocations(id),
  units         integer NOT NULL CHECK (units > 0),
  status        text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'confirmed', 'waitlisted', 'cancelled', 'expired')),
  idempotency_key text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, release_id, user_id),
  UNIQUE (tenant_id, idempotency_key)
);
CREATE INDEX early_access_claims_queue_idx
  ON early_access_claims (tenant_id, release_id, status, created_at);

-- ---------- referrals ----------
CREATE TABLE referral_codes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL,
  user_id       uuid NOT NULL,
  code          text NOT NULL,
  status        text NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'paused', 'revoked')),
  uses          integer NOT NULL DEFAULT 0 CHECK (uses >= 0),
  max_uses      integer CHECK (max_uses IS NULL OR max_uses >= 0),
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, code)
);
CREATE INDEX referral_codes_user_idx ON referral_codes (tenant_id, user_id);

CREATE TABLE referrals (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL,
  code_id       uuid NOT NULL REFERENCES referral_codes(id),
  referrer_id   uuid NOT NULL,
  referee_id    uuid NOT NULL,
  status        text NOT NULL DEFAULT 'attributed'
                  CHECK (status IN ('attributed', 'qualified', 'rewarded',
                                    'rejected', 'clawed_back')),
  qualified_at  timestamptz,
  fraud_flags   jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, referee_id),
  CHECK (referrer_id <> referee_id)
);
CREATE INDEX referrals_referrer_idx ON referrals (tenant_id, referrer_id, created_at DESC);

CREATE TABLE referral_rewards (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL,
  referral_id   uuid NOT NULL REFERENCES referrals(id),
  party         text NOT NULL CHECK (party IN ('referrer', 'referee')),
  points        integer NOT NULL CHECK (points > 0),
  status        text NOT NULL DEFAULT 'held'
                  CHECK (status IN ('held', 'settled', 'clawed_back')),
  hold_until    timestamptz NOT NULL,
  ledger_ref    text,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX referral_rewards_hold_idx
  ON referral_rewards (tenant_id, status, hold_until)
  WHERE status = 'held';
COMMENT ON TABLE referral_rewards IS
  'Append-only. Settles points into Vintora Rewards; clawbacks are new rows.';

-- ---------- row-level security ----------
-- User-owned tables: scope by tenant + user.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'subscription_invoices', 'subscription_events', 'box_skips',
    'curation_runs', 'box_items', 'memberships', 'tier_events',
    'early_access_claims', 'referral_codes'
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
END $$;

-- Tenant-owned tables without a user_id column (exclusive supply,
-- release catalogues, referral graph): scope by tenant only. Access to a
-- member's own referral rows is enforced at the BFF/service layer.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'exclusive_allocations', 'product_releases', 'release_windows',
    'referrals', 'referral_rewards'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I '
      || 'USING (tenant_id = current_setting(''app.tenant_id'', true)::uuid) '
      || 'WITH CHECK (tenant_id = current_setting(''app.tenant_id'', true)::uuid)',
      t);
  END LOOP;
END $$;

-- Reference-table note: club_plans is already a Citus reference table in 0001.
-- Citus distribution notes (apply on the sharded deployment only):
-- SELECT create_distributed_table('subscription_invoices', 'user_id');
-- SELECT create_distributed_table('subscription_events', 'user_id');
-- SELECT create_distributed_table('curation_runs', 'user_id');
-- SELECT create_distributed_table('box_items', 'user_id');
-- SELECT create_distributed_table('memberships', 'user_id');
-- SELECT create_distributed_table('early_access_claims', 'user_id');
-- SELECT create_distributed_table('referral_codes', 'user_id');
-- SELECT create_distributed_table('referrals', 'user_id');
-- Colocate child tables (box_skips, tier_events, referral_rewards,
-- exclusive_allocations, product_releases, release_windows) with their parent
-- on user_id/tenant_id where applicable.

COMMIT;
