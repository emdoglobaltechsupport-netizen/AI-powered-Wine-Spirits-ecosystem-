-- =============================================================
-- VINTORA — Admin Panel (Super Admin Control Center)
-- Source of truth: vintora/21-admin-panel-module.md §§3–5
-- Internal operations plane for the ten canonical modules;
-- NOT a market-facing eleventh module.
-- Extends 0001_initial.sql (users, sellers, shipments, payments,
-- marketing_campaigns, audit_logs). Plain PostgreSQL 16; Citus
-- calls commented. All privileged rows append-only where noted.
-- Admin roles never bypass RLS: no BYPASSRLS grants here.
-- =============================================================

BEGIN;

-- ---------- extend baseline audit log ----------
ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS tenant_id uuid NOT NULL
    DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  ADD COLUMN IF NOT EXISTS reason text,
  ADD COLUMN IF NOT EXISTS before_json jsonb,
  ADD COLUMN IF NOT EXISTS after_json jsonb,
  ADD COLUMN IF NOT EXISTS risk_tier text CHECK (risk_tier IN ('T0','T1','T2','T3','T4')),
  ADD COLUMN IF NOT EXISTS approval_id uuid,
  ADD COLUMN IF NOT EXISTS pii_revealed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS purpose text,
  ADD COLUMN IF NOT EXISTS trace_id text,
  ADD COLUMN IF NOT EXISTS request_id uuid;

CREATE INDEX audit_logs_tenant_entity_idx
  ON audit_logs (tenant_id, entity_type, entity_id, occurred_at DESC);
CREATE INDEX audit_logs_tenant_actor_idx
  ON audit_logs (tenant_id, actor_id, occurred_at DESC);
COMMENT ON TABLE audit_logs IS
  'Baseline audit stream; admin_action-specific detail is mirrored in admin_actions.';

-- ---------- RBAC ----------
CREATE TABLE admin_roles (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL,
  code             text NOT NULL,
  name             text NOT NULL,
  description      text,
  system_role      boolean NOT NULL DEFAULT false,
  active           boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, code)
);

CREATE TABLE admin_permissions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL,
  code             text NOT NULL,
  domain           text NOT NULL CHECK (domain IN
                     ('users','sellers','orders','logistics','payments',
                      'campaigns','ai','cases','audit','settings')),
  action           text NOT NULL CHECK (action IN
                     ('read','search','flag','modify','approve','export',
                      'impersonate','elevate')),
  scope_type       text NOT NULL CHECK (scope_type IN
                     ('global','tenant','market','module')),
  description      text,
  UNIQUE (tenant_id, code)
);
COMMENT ON TABLE admin_permissions IS
  'Permission = domain + action + scope. No wildcard permission is permitted.';

CREATE TABLE admin_role_permissions (
  tenant_id        uuid NOT NULL,
  role_id          uuid NOT NULL REFERENCES admin_roles(id) ON DELETE CASCADE,
  permission_id    uuid NOT NULL REFERENCES admin_permissions(id) ON DELETE CASCADE,
  granted_at       timestamptz NOT NULL DEFAULT now(),
  granted_by       uuid REFERENCES users(id),
  PRIMARY KEY (tenant_id, role_id, permission_id)
);

CREATE TABLE admin_staff_roles (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL,
  staff_user_id    uuid NOT NULL REFERENCES users(id),
  role_id          uuid NOT NULL REFERENCES admin_roles(id),
  scope_json       jsonb NOT NULL DEFAULT '{}'::jsonb,
  active           boolean NOT NULL DEFAULT true,
  granted_by       uuid REFERENCES users(id),
  granted_at       timestamptz NOT NULL DEFAULT now(),
  expires_at       timestamptz,
  recertified_at   timestamptz,
  CHECK (granted_by IS NULL OR granted_by <> staff_user_id)
);
CREATE INDEX admin_staff_roles_lookup_idx
  ON admin_staff_roles (tenant_id, staff_user_id, active, expires_at);
COMMENT ON TABLE admin_staff_roles IS
  'Quarterly recertification required; dormant staff auto-disabled after 30 days.';

