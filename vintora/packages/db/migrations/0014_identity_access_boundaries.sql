-- =============================================================
-- VINTORA — explicit B2C / B2B / Seller / Vault access boundaries
-- Source of truth: IDENTITY_ACCESS_BOUNDARIES.md and
-- config/identity-access-policy.json.
--
-- One primary commerce role per tenant. Admin is an internal staff
-- role and never a commerce role. Business trading requires separate
-- verification, licence evidence, an active contract and a named
-- authorised buyer. Credit is stored server-side. All authorization
-- decisions are append-only. No BYPASSRLS grants are made.
-- =============================================================

BEGIN;

-- ---------- principal boundaries ----------
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS tenant_id uuid NOT NULL
    DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  ADD COLUMN IF NOT EXISTS primary_commerce_role text NOT NULL DEFAULT 'customer'
    CHECK (primary_commerce_role IN ('customer','merchant','distributor','admin')),
  ADD COLUMN IF NOT EXISTS access_jurisdictions text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS business_account_id uuid,
  ADD COLUMN IF NOT EXISTS investor_status text NOT NULL DEFAULT 'unverified'
    CHECK (investor_status IN ('unverified','pending','verified','rejected','expired'));

ALTER TABLE b2b_accounts
  ADD COLUMN IF NOT EXISTS tenant_id uuid NOT NULL
    DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  ADD COLUMN IF NOT EXISTS owner_user_id uuid REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS authorised_buyer_user_id uuid REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS permitted_jurisdictions text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS licence_jurisdictions text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS verification_evidence_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS reserved_credit numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS contract_status text NOT NULL DEFAULT 'inactive'
    CHECK (contract_status IN ('inactive','pending','active','suspended','expired'));

-- Sessions and login attempts carry the tenant selected at authentication time.
ALTER TABLE app_sessions
  ADD COLUMN IF NOT EXISTS tenant_id uuid NOT NULL
    DEFAULT '00000000-0000-0000-0000-000000000001'::uuid;
ALTER TABLE login_attempts
  ADD COLUMN IF NOT EXISTS tenant_id uuid NOT NULL
    DEFAULT '00000000-0000-0000-0000-000000000001'::uuid;
CREATE INDEX IF NOT EXISTS app_sessions_tenant_user_idx
  ON app_sessions (tenant_id, user_id, expires_at DESC);
CREATE INDEX IF NOT EXISTS login_attempts_tenant_idx
  ON login_attempts (tenant_id, occurred_at DESC);

-- All B2B child records are tenant-owned even where the original schema
-- predates multi-tenancy.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'b2b_licences','b2b_trading_profiles','b2b_verification_cases',
    'b2b_wholesale_offers','b2b_rfq_invitations','b2b_quotes','b2b_quote_lines',
    'b2b_counter_offers','b2b_credit_facilities','b2b_credit_authorisations',
    'b2b_inventory_lots','b2b_inventory_reservations','b2b_purchase_orders',
    'b2b_po_lines','b2b_distributor_agreements','b2b_sub_distributors',
    'b2b_invoices','b2b_disputes','b2b_audit_events'
  ] LOOP
    EXECUTE format(
      'ALTER TABLE %I ADD COLUMN IF NOT EXISTS tenant_id uuid NOT NULL '
      || 'DEFAULT ''00000000-0000-0000-0000-000000000001''::uuid', t);
  END LOOP;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_business_account_fk'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_business_account_fk
      FOREIGN KEY (business_account_id) REFERENCES b2b_accounts(id);
  END IF;
END $$;

-- ---------- business account membership and contracts ----------
CREATE TABLE IF NOT EXISTS business_account_members (
  tenant_id          uuid NOT NULL,
  business_account_id uuid NOT NULL REFERENCES b2b_accounts(id) ON DELETE CASCADE,
  user_id            uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  member_role        text NOT NULL CHECK (member_role IN ('owner','buyer','viewer')),
  active             boolean NOT NULL DEFAULT true,
  granted_at         timestamptz NOT NULL DEFAULT now(),
  granted_by         uuid REFERENCES users(id),
  PRIMARY KEY (tenant_id, business_account_id, user_id, member_role),
  CHECK (granted_by IS NULL OR granted_by <> user_id)
);

