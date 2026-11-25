-- EMDO Care: provider credentialing, human approvals, availability and bookings.
-- No credentials, providers or partnerships are seeded by this migration.

CREATE TABLE provider_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES users(id),
  tenant_id uuid NOT NULL,
  country_code text NOT NULL REFERENCES country_profiles(code),
  professional_name text NOT NULL,
  specialty text NOT NULL,
  languages text[] NOT NULL DEFAULT '{}',
  city text,
  telehealth_enabled boolean NOT NULL DEFAULT false,
  consultation_fee numeric(12,2),
  currency text,
  licence_hash text NOT NULL,
  licence_jurisdiction text NOT NULL,
  licence_expires_at timestamptz,
  verification_status text NOT NULL DEFAULT 'unverified'
    CHECK (verification_status IN ('unverified','submitted','under_review','verified','rejected','suspended','revoked')),
  verification_source text,
  verified_at timestamptz,
  verified_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX provider_profiles_directory_idx
  ON provider_profiles (country_code, verification_status, specialty, city);
CREATE INDEX provider_profiles_tenant_idx ON provider_profiles (tenant_id);

CREATE TABLE provider_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES provider_profiles(id) ON DELETE CASCADE,
  credential_type text NOT NULL CHECK (credential_type IN ('licence','registration','qualification','identity')),
  source_type text NOT NULL CHECK (source_type IN ('registry','document','manual')),
  reference_hash text NOT NULL,
  jurisdiction text NOT NULL,
  expires_at timestamptz,
  verified_at timestamptz,
  verified_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX provider_credentials_provider_idx ON provider_credentials (provider_id);

CREATE TABLE verification_events (
  id bigserial PRIMARY KEY,
  provider_id uuid NOT NULL REFERENCES provider_profiles(id),
  from_status text NOT NULL,
  to_status text NOT NULL,
  actor_id uuid,
  reason text,
  evidence_ref text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX verification_events_provider_idx ON verification_events (provider_id, created_at DESC);

CREATE OR REPLACE FUNCTION reject_verification_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'verification_events is append-only';
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER verification_events_no_update BEFORE UPDATE ON verification_events
  FOR EACH ROW EXECUTE FUNCTION reject_verification_mutation();
CREATE TRIGGER verification_events_no_delete BEFORE DELETE ON verification_events
  FOR EACH ROW EXECUTE FUNCTION reject_verification_mutation();

CREATE TABLE approval_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code text NOT NULL REFERENCES country_profiles(code),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  action text NOT NULL,
  target_status text,
  reason text NOT NULL,
  evidence_ref text,
  requested_by uuid NOT NULL REFERENCES users(id),
  requested_role text NOT NULL,
  approver_id uuid REFERENCES users(id),
  approver_role text,
  decision text NOT NULL DEFAULT 'pending' CHECK (decision IN ('pending','approved','rejected')),
  decided_at timestamptz,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX approval_requests_status_idx ON approval_requests (decision, created_at DESC);
CREATE UNIQUE INDEX approval_requests_pending_idx ON approval_requests (entity_id, action)
  WHERE decision = 'pending' AND consumed_at IS NULL;

CREATE TABLE provider_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES provider_profiles(id) ON DELETE CASCADE,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL CHECK (ends_at > starts_at),
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available','booked','blocked')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX provider_slots_lookup_idx ON provider_slots (provider_id, starts_at, status);

CREATE TABLE appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_tenant_id uuid NOT NULL,
  patient_user_id uuid NOT NULL REFERENCES users(id),
  provider_id uuid NOT NULL REFERENCES provider_profiles(id),
  provider_tenant_id uuid NOT NULL,
  slot_id uuid NOT NULL UNIQUE REFERENCES provider_slots(id),
  channel text NOT NULL CHECK (channel IN ('in_person','telehealth')),
  status text NOT NULL DEFAULT 'confirmed'
    CHECK (status IN ('confirmed','rescheduled','cancelled','completed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX appointments_patient_idx ON appointments (patient_tenant_id, created_at DESC);
CREATE INDEX appointments_provider_idx ON appointments (provider_id, created_at DESC);

ALTER TABLE provider_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_profiles FORCE ROW LEVEL SECURITY;
CREATE POLICY provider_profiles_rls ON provider_profiles FOR ALL USING (
  current_setting('app.is_system', true) = 'on'
  OR current_setting('app.is_platform', true) = 'on'
  OR user_id = NULLIF(current_setting('app.user_id', true), '')::uuid
  OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
);

ALTER TABLE provider_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_credentials FORCE ROW LEVEL SECURITY;
CREATE POLICY provider_credentials_rls ON provider_credentials FOR ALL USING (
  current_setting('app.is_system', true) = 'on'
  OR current_setting('app.is_platform', true) = 'on'
);

ALTER TABLE verification_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_events FORCE ROW LEVEL SECURITY;
CREATE POLICY verification_events_rls ON verification_events FOR SELECT USING (
  current_setting('app.is_system', true) = 'on'
  OR current_setting('app.is_platform', true) = 'on'
);
CREATE POLICY verification_events_insert ON verification_events FOR INSERT WITH CHECK (true);

ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_requests FORCE ROW LEVEL SECURITY;
CREATE POLICY approval_requests_rls ON approval_requests FOR ALL USING (
  current_setting('app.is_system', true) = 'on'
  OR current_setting('app.is_platform', true) = 'on'
);

ALTER TABLE provider_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_slots FORCE ROW LEVEL SECURITY;
CREATE POLICY provider_slots_rls ON provider_slots FOR ALL USING (
  current_setting('app.is_system', true) = 'on'
  OR current_setting('app.is_platform', true) = 'on'
  OR EXISTS (
    SELECT 1 FROM provider_profiles p
    WHERE p.id = provider_slots.provider_id
      AND p.user_id = NULLIF(current_setting('app.user_id', true), '')::uuid
  )
);

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments FORCE ROW LEVEL SECURITY;
CREATE POLICY appointments_rls ON appointments FOR ALL USING (
  current_setting('app.is_system', true) = 'on'
  OR current_setting('app.is_platform', true) = 'on'
  OR patient_tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
  OR provider_tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
);
