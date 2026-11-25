-- EMDO Medical foundation schema. Prototype state. No clinical data is seeded.
-- Row-level security is FORCEd: a request without app.tenant_id sees no tenant rows.

CREATE TABLE country_profiles (
  code text PRIMARY KEY,
  display_name text NOT NULL,
  status text NOT NULL CHECK (status IN ('planned','sandbox','ready_for_review','approved','suspended','retired')),
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  country_code text NOT NULL REFERENCES country_profiles(code),
  email_hash text UNIQUE,
  phone_hash text UNIQUE,
  email_enc bytea,
  phone_enc bytea,
  password_hash text NOT NULL,
  password_salt text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','deleted')),
  assurance_level smallint NOT NULL DEFAULT 1 CHECK (assurance_level BETWEEN 1 AND 3),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX users_tenant_idx ON users (tenant_id);

CREATE TABLE user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role text NOT NULL,
  country_code text REFERENCES country_profiles(code),
  scope_tenant_id uuid,
  granted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role, scope_tenant_id)
);
CREATE INDEX user_roles_user_idx ON user_roles (user_id);

CREATE TABLE refresh_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX refresh_tokens_user_idx ON refresh_tokens (user_id);

CREATE TABLE consent_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_tenant_id uuid NOT NULL,
  patient_user_id uuid NOT NULL REFERENCES users(id),
  grantee_user_id uuid NOT NULL REFERENCES users(id),
  purpose text NOT NULL,
  scope jsonb NOT NULL DEFAULT '{}'::jsonb,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX consent_grants_lookup_idx ON consent_grants (patient_tenant_id, grantee_user_id, revoked_at, expires_at);

CREATE TABLE clinical_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  resource_type text NOT NULL,
  resource_id text NOT NULL,
  version integer NOT NULL CHECK (version > 0),
  ciphertext bytea NOT NULL,
  iv bytea NOT NULL,
  auth_tag bytea NOT NULL,
  integrity_hash text NOT NULL,
  author_id uuid NOT NULL REFERENCES users(id),
  previous_id uuid REFERENCES clinical_records(id),
  is_current boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX clinical_records_lookup_idx ON clinical_records (tenant_id, patient_id, resource_type, is_current);
CREATE UNIQUE INDEX clinical_records_current_idx ON clinical_records (tenant_id, resource_type, resource_id) WHERE is_current;

CREATE TABLE audit_events (
  id bigserial PRIMARY KEY,
  tenant_id uuid,
  actor_id uuid,
  actor_role text,
  action text NOT NULL,
  object_type text,
  object_id text,
  purpose text,
  decision text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_events_tenant_time_idx ON audit_events (tenant_id, created_at DESC);

-- Append-only guarantee at the database layer.
CREATE OR REPLACE FUNCTION reject_audit_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_events is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_events_no_update BEFORE UPDATE ON audit_events
  FOR EACH ROW EXECUTE FUNCTION reject_audit_mutation();
CREATE TRIGGER audit_events_no_delete BEFORE DELETE ON audit_events
  FOR EACH ROW EXECUTE FUNCTION reject_audit_mutation();

-- Row level security. System context is reserved for authentication/admin code paths.
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;
CREATE POLICY users_rls ON users FOR ALL USING (
  current_setting('app.is_system', true) = 'on'
  OR current_setting('app.is_platform', true) = 'on'
  OR id = NULLIF(current_setting('app.user_id', true), '')::uuid
  OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
);

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles FORCE ROW LEVEL SECURITY;
CREATE POLICY user_roles_rls ON user_roles FOR ALL USING (
  current_setting('app.is_system', true) = 'on'
  OR user_id = NULLIF(current_setting('app.user_id', true), '')::uuid
  OR scope_tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
);

ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens FORCE ROW LEVEL SECURITY;
CREATE POLICY refresh_tokens_rls ON refresh_tokens FOR ALL USING (
  current_setting('app.is_system', true) = 'on'
  OR user_id = NULLIF(current_setting('app.user_id', true), '')::uuid
);

ALTER TABLE consent_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_grants FORCE ROW LEVEL SECURITY;
CREATE POLICY consent_grants_rls ON consent_grants FOR ALL USING (
  current_setting('app.is_system', true) = 'on'
  OR patient_tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
  OR grantee_user_id = NULLIF(current_setting('app.user_id', true), '')::uuid
  OR created_by = NULLIF(current_setting('app.user_id', true), '')::uuid
);

-- A SELECT on a record requires either tenant ownership or an active consent
-- grant for the acting user. Fine-grained resource scope is enforced in the
-- application service.
ALTER TABLE clinical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical_records FORCE ROW LEVEL SECURITY;
CREATE POLICY clinical_records_select ON clinical_records FOR SELECT USING (
  current_setting('app.is_system', true) = 'on'
  OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
  OR EXISTS (
    SELECT 1 FROM consent_grants cg
    WHERE cg.patient_tenant_id = clinical_records.tenant_id
      AND cg.grantee_user_id = NULLIF(current_setting('app.user_id', true), '')::uuid
      AND cg.revoked_at IS NULL
      AND cg.expires_at > now()
  )
);
CREATE POLICY clinical_records_write ON clinical_records FOR INSERT WITH CHECK (
  tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
);
CREATE POLICY clinical_records_update ON clinical_records FOR UPDATE USING (
  tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
);

ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events FORCE ROW LEVEL SECURITY;
CREATE POLICY audit_events_rls ON audit_events FOR SELECT USING (
  current_setting('app.is_system', true) = 'on'
  OR current_setting('app.is_platform', true) = 'on'
  OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
);
CREATE POLICY audit_events_insert ON audit_events FOR INSERT WITH CHECK (true);
