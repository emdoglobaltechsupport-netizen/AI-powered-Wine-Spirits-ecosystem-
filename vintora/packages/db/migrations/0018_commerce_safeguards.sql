-- =============================================================
-- VINTORA — enforced commerce safeguard decisions
-- Source of truth: config/commerce-safeguards.json.
--
-- Every checkout evaluation records the simulated age, KYC, AML, sanctions
-- and payment decisions plus the aggregate allow/deny result. The table is
-- tenant-isolated and append-only. No real screening or payment adapter is
-- represented by these rows.
-- =============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS commerce_safeguard_decisions (
  id             bigserial PRIMARY KEY,
  tenant_id      uuid NOT NULL,
  user_id        uuid NOT NULL REFERENCES users(id),
  correlation_id text NOT NULL,
  control_id     text NOT NULL CHECK (control_id IN ('age','kyc','aml','sanctions','payment')),
  result         text NOT NULL,
  evidence_ref   text NOT NULL,
  decision       text NOT NULL CHECK (decision IN ('allowed','denied')),
  reason_code    text NOT NULL,
  reason         text NOT NULL,
  decision_json  jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS commerce_safeguard_decisions_subject_idx
  ON commerce_safeguard_decisions (tenant_id, user_id, occurred_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS commerce_safeguard_decisions_correlation_idx
  ON commerce_safeguard_decisions (tenant_id, correlation_id, occurred_at DESC);

CREATE OR REPLACE FUNCTION reject_commerce_safeguard_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'commerce_safeguard_decisions is append-only';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS commerce_safeguard_decisions_append_only ON commerce_safeguard_decisions;
CREATE TRIGGER commerce_safeguard_decisions_append_only
  BEFORE UPDATE OR DELETE ON commerce_safeguard_decisions
  FOR EACH ROW EXECUTE FUNCTION reject_commerce_safeguard_mutation();

ALTER TABLE commerce_safeguard_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE commerce_safeguard_decisions FORCE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = current_schema()
      AND tablename = 'commerce_safeguard_decisions'
      AND policyname = 'tenant_isolation'
  ) THEN
    CREATE POLICY tenant_isolation ON commerce_safeguard_decisions
      USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
  END IF;
END $$;

DROP POLICY IF EXISTS subject_isolation ON commerce_safeguard_decisions;
CREATE POLICY subject_isolation ON commerce_safeguard_decisions AS RESTRICTIVE
  USING (user_id = current_setting('app.user_id', true)::uuid)
  WITH CHECK (user_id = current_setting('app.user_id', true)::uuid);

COMMENT ON TABLE commerce_safeguard_decisions IS
  'Append-only simulated checkout safeguard decisions; no real screening or payment evidence.';
COMMENT ON COLUMN commerce_safeguard_decisions.evidence_ref IS
  'Opaque simulated:<control>:<hash> reference; never a real provider response.';

COMMIT;