-- ---------- sessions, approvals, action log ----------
CREATE TABLE admin_sessions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             uuid NOT NULL,
  staff_user_id         uuid NOT NULL REFERENCES users(id),
  auth_method           text NOT NULL DEFAULT 'sso',
  mfa_verified          boolean NOT NULL DEFAULT false,
  hardware_mfa          boolean NOT NULL DEFAULT false,
  roles_json            jsonb NOT NULL DEFAULT '[]'::jsonb,
  scopes_json           jsonb NOT NULL DEFAULT '[]'::jsonb,
  break_glass           boolean NOT NULL DEFAULT false,
  elevation_scope       text,
  elevation_reason      text,
  ticket_ref            text,
  approver_id           uuid REFERENCES users(id),
  impersonated_user_id  uuid REFERENCES users(id),
  impersonation_read_only boolean NOT NULL DEFAULT true,
  started_at            timestamptz NOT NULL DEFAULT now(),
  elevation_expires_at  timestamptz,
  ends_at               timestamptz,
  ip_address            inet,
  device_id             text,
  trace_id              text,
  CHECK (NOT break_glass OR approver_id IS NOT NULL)
);
CREATE INDEX admin_sessions_active_idx
  ON admin_sessions (tenant_id, staff_user_id, elevation_expires_at DESC)
  WHERE ends_at IS NULL;
COMMENT ON TABLE admin_sessions IS
  'JIT elevation and break-glass are time-boxed. Impersonation is read-only by design.';

CREATE TABLE admin_approvals (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL,
  tier              text NOT NULL CHECK (tier IN ('T3','T4')),
  action            text NOT NULL,
  domain            text NOT NULL,
  entity_type       text NOT NULL,
  entity_id         text,
  requester_id      uuid NOT NULL REFERENCES users(id),
  approver_id       uuid REFERENCES users(id),
  status            text NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','approved','rejected','expired','cancelled')),
  reason            text NOT NULL,
  evidence_json     jsonb NOT NULL DEFAULT '{}'::jsonb,
  session_id        uuid REFERENCES admin_sessions(id),
  requested_at      timestamptz NOT NULL DEFAULT now(),
  decided_at        timestamptz,
  decision_reason   text,
  trace_id          text,
  CHECK (approver_id IS NULL OR approver_id <> requester_id)
);
CREATE INDEX admin_approvals_pending_idx
  ON admin_approvals (tenant_id, status, requested_at)
  WHERE status = 'pending';
COMMENT ON TABLE admin_approvals IS
  'Four-eyes enforcement: requester can never equal approver.';

CREATE TABLE admin_actions (
  id               bigserial PRIMARY KEY,
  tenant_id        uuid NOT NULL,
  session_id       uuid REFERENCES admin_sessions(id),
  actor_id         uuid NOT NULL REFERENCES users(id),
  approver_id      uuid REFERENCES users(id),
  domain           text NOT NULL,
  tier             text NOT NULL CHECK (tier IN ('T0','T1','T2','T3','T4')),
  action           text NOT NULL,
  entity_type      text NOT NULL,
  entity_id        text,
  reason           text NOT NULL,
  before_json      jsonb,
  after_json       jsonb,
  reversible       boolean NOT NULL DEFAULT true,
  approval_id      uuid REFERENCES admin_approvals(id),
  pii_revealed     boolean NOT NULL DEFAULT false,
  purpose          text,
  trace_id         text,
  request_id       uuid,
  occurred_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX admin_actions_actor_idx
  ON admin_actions (tenant_id, actor_id, occurred_at DESC);
CREATE INDEX admin_actions_entity_idx
  ON admin_actions (tenant_id, entity_type, entity_id, occurred_at DESC);
CREATE INDEX admin_actions_tier_idx
  ON admin_actions (tenant_id, tier, occurred_at DESC) WHERE tier IN ('T3','T4');
COMMENT ON TABLE admin_actions IS
  'Append-only accountability log. Application code has no UPDATE/DELETE path.';

-- ---------- cases ----------
CREATE TABLE admin_cases (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL,
  case_code        text NOT NULL,
  domain           text NOT NULL CHECK (domain IN
                     ('users','sellers','orders','logistics','payments',
                      'campaigns','ai','audit')),
  severity         text NOT NULL CHECK (severity IN ('P1','P2','P3','P4')),
  status           text NOT NULL DEFAULT 'open'
                     CHECK (status IN ('open','assigned','in_progress','resolved',
                                       'escalated','closed')),
  entity_type      text NOT NULL,
  entity_id        text,
  title            text NOT NULL,
  description      text,
  reporter_id      uuid REFERENCES users(id),
  assignee_id      uuid REFERENCES users(id),
  alert_id         uuid,
  sla_due_at       timestamptz NOT NULL,
  first_response_at timestamptz,
  resolved_at      timestamptz,
  outcome          text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, case_code)
);
CREATE INDEX admin_cases_queue_idx
  ON admin_cases (tenant_id, status, severity, sla_due_at)
  WHERE status NOT IN ('resolved','closed');
