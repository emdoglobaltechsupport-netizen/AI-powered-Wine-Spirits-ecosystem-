-- =============================================================
-- VINTORA — AI personalization consent and marketing release controls
-- Source of truth: config/privacy-consent-policy.json (privacy),
-- config/marketing-release-policy.json (marketing) and the two high-risk
-- feature records in config/high-risk-features.json.
--
-- The prototype performs no live profiling, campaign release, ad spend or
-- email send. These tables provide tenant-isolated consent state, simulated
-- DSAR requests, immutable decision evidence and a draft-only campaign state
-- surface for the deny-by-default evaluators in @vintora/shared.
-- =============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS privacy_consents (
  tenant_id      uuid NOT NULL,
  user_id        uuid NOT NULL REFERENCES users(id),
  purpose        text NOT NULL CHECK (purpose IN
    ('recommendations','closed_loop_personalization','marketing','experimentation')),
  state          text NOT NULL CHECK (state IN ('opt_in','withdraw')),
  policy_version text NOT NULL CHECK (policy_version = 'v1'),
  locale         text,
  source         text NOT NULL DEFAULT 'prototype-privacy-controls',
  recorded_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, user_id, purpose)
);

CREATE TABLE IF NOT EXISTS privacy_decision_audit (
  id             bigserial PRIMARY KEY,
  tenant_id      uuid NOT NULL,
  user_id        uuid NOT NULL REFERENCES users(id),
  correlation_id text NOT NULL,
  request_id     text,
  purpose        text NOT NULL,
  data_category  text NOT NULL,
  action         text NOT NULL CHECK (action IN ('personal_data_use','consent_change','export','deletion_request')),
  decision       text NOT NULL CHECK (decision IN ('allowed','denied')),
  reason_code    text NOT NULL,
  reason         text NOT NULL,
  decision_json  jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS privacy_decision_audit_subject_idx
  ON privacy_decision_audit (tenant_id, user_id, occurred_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS privacy_decision_audit_correlation_idx
  ON privacy_decision_audit (tenant_id, user_id, correlation_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS privacy_requests (
  id                bigserial PRIMARY KEY,
  tenant_id         uuid NOT NULL,
  user_id           uuid NOT NULL REFERENCES users(id),
  request_type      text NOT NULL CHECK (request_type IN ('export','deletion')),
  confirmation_text text NOT NULL,
  status            text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','reviewed')),
  reason            text NOT NULL,
  manifest          text,
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS privacy_requests_subject_idx
  ON privacy_requests (tenant_id, user_id, created_at DESC, id DESC);

CREATE TABLE IF NOT EXISTS marketing_release_audit (
  id             bigserial PRIMARY KEY,
  tenant_id      uuid NOT NULL,
  correlation_id text NOT NULL,
  request_id     text,
  actor_user_id  uuid REFERENCES users(id),
  campaign_id    text NOT NULL,
  action         text NOT NULL CHECK (action IN
    ('draft','release','pause','rollback','budget_increase')),
  decision       text NOT NULL CHECK (decision IN ('allowed','denied')),
  reason_code    text NOT NULL,
  reason         text NOT NULL,
  requires_alert boolean NOT NULL DEFAULT false,
  decision_json  jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS marketing_release_audit_campaign_idx
  ON marketing_release_audit (tenant_id, campaign_id, occurred_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS marketing_release_audit_correlation_idx
  ON marketing_release_audit (tenant_id, correlation_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS marketing_campaign_controls (
  tenant_id               uuid NOT NULL,
  campaign_id             text NOT NULL,
  status                  text NOT NULL CHECK (status IN ('draft','paused','rolled_back')),
  requested_increase_pct  numeric(6,3) NOT NULL DEFAULT 0 CHECK (requested_increase_pct = 0),
  provenance_hash         text NOT NULL,
  actor_user_id           uuid REFERENCES users(id),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, campaign_id)
);

-- Appendix-only decision evidence: update and delete are rejected even when
-- the caller is the database owner, and RLS closes the owner bypass.
CREATE OR REPLACE FUNCTION reject_privacy_decision_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'privacy_decision_audit is append-only';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS privacy_decision_audit_append_only ON privacy_decision_audit;
CREATE TRIGGER privacy_decision_audit_append_only
  BEFORE UPDATE OR DELETE ON privacy_decision_audit
  FOR EACH ROW EXECUTE FUNCTION reject_privacy_decision_mutation();

CREATE OR REPLACE FUNCTION reject_marketing_release_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'marketing_release_audit is append-only';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS marketing_release_audit_append_only ON marketing_release_audit;
CREATE TRIGGER marketing_release_audit_append_only
  BEFORE UPDATE OR DELETE ON marketing_release_audit
  FOR EACH ROW EXECUTE FUNCTION reject_marketing_release_mutation();

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'privacy_consents', 'privacy_decision_audit', 'privacy_requests',
    'marketing_release_audit', 'marketing_campaign_controls'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
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

  -- The subject rule is RESTRICTIVE so it is ANDed with tenant_isolation;
  -- two permissive policies would be ORed and allow cross-subject reads.
  FOREACH t IN ARRAY ARRAY['privacy_consents', 'privacy_decision_audit', 'privacy_requests'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS subject_isolation ON %I', t);
    EXECUTE format(
      'CREATE POLICY subject_isolation ON %I AS RESTRICTIVE '
      || 'USING (user_id = current_setting(''app.user_id'', true)::uuid) '
      || 'WITH CHECK (user_id = current_setting(''app.user_id'', true)::uuid)',
      t);
  END LOOP;
END $$;

COMMENT ON TABLE privacy_consents IS
  'Current versioned, purpose-limited opt-in state; all purposes default off.';
COMMENT ON TABLE privacy_decision_audit IS
  'Append-only personal-data use, consent, export and deletion decision evidence.';
COMMENT ON TABLE privacy_requests IS
  'Simulated DSAR intake; deletion remains a human-reviewed request in the prototype.';
COMMENT ON TABLE marketing_release_audit IS
  'Append-only campaign evaluation and human-release decision evidence; no live effect.';
COMMENT ON TABLE marketing_campaign_controls IS
  'Draft/pause/rollback simulation state; release and positive budget changes are blocked.';

COMMIT;
