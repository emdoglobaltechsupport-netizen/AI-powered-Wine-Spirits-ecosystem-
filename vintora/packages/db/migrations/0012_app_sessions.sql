-- =============================================================
-- VINTORA — application sessions for the modular API.
-- Complements admin_sessions in 0009 (which is for privileged
-- admin sessions). Session tokens are stored as SHA-256 hashes:
-- the raw token only ever exists in the HttpOnly cookie.
-- =============================================================

BEGIN;

-- Local credential storage for seeded demo accounts. Production deployments
-- should replace this with the external identity provider (SSO + hardware MFA).
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS idempotency_key text UNIQUE;

CREATE TABLE IF NOT EXISTS app_sessions (
  token_hash   text PRIMARY KEY,
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  expires_at   timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS app_sessions_user_idx
  ON app_sessions (user_id, expires_at DESC);
CREATE INDEX IF NOT EXISTS app_sessions_expiry_idx
  ON app_sessions (expires_at);

CREATE TABLE IF NOT EXISTS login_attempts (
  id          bigserial PRIMARY KEY,
  email       citext NOT NULL,
  ip_address  inet,
  succeeded   boolean NOT NULL DEFAULT false,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS login_attempts_email_idx
  ON login_attempts (email, occurred_at DESC);

COMMIT;