CREATE INDEX admin_cases_entity_idx
  ON admin_cases (tenant_id, entity_type, entity_id, created_at DESC);

CREATE TABLE admin_case_comments (
  id               bigserial PRIMARY KEY,
  tenant_id        uuid NOT NULL,
  case_id          uuid NOT NULL REFERENCES admin_cases(id) ON DELETE CASCADE,
  author_id        uuid NOT NULL REFERENCES users(id),
  body             text NOT NULL,
  internal_only    boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX admin_case_comments_case_idx
  ON admin_case_comments (tenant_id, case_id, created_at);

CREATE TABLE admin_entity_flags (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL,
  entity_type      text NOT NULL CHECK (entity_type IN
                     ('user','seller','order','shipment','payment','campaign','lot')),
  entity_id        text NOT NULL,
  flag_type        text NOT NULL,
  severity         text NOT NULL CHECK (severity IN ('low','medium','high','critical')),
  source           text NOT NULL,
  evidence_ref     text,
  status           text NOT NULL DEFAULT 'open'
                     CHECK (status IN ('open','under_review','cleared','upheld')),
  case_id          uuid REFERENCES admin_cases(id),
  raised_by        uuid REFERENCES users(id),
  raised_at        timestamptz NOT NULL DEFAULT now(),
  cleared_by       uuid REFERENCES users(id),
  cleared_at       timestamptz
);
CREATE INDEX admin_entity_flags_open_idx
  ON admin_entity_flags (tenant_id, entity_type, entity_id, status)
  WHERE status IN ('open','under_review');

-- ---------- domain-specific reviews ----------
CREATE TABLE admin_seller_reviews (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL,
  seller_id           uuid NOT NULL REFERENCES sellers(id),
  review_type         text NOT NULL CHECK (review_type IN
                        ('onboarding','periodic','licence_expiry','anomaly','complaint')),
  licence_checked     boolean NOT NULL DEFAULT false,
  kyc_checked         boolean NOT NULL DEFAULT false,
  provenance_checked  boolean NOT NULL DEFAULT false,
  payout_state        text,
  dispute_rate_bps    integer,
  decision            text NOT NULL DEFAULT 'pending'
                        CHECK (decision IN ('pending','approved','rejected',
                                            'info_requested','suspended')),
  reviewer_id         uuid REFERENCES users(id),
  approval_id         uuid REFERENCES admin_approvals(id),
  case_id             uuid REFERENCES admin_cases(id),
  notes               text,
  reviewed_at         timestamptz,
  next_review_at      date
);
CREATE INDEX admin_seller_reviews_seller_idx
  ON admin_seller_reviews (tenant_id, seller_id, reviewed_at DESC);

CREATE TABLE admin_payment_disputes (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL,
  payment_id          uuid NOT NULL REFERENCES payments(id),
  dispute_type        text NOT NULL CHECK (dispute_type IN
                        ('chargeback','refund_request','failed','reconciliation','payout')),
  amount_minor        bigint NOT NULL CHECK (amount_minor >= 0),
  currency_code       char(3) NOT NULL REFERENCES currencies(code),
  processor_case_id   text,
  status              text NOT NULL DEFAULT 'open'
                        CHECK (status IN ('open','responding','won','lost','refunded','closed')),
  reason              text,
  due_at              timestamptz,
  resolution          text,
  approval_id         uuid REFERENCES admin_approvals(id),
  case_id             uuid REFERENCES admin_cases(id),
  opened_by           uuid REFERENCES users(id),
  opened_at           timestamptz NOT NULL DEFAULT now(),
  resolved_at         timestamptz
);
CREATE INDEX admin_payment_disputes_status_idx
  ON admin_payment_disputes (tenant_id, status, due_at)
  WHERE status IN ('open','responding');

CREATE TABLE admin_campaign_reviews (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL,
  campaign_id         uuid NOT NULL REFERENCES marketing_campaigns(id),
  compliance_status   text NOT NULL CHECK (compliance_status IN ('PASS','WARN','BLOCK')),
  findings_json       jsonb NOT NULL DEFAULT '[]'::jsonb,
  brand_voice_score   numeric(5,2),
  market_codes        text[] NOT NULL DEFAULT '{}',
  age_gated           boolean NOT NULL DEFAULT false,
  minors_targeted     boolean NOT NULL DEFAULT false,
  spend_cap_minor     bigint,
  decision            text NOT NULL DEFAULT 'pending'
                        CHECK (decision IN ('pending','approved','rejected',
                                            'force_review','paused')),
  reviewer_id         uuid REFERENCES users(id),
  approval_id         uuid REFERENCES admin_approvals(id),
  case_id             uuid REFERENCES admin_cases(id),
  notes               text,
  reviewed_at         timestamptz
);
CREATE INDEX admin_campaign_reviews_queue_idx
  ON admin_campaign_reviews (tenant_id, decision, compliance_status)
  WHERE decision IN ('pending','force_review');
COMMENT ON TABLE admin_campaign_reviews IS
  'Enforces no publish without named human approval; health/intoxication claims and minor targeting block review.';

-- ---------- AI governance ----------
CREATE TABLE admin_ai_model_controls (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                uuid NOT NULL,
  model_key                text NOT NULL,
  model_version            text NOT NULL,
  stage                    text NOT NULL CHECK (stage IN
                             ('dev','staging','shadow','champion','retired')),
  status                   text NOT NULL DEFAULT 'active'
                             CHECK (status IN ('active','paused','halted','rolled_back')),
  rollout_pct              integer NOT NULL DEFAULT 0 CHECK (rollout_pct BETWEEN 0 AND 100),
  spend_cap_usd            numeric(14,2),
  kill_switch              boolean NOT NULL DEFAULT false,
  fallback_model_version   text,
  eval_summary_json        jsonb NOT NULL DEFAULT '{}'::jsonb,
  owner_id                 uuid REFERENCES users(id),
  updated_by               uuid REFERENCES users(id),
  approval_id              uuid REFERENCES admin_approvals(id),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, model_key, model_version)
);
CREATE INDEX admin_ai_model_controls_lookup_idx
  ON admin_ai_model_controls (tenant_id, model_key, stage, status);