-- A human may belong to one active business account per tenant.
CREATE UNIQUE INDEX IF NOT EXISTS business_account_members_one_active_user
  ON business_account_members (tenant_id, user_id)
  WHERE active = true;
CREATE INDEX IF NOT EXISTS business_account_members_account_idx
  ON business_account_members (tenant_id, business_account_id, active);

CREATE TABLE IF NOT EXISTS trade_contracts (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          uuid NOT NULL,
  business_account_id uuid NOT NULL REFERENCES b2b_accounts(id) ON DELETE CASCADE,
  contract_code      text NOT NULL,
  version            integer NOT NULL CHECK (version > 0),
  status             text NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending','active','suspended','expired','cancelled')),
  permitted_jurisdictions text[] NOT NULL DEFAULT '{}'::text[],
  currency_code      char(3) NOT NULL REFERENCES currencies(code),
  credit_limit       numeric(14,2) NOT NULL CHECK (credit_limit >= 0),
  terms_json         jsonb NOT NULL DEFAULT '{}'::jsonb,
  approved_by        uuid REFERENCES users(id),
  approved_at        timestamptz,
  effective_from     timestamptz NOT NULL DEFAULT now(),
  effective_to       timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, business_account_id, contract_code, version),
  CHECK (approved_by IS NULL OR approved_at IS NOT NULL),
  CHECK (effective_to IS NULL OR effective_to > effective_from)
);
CREATE INDEX IF NOT EXISTS trade_contracts_active_idx
  ON trade_contracts (tenant_id, business_account_id, status, effective_to);

-- ---------- append-only authorization decisions ----------
CREATE TABLE IF NOT EXISTS authorization_decisions (
  id            bigserial PRIMARY KEY,
  tenant_id     uuid NOT NULL,
  request_id    text,
  actor_user_id uuid REFERENCES users(id),
  domain        text NOT NULL,
  permission    text NOT NULL,
  resource_type text,
  resource_id   text,
  result        text NOT NULL CHECK (result IN ('allowed','denied')),
  reason_code   text NOT NULL,
  reason        text NOT NULL,
  occurred_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS authorization_decisions_tenant_idx
  ON authorization_decisions (tenant_id, occurred_at DESC, result);
CREATE INDEX IF NOT EXISTS authorization_decisions_actor_idx
  ON authorization_decisions (actor_user_id, occurred_at DESC);

CREATE OR REPLACE FUNCTION reject_authorization_decision_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'authorization_decisions is append-only';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS authorization_decisions_append_only ON authorization_decisions;
CREATE TRIGGER authorization_decisions_append_only
  BEFORE UPDATE OR DELETE ON authorization_decisions
  FOR EACH ROW EXECUTE FUNCTION reject_authorization_decision_mutation();

-- ---------- tenant isolation (fail-closed) ----------
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'users','b2b_accounts','app_sessions','login_attempts',
    'business_account_members','trade_contracts','authorization_decisions',
    'b2b_licences','b2b_trading_profiles','b2b_verification_cases',
    'b2b_wholesale_offers','b2b_rfq_invitations','b2b_quotes','b2b_quote_lines',
    'b2b_counter_offers','b2b_credit_facilities','b2b_credit_authorisations',
    'b2b_inventory_lots','b2b_inventory_reservations','b2b_purchase_orders',
    'b2b_po_lines','b2b_distributor_agreements','b2b_sub_distributors',
    'b2b_invoices','b2b_disputes','b2b_audit_events'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    -- The prototype DB owner must obey RLS too; otherwise owner queries bypass it.
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = current_schema() AND tablename = t AND policyname = 'tenant_isolation'
    ) THEN
      EXECUTE format(
        'CREATE POLICY tenant_isolation ON %I '
        || 'USING (tenant_id = current_setting(''app.tenant_id'', true)::uuid) '
        || 'WITH CHECK (tenant_id = current_setting(''app.tenant_id'', true)::uuid)',
        t);
    END IF;
  END LOOP;
END $$;

COMMENT ON TABLE business_account_members IS
  'One active business account per user per tenant; role membership never overrides users.primary_commerce_role.';
COMMENT ON TABLE trade_contracts IS
  'Wholesale contract version with server-owned credit limit and permitted jurisdictions.';
COMMENT ON TABLE authorization_decisions IS
  'Append-only deny-by-default authorization evidence. No updates or deletes.';

COMMIT;
