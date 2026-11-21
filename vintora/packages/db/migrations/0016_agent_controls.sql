-- =============================================================
-- VINTORA — internal agent controls (ADM-19 only)
-- Source of truth: config/agent-autonomy-policy.json and
-- ADR-0005-agent-boundaries.md.
--
-- Agent execution is disabled. This migration provides the enforceable
-- safe-stop surface and append-only decision/tool-call evidence for the
-- advisory policy evaluator. The agent kill switch is independent of the
-- per-model AI kill switch and can never be reset in the prototype.
-- =============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS agent_kill_switch (
  tenant_id        uuid PRIMARY KEY,
  engaged          boolean NOT NULL DEFAULT true,
  reason           text NOT NULL DEFAULT 'Prototype default: agent execution disabled',
  actor_user_id    uuid REFERENCES users(id),
  approver_user_id uuid REFERENCES users(id),
  slo_seconds      integer NOT NULL DEFAULT 60 CHECK (slo_seconds = 60),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CHECK (approver_user_id IS NULL OR approver_user_id <> actor_user_id),
  CHECK (engaged = true)
);

CREATE TABLE IF NOT EXISTS agent_decision_audit (
  id              bigserial PRIMARY KEY,
  tenant_id       uuid NOT NULL,
  correlation_id  text NOT NULL,
  request_id      text,
  actor_user_id   uuid REFERENCES users(id),
  agent_id        text NOT NULL,
  tool_id         text NOT NULL,
  intent          text NOT NULL CHECK (intent IN ('advise','execute')),
  mode            text NOT NULL CHECK (mode IN ('advisory','assist','guarded_auto')),
  tier            text CHECK (tier IN ('T1','T2','T3','T4')),
  decision        text NOT NULL CHECK (decision IN ('allowed','denied')),
  reason_code     text NOT NULL,
  reason          text NOT NULL,
  decision_json   jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS agent_decision_audit_tenant_idx
  ON agent_decision_audit (tenant_id, occurred_at DESC, decision);
CREATE INDEX IF NOT EXISTS agent_decision_audit_correlation_idx
  ON agent_decision_audit (tenant_id, correlation_id, occurred_at DESC);

-- Append-only: no UPDATE or DELETE is permitted, including by the DB owner via
-- the application. This is an audit trail, not mutable workflow state.
CREATE OR REPLACE FUNCTION reject_agent_decision_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'agent_decision_audit is append-only';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS agent_decision_audit_append_only ON agent_decision_audit;
CREATE TRIGGER agent_decision_audit_append_only
  BEFORE UPDATE OR DELETE ON agent_decision_audit
  FOR EACH ROW EXECUTE FUNCTION reject_agent_decision_mutation();

-- The kill switch may only be engaged; disengaging/resetting requires a future
-- ADR and human governance approval, so it is rejected at the storage layer.
CREATE OR REPLACE FUNCTION block_agent_kill_switch_reset()
RETURNS trigger AS $$
BEGIN
  IF NEW.engaged IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'agent kill switch cannot be reset in the prototype';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS agent_kill_switch_no_reset ON agent_kill_switch;
CREATE TRIGGER agent_kill_switch_no_reset
  BEFORE UPDATE ON agent_kill_switch
  FOR EACH ROW EXECUTE FUNCTION block_agent_kill_switch_reset();

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['agent_kill_switch','agent_decision_audit'] LOOP
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
END $$;

SELECT set_config('app.tenant_id', '00000000-0000-0000-0000-000000000001', true);
INSERT INTO agent_kill_switch (tenant_id, engaged, reason, slo_seconds)
VALUES ('00000000-0000-0000-0000-000000000001', true,
        'Prototype default: agent execution disabled', 60)
ON CONFLICT (tenant_id) DO NOTHING;

COMMENT ON TABLE agent_kill_switch IS
  'Independent safe-stop control for ADM-19 agents; always engaged in the prototype.';
COMMENT ON TABLE agent_decision_audit IS
  'Append-only advisor decisions and tool calls with correlation, tier, reason and denial evidence.';

COMMIT;
