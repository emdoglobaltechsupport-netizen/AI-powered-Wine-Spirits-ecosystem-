-- EMDO Assist (M9): AI interaction telemetry and human escalation records.
-- No prompts, prompt bodies, clinical content or PHI are stored here.

CREATE TABLE ai_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  country_code text NOT NULL REFERENCES country_profiles(code),
  actor_id uuid NOT NULL REFERENCES users(id),
  actor_role text NOT NULL,
  agent_id text NOT NULL,
  capability text NOT NULL,
  prompt_version text NOT NULL,
  model text NOT NULL,
  model_version text NOT NULL,
  data_domain text NOT NULL CHECK (
    data_domain IN ('none','non_phi','phi','commercial','regulated')
  ),
  outcome text NOT NULL CHECK (
    outcome IN ('answered','blocked','error','approval_requested','escalated')
  ),
  decision text NOT NULL CHECK (
    decision IN ('allowed','denied','applied','rejected','revoked','approved')
  ),
  label text NOT NULL,
  source_count integer NOT NULL DEFAULT 0 CHECK (source_count >= 0),
  approval_id uuid,
  escalation_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ai_interactions_scope_idx
  ON ai_interactions (tenant_id, country_code, created_at DESC);
CREATE INDEX ai_interactions_agent_idx
  ON ai_interactions (agent_id, outcome, created_at DESC);

CREATE OR REPLACE FUNCTION reject_ai_interaction_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'ai_interactions is append-only';
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER ai_interactions_no_update BEFORE UPDATE ON ai_interactions
  FOR EACH ROW EXECUTE FUNCTION reject_ai_interaction_mutation();
CREATE TRIGGER ai_interactions_no_delete BEFORE DELETE ON ai_interactions
  FOR EACH ROW EXECUTE FUNCTION reject_ai_interaction_mutation();

CREATE TABLE ai_escalations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  country_code text NOT NULL REFERENCES country_profiles(code),
  created_by uuid NOT NULL REFERENCES users(id),
  agent_id text NOT NULL,
  reason_code text NOT NULL,
  assigned_role text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved')),
  outcome_code text,
  resolved_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
CREATE INDEX ai_escalations_scope_idx ON ai_escalations (tenant_id, country_code, status);
CREATE INDEX ai_escalations_assigned_idx ON ai_escalations (assigned_role, status);

ALTER TABLE ai_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_interactions FORCE ROW LEVEL SECURITY;
CREATE POLICY ai_interactions_rls ON ai_interactions FOR ALL USING (
  current_setting('app.is_system', true) = 'on'
  OR current_setting('app.is_platform', true) = 'on'
  OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
  OR actor_id = NULLIF(current_setting('app.user_id', true), '')::uuid
);

ALTER TABLE ai_escalations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_escalations FORCE ROW LEVEL SECURITY;
CREATE POLICY ai_escalations_rls ON ai_escalations FOR ALL USING (
  current_setting('app.is_system', true) = 'on'
  OR current_setting('app.is_platform', true) = 'on'
  OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
  OR created_by = NULLIF(current_setting('app.user_id', true), '')::uuid
);