COMMENT ON TABLE admin_ai_model_controls IS
  'Kill switch must propagate in < 1 min; production promote requires T4 dual approval.';

CREATE TABLE admin_ai_model_evaluations (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL,
  model_version       text NOT NULL,
  evaluation_type     text NOT NULL CHECK (evaluation_type IN
                        ('offline','backtest','shadow','red_team','fairness','online')),
  metric_name         text NOT NULL,
  metric_value        numeric(14,6) NOT NULL,
  segment             text NOT NULL DEFAULT 'overall',
  gate_result         text NOT NULL CHECK (gate_result IN ('pass','warn','fail')),
  findings_json       jsonb NOT NULL DEFAULT '{}'::jsonb,
  model_run_id        uuid,
  evaluated_by        uuid REFERENCES users(id),
  evaluated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX admin_ai_model_evals_idx
  ON admin_ai_model_evaluations (tenant_id, model_version, evaluation_type, evaluated_at DESC);

-- ---------- bulk jobs, alerts, metrics ----------
CREATE TABLE admin_bulk_jobs (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL,
  name                text NOT NULL,
  domain              text NOT NULL,
  action              text NOT NULL,
  target_filter_json  jsonb NOT NULL,
  preview_count       integer NOT NULL DEFAULT 0,
  dry_run             boolean NOT NULL DEFAULT true,
  status              text NOT NULL DEFAULT 'preview'
                        CHECK (status IN ('preview','approved','running','completed',
                                          'failed','rolled_back')),
  requested_by        uuid REFERENCES users(id),
  approval_id         uuid REFERENCES admin_approvals(id),
  started_at          timestamptz,
  finished_at         timestamptz,
  succeeded_count     integer NOT NULL DEFAULT 0,
  failed_count        integer NOT NULL DEFAULT 0,
  rollback_ref        text,
  created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX admin_bulk_jobs_status_idx
  ON admin_bulk_jobs (tenant_id, status, created_at DESC);

CREATE TABLE admin_alert_rules (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL,
  code                text NOT NULL,
  domain              text NOT NULL,
  metric              text NOT NULL,
  comparator          text NOT NULL CHECK (comparator IN ('gt','gte','lt','lte','eq')),
  threshold           numeric(18,6) NOT NULL,
  window_minutes      integer NOT NULL DEFAULT 15,
  severity            text NOT NULL CHECK (severity IN ('P1','P2','P3','P4')),
  auto_create_case    boolean NOT NULL DEFAULT false,
  enabled             boolean NOT NULL DEFAULT true,
  silence_until       timestamptz,
  owner_id            uuid REFERENCES users(id),
  UNIQUE (tenant_id, code)
);

CREATE TABLE admin_alerts (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL,
  rule_id             uuid NOT NULL REFERENCES admin_alert_rules(id),
  severity            text NOT NULL CHECK (severity IN ('P1','P2','P3','P4')),
  entity_type         text,
  entity_id           text,
  observed_value      numeric(18,6),
  message             text NOT NULL,
  status              text NOT NULL DEFAULT 'open'
                        CHECK (status IN ('open','acknowledged','silenced','closed')),
  case_id             uuid REFERENCES admin_cases(id),
  acknowledged_by     uuid REFERENCES users(id),
  acknowledged_at     timestamptz,
  silenced_until      timestamptz,
  fired_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX admin_alerts_open_idx
  ON admin_alerts (tenant_id, status, severity, fired_at DESC)
  WHERE status IN ('open','acknowledged');

CREATE TABLE admin_metrics_daily (
  id                  bigserial PRIMARY KEY,
  tenant_id           uuid NOT NULL,
  metric_date         date NOT NULL,
  domain              text NOT NULL,
  metric_name         text NOT NULL,
  dimension_key       text NOT NULL DEFAULT 'all',
  metric_value        numeric(18,6) NOT NULL,
  dimensions_json     jsonb NOT NULL DEFAULT '{}'::jsonb,
  computed_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, metric_date, domain, metric_name, dimension_key)
);
CREATE INDEX admin_metrics_daily_lookup_idx
  ON admin_metrics_daily (tenant_id, domain, metric_date DESC);

-- ---------- row-level security ----------
-- Admin roles do NOT bypass RLS. Staff-level restrictions are enforced by
-- role/scope policy plus the action log, never by a blanket BYPASSRLS grant.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'admin_roles','admin_permissions','admin_role_permissions','admin_staff_roles',
    'admin_sessions','admin_approvals','admin_actions','admin_cases',
    'admin_case_comments','admin_entity_flags','admin_seller_reviews',
    'admin_payment_disputes','admin_campaign_reviews','admin_ai_model_controls',
    'admin_ai_model_evaluations','admin_bulk_jobs','admin_alert_rules',
    'admin_alerts','admin_metrics_daily'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I '
      || 'USING (tenant_id = current_setting(''app.tenant_id'', true)::uuid) '
      || 'WITH CHECK (tenant_id = current_setting(''app.tenant_id'', true)::uuid)',
      t);
  END LOOP;

  EXECUTE 'ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY';
  EXECUTE 'CREATE POLICY tenant_isolation ON audit_logs '
       || 'USING (tenant_id = current_setting(''app.tenant_id'', true)::uuid) '
       || 'WITH CHECK (tenant_id = current_setting(''app.tenant_id'', true)::uuid)';
END $$;

-- Citus distribution notes (apply on the sharded deployment only):
-- SELECT create_distributed_table('admin_actions', 'tenant_id');
-- SELECT create_distributed_table('admin_cases', 'tenant_id');
-- SELECT create_distributed_table('admin_alerts', 'tenant_id');
-- SELECT create_distributed_table('admin_metrics_daily', 'tenant_id');
-- SELECT create_distributed_table('audit_logs', 'tenant_id');
-- Reference/replicated: admin_roles, admin_permissions, admin_role_permissions,
--   admin_staff_roles, admin_alert_rules, admin_ai_model_controls.
-- NOTE: no trigger here writes to business tables. All privileged actions run
-- through the guarded executor with reason + approval and append to admin_actions.

COMMIT;
