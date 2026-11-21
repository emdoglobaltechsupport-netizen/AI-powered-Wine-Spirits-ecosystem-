-- =============================================================
-- VINTORA — AI Marketing Automation Module
-- Source of truth: vintora/23-ai-marketing-automation-module.md §§3–5
-- Extends 0001_initial.sql (marketing_campaigns), 0009_admin_panel.sql
-- (admin_approvals, admin_campaign_reviews) and 04-database-design.md
-- (campaign_metrics). Execution engine on top of Vintora Studio (doc 14).
-- Plain PostgreSQL 16; Citus calls commented. Every release is bound to
-- a human approval and a rendered variant hash. No autonomous publish,
-- spend, send or post. Advertising cap is a runtime control.
-- =============================================================

BEGIN;

-- ---------- extend baseline campaign ----------
ALTER TABLE marketing_campaigns
  ADD COLUMN IF NOT EXISTS tenant_id uuid NOT NULL
    DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS automation_goal_id uuid,
  ADD COLUMN IF NOT EXISTS automation_run_id uuid,
  ADD COLUMN IF NOT EXISTS automation_level text NOT NULL DEFAULT 'L1'
    CHECK (automation_level IN ('L0','L1','L2','L3')),
  ADD COLUMN IF NOT EXISTS guardrail_status text NOT NULL DEFAULT 'PASS'
    CHECK (guardrail_status IN ('PASS','WARN','BLOCK')),
  ADD COLUMN IF NOT EXISTS approval_id uuid,
  ADD COLUMN IF NOT EXISTS campaign_review_id uuid,
  ADD COLUMN IF NOT EXISTS spend_cap_minor bigint,
  ADD COLUMN IF NOT EXISTS revenue_base_minor bigint,
  ADD COLUMN IF NOT EXISTS cap_pct_basis_point integer;

CREATE INDEX marketing_campaigns_automation_idx
  ON marketing_campaigns (tenant_id, automation_run_id, status);

-- ---------- planning ----------
CREATE TABLE marketing_briefs (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL,
  brand_id            uuid,
  owner_seller_id     uuid,
  title               text NOT NULL,
  objective           text NOT NULL,
  brief_json          jsonb NOT NULL DEFAULT '{}'::jsonb,
  product_refs        text[] NOT NULL DEFAULT '{}',
  market_codes        text[] NOT NULL DEFAULT '{}',
  locale_codes        text[] NOT NULL DEFAULT '{}',
  window_start        timestamptz,
  window_end          timestamptz,
  status              text NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft','submitted','planned','rejected','closed')),
  created_by          uuid,
  created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX marketing_briefs_owner_idx
  ON marketing_briefs (tenant_id, owner_seller_id, status, created_at DESC);

CREATE TABLE automation_goals (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL,
  brief_id            uuid NOT NULL REFERENCES marketing_briefs(id),
  name                text NOT NULL,
  objective           text NOT NULL,
  markets_json        jsonb NOT NULL DEFAULT '[]'::jsonb,
  audience_refs       jsonb NOT NULL DEFAULT '[]'::jsonb,
  channel_mix         text[] NOT NULL DEFAULT '{}',
  budget_ceiling_minor bigint,
  currency_code       char(3) NOT NULL DEFAULT 'USD',
  bounds_json         jsonb NOT NULL DEFAULT '{}'::jsonb,
  kpi_json            jsonb NOT NULL DEFAULT '{}'::jsonb,
  automation_level    text NOT NULL DEFAULT 'L2'
                        CHECK (automation_level IN ('L0','L1','L2','L3')),
  status              text NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft','approved','active','paused','completed','cancelled')),
  approval_id         uuid REFERENCES admin_approvals(id),
  approved_by         uuid,
  approved_at         timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX automation_goals_status_idx
  ON automation_goals (tenant_id, status, created_at DESC);
COMMENT ON COLUMN automation_goals.bounds_json IS
  'Approved channels, markets, audience, variants, optimization limits and pause triggers. Out-of-bounds change requires new approval.';

CREATE TABLE automation_runs (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL,
  goal_id             uuid NOT NULL REFERENCES automation_goals(id),
  campaign_id         uuid REFERENCES marketing_campaigns(id),
  status              text NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft','planned','approved','scheduled','live',
                                          'optimizing','paused','completed','cancelled','failed')),
  automation_level    text NOT NULL DEFAULT 'L2'
                        CHECK (automation_level IN ('L0','L1','L2','L3')),
  current_step        integer NOT NULL DEFAULT 0,
  approval_id         uuid REFERENCES admin_approvals(id),
  kill_switch         boolean NOT NULL DEFAULT false,
  pause_reason        text,
  revenue_base_minor  bigint,
  cap_limit_minor     bigint,
  cap_utilized_minor  bigint NOT NULL DEFAULT 0,
  started_at          timestamptz,
  completed_at        timestamptz,
  trace_id            text,
  created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX automation_runs_queue_idx
  ON automation_runs (tenant_id, status, started_at DESC)
  WHERE status NOT IN ('completed','cancelled','failed');
COMMENT ON TABLE automation_runs IS
  'Durable run state. Kill switch and cap fields are enforced at execution time, not reported after the fact.';

CREATE TABLE automation_run_steps (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL,
  run_id              uuid NOT NULL REFERENCES automation_runs(id) ON DELETE CASCADE,
  step_no             integer NOT NULL CHECK (step_no > 0),
  step_type           text NOT NULL CHECK (step_type IN
                        ('plan','generate','validate','approve','draft','schedule',
                         'release','deliver','monitor','optimize','report')),
  channel             text,
  status              text NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','running','succeeded','failed','skipped','rolled_back')),
  input_hash          text,
  output_hash         text,
  attempts            integer NOT NULL DEFAULT 0,
  error_code          text,
  started_at          timestamptz,
  finished_at         timestamptz,
  UNIQUE (tenant_id, run_id, step_no)
);
CREATE INDEX automation_run_steps_lookup_idx
  ON automation_run_steps (tenant_id, run_id, status, step_no);

-- ---------- channel connectivity ----------
CREATE TABLE channel_accounts (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL,
  provider            text NOT NULL CHECK (provider IN
                        ('meta','google_ads','tiktok','linkedin','x','klaviyo',
                         'sendgrid','cms','instagram','youtube')),
  channel_type        text NOT NULL CHECK (channel_type IN ('ads','email','social','seo')),
  external_account_id text NOT NULL,
  display_name        text,
  credential_ref      text NOT NULL,
  status              text NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active','paused','revoked','expired')),
  token_expires_at    timestamptz,
  scopes_json         jsonb NOT NULL DEFAULT '[]'::jsonb,
  verified_at         timestamptz,
  UNIQUE (tenant_id, provider, external_account_id)
);
COMMENT ON COLUMN channel_accounts.credential_ref IS
  'Opaque reference to the managed secret store. No credentials or tokens are stored in this table.';

CREATE TABLE ad_accounts (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL,
  channel_account_id  uuid NOT NULL REFERENCES channel_accounts(id),
  provider_account_id text NOT NULL,
  currency_code       char(3) NOT NULL,
  billing_ref         text,
  status              text NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active','paused','suspended')),
  UNIQUE (tenant_id, provider_account_id)
);

CREATE TABLE social_accounts (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL,
  channel_account_id  uuid NOT NULL REFERENCES channel_accounts(id),
  handle              text NOT NULL,
  age_restricted      boolean NOT NULL DEFAULT true,
  auto_publish_enabled boolean NOT NULL DEFAULT false,
  verification_ref    text,
  status              text NOT NULL DEFAULT 'active',
  UNIQUE (tenant_id, handle)
);
COMMENT ON COLUMN social_accounts.auto_publish_enabled IS
  'Allows release of an already-approved post at its approved time. Never permits self-approval.';

-- ---------- ads ----------
CREATE TABLE ad_campaigns (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL,
  run_id              uuid NOT NULL REFERENCES automation_runs(id),
  campaign_id         uuid REFERENCES marketing_campaigns(id),
  ad_account_id       uuid NOT NULL REFERENCES ad_accounts(id),
  budget_policy_id    uuid,
  provider_campaign_id text,
  objective           text NOT NULL,
  market_codes        text[] NOT NULL DEFAULT '{}',
  status              text NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft','approved','scheduled','live','paused',
                                          'completed','cancelled')),
  approval_id         uuid REFERENCES admin_approvals(id),
  released_at         timestamptz,
  spend_cap_minor     bigint,
  spend_minor         bigint NOT NULL DEFAULT 0,
  created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ad_campaigns_status_idx
  ON ad_campaigns (tenant_id, status, created_at DESC);

CREATE TABLE ad_creatives (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL,
  ad_campaign_id      uuid NOT NULL REFERENCES ad_campaigns(id) ON DELETE CASCADE,
  asset_id            uuid,
  variant_hash        text NOT NULL,
  headline            text,
  description         text,
  cta                 text,
  media_object_key    text,
  prompt_version      text,
  model_hash          text,
  voice_score         numeric(5,2),
  guardrail_status    text NOT NULL CHECK (guardrail_status IN ('PASS','WARN','BLOCK')),
  approval_id         uuid REFERENCES admin_approvals(id),
  platform_draft_ref  text,
  status              text NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft','approved','released','paused','rejected')),
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, ad_campaign_id, variant_hash)
);
CREATE INDEX ad_creatives_campaign_idx
  ON ad_creatives (tenant_id, ad_campaign_id, status);

CREATE TABLE ad_budget_policies (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL,
  goal_id             uuid REFERENCES automation_goals(id),
  name                text NOT NULL,
  daily_cap_minor     bigint NOT NULL CHECK (daily_cap_minor >= 0),
  total_cap_minor     bigint NOT NULL CHECK (total_cap_minor >= 0),
  cap_pct_ceiling     integer NOT NULL DEFAULT 800 CHECK (cap_pct_ceiling BETWEEN 0 AND 800),
  revenue_base_minor  bigint,
  pause_action        text NOT NULL DEFAULT 'pause'
                        CHECK (pause_action IN ('pause','alert','pause_and_case')),
  approval_id         uuid REFERENCES admin_approvals(id),
  effective_from      timestamptz NOT NULL DEFAULT now(),
  effective_to        timestamptz,
  active              boolean NOT NULL DEFAULT true
);
COMMENT ON TABLE ad_budget_policies IS
  'cap_pct_ceiling in basis points: 800 = 8% of revenue, the canonical advertising ceiling.';

CREATE TABLE ad_budget_spend_daily (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL,
  budget_policy_id    uuid NOT NULL REFERENCES ad_budget_policies(id),
  ad_campaign_id      uuid REFERENCES ad_campaigns(id),
  spend_date          date NOT NULL,
  spend_minor         bigint NOT NULL DEFAULT 0,
  currency_code       char(3) NOT NULL,
  revenue_base_minor  bigint,
  cap_pct_actual      numeric(7,4),
  cap_breached        boolean NOT NULL DEFAULT false,
  action_taken        text,
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, budget_policy_id, spend_date, ad_campaign_id)
);
CREATE INDEX ad_budget_spend_breach_idx
  ON ad_budget_spend_daily (tenant_id, spend_date DESC)
  WHERE cap_breached;
COMMENT ON TABLE ad_budget_spend_daily IS
  'Append-only cap accounting. Breach triggers automatic pause and an Admin case.';

-- ---------- email ----------
CREATE TABLE email_sequences (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL,
  run_id              uuid NOT NULL REFERENCES automation_runs(id),
  campaign_id         uuid REFERENCES marketing_campaigns(id),
  name                text NOT NULL,
  steps_json          jsonb NOT NULL DEFAULT '[]'::jsonb,
  audience_ref        text NOT NULL,
  audience_snapshot_hash text NOT NULL,
  age_verified_only   boolean NOT NULL DEFAULT true,
  consent_required    boolean NOT NULL DEFAULT true,
  suppression_checked boolean NOT NULL DEFAULT false,
  footer_compliance   boolean NOT NULL DEFAULT false,
  deliverability_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  status              text NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft','approved','scheduled','live','paused','completed')),
  approval_id         uuid REFERENCES admin_approvals(id),
  created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX email_sequences_status_idx
  ON email_sequences (tenant_id, status, created_at DESC);

CREATE TABLE email_sends (
  id                  bigserial PRIMARY KEY,
  tenant_id           uuid NOT NULL,
  sequence_id         uuid NOT NULL REFERENCES email_sequences(id) ON DELETE CASCADE,
  recipient_hash      text NOT NULL,
  variant_hash        text NOT NULL,
  eligibility_json    jsonb NOT NULL DEFAULT '{}'::jsonb,
  scheduled_at        timestamptz,
  sent_at             timestamptz,
  status              text NOT NULL DEFAULT 'scheduled'
                        CHECK (status IN ('scheduled','eligible','sent','held','bounced','complained','cancelled')),
  hold_reason         text,
  provider_ref        text,
  approval_id         uuid REFERENCES admin_approvals(id),
  created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX email_sends_schedule_idx
  ON email_sends (tenant_id, status, scheduled_at);
COMMENT ON TABLE email_sends IS
  'Recipients are pseudonymous hashes. Consent, age and suppression are re-checked immediately before send.';

-- ---------- social ----------
CREATE TABLE social_posts (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL,
  run_id              uuid NOT NULL REFERENCES automation_runs(id),
  social_account_id   uuid NOT NULL REFERENCES social_accounts(id),
  platform            text NOT NULL,
  variant_hash        text NOT NULL,
  caption             text,
  media_object_keys   text[] NOT NULL DEFAULT '{}',
  disclosure_ok       boolean NOT NULL DEFAULT false,
  age_gate_ok         boolean NOT NULL DEFAULT false,
  minors_targeted     boolean NOT NULL DEFAULT false,
  guardrail_status    text NOT NULL CHECK (guardrail_status IN ('PASS','WARN','BLOCK')),
  approval_id         uuid REFERENCES admin_approvals(id),
  status              text NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft','approved','scheduled','posted','failed','paused','removed')),
  platform_draft_ref  text,
  scheduled_at        timestamptz,
  posted_at           timestamptz,
  moderation_state    text NOT NULL DEFAULT 'none'
                        CHECK (moderation_state IN ('none','pending','cleared','escalated')),
  created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX social_posts_schedule_idx
  ON social_posts (tenant_id, status, scheduled_at);
CREATE INDEX social_posts_moderation_idx
  ON social_posts (tenant_id, moderation_state, posted_at DESC)
  WHERE moderation_state IN ('pending','escalated');

-- ---------- SEO ----------
CREATE TABLE seo_audits (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL,
  run_id              uuid NOT NULL REFERENCES automation_runs(id),
  name                text NOT NULL,
  scope_json          jsonb NOT NULL DEFAULT '{}'::jsonb,
  market_codes        text[] NOT NULL DEFAULT '{}',
  locale_codes        text[] NOT NULL DEFAULT '{}',
  keyword_clusters    jsonb NOT NULL DEFAULT '[]'::jsonb,
  findings_json       jsonb NOT NULL DEFAULT '[]'::jsonb,
  baseline_json       jsonb NOT NULL DEFAULT '{}'::jsonb,
  status              text NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft','approved','released','rolled_back','closed')),
  approval_id         uuid REFERENCES admin_approvals(id),
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE seo_recommendations (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL,
  audit_id            uuid NOT NULL REFERENCES seo_audits(id) ON DELETE CASCADE,
  rec_type            text NOT NULL CHECK (rec_type IN
                        ('meta','schema','alt_text','landing_copy','internal_link',
                         'canonical','technical','content_gap')),
  target_ref          text NOT NULL,
  before_json         jsonb,
  after_json          jsonb NOT NULL,
  fact_packet_hash    text,
  priority            text NOT NULL DEFAULT 'medium'
                        CHECK (priority IN ('low','medium','high')),
  guardrail_status    text NOT NULL CHECK (guardrail_status IN ('PASS','WARN','BLOCK')),
  approval_id         uuid REFERENCES admin_approvals(id),
  status              text NOT NULL DEFAULT 'proposed'
                        CHECK (status IN ('proposed','approved','released','reverted','rejected')),
  released_at         timestamptz
);
CREATE INDEX seo_recommendations_audit_idx
  ON seo_recommendations (tenant_id, audit_id, status, priority);
COMMENT ON TABLE seo_recommendations IS
  'Facts only: no fabricated awards, scores or provenance; no cloaking or doorway pages.';

-- ---------- influencers ----------
CREATE TABLE influencer_profiles (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL,
  external_handle     text NOT NULL,
  platform            text NOT NULL,
  market_code         char(2),
  audience_age_json   jsonb NOT NULL DEFAULT '{}'::jsonb,
  minor_audience_pct  numeric(5,2),
  fit_score           numeric(5,2),
  authenticity_score  numeric(5,2),
  brand_safety_status text NOT NULL DEFAULT 'pending'
                        CHECK (brand_safety_status IN ('pending','pass','warn','block')),
  disclosure_history  jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_ref          text,
  screened_at         timestamptz,
  screened_by         uuid,
  UNIQUE (tenant_id, platform, external_handle)
);
CREATE INDEX influencer_profiles_screen_idx
  ON influencer_profiles (tenant_id, brand_safety_status, fit_score DESC);

CREATE TABLE influencer_campaigns (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL,
  run_id              uuid NOT NULL REFERENCES automation_runs(id),
  influencer_id       uuid NOT NULL REFERENCES influencer_profiles(id),
  campaign_id         uuid REFERENCES marketing_campaigns(id),
  deliverables_json   jsonb NOT NULL DEFAULT '[]'::jsonb,
  fee_minor           bigint,
  currency_code       char(3),
  disclosure_required boolean NOT NULL DEFAULT true,
  disclosure_verified boolean NOT NULL DEFAULT false,
  contract_ref        text,
  contract_approved_by uuid,
  contract_approved_at timestamptz,
  approval_id         uuid REFERENCES admin_approvals(id),
  status              text NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft','negotiating','approved','active',
                                          'delivered','paid','cancelled','blocked')),
  created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX influencer_campaigns_status_idx
  ON influencer_campaigns (tenant_id, status, created_at DESC);
COMMENT ON TABLE influencer_campaigns IS
  'The engine never signs contracts or pays creators. Payouts use Global Payments with Admin dual approval.';

CREATE TABLE influencer_outreach (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL,
  influencer_id       uuid NOT NULL REFERENCES influencer_profiles(id),
  influencer_campaign_id uuid REFERENCES influencer_campaigns(id),
  variant_hash        text NOT NULL,
  subject             text,
  body                text,
  prompt_version      text,
  model_hash          text,
  guardrail_status    text NOT NULL CHECK (guardrail_status IN ('PASS','WARN','BLOCK')),
  approval_id         uuid REFERENCES admin_approvals(id),
  status              text NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft','approved','sent','replied','declined','closed')),
  sent_at             timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX influencer_outreach_influencer_idx
  ON influencer_outreach (tenant_id, influencer_id, created_at DESC);

-- ---------- governance, experiments, metrics, kill switch ----------
CREATE TABLE guardrail_evaluations (
  id                  bigserial PRIMARY KEY,
  tenant_id           uuid NOT NULL,
  run_id              uuid REFERENCES automation_runs(id),
  asset_ref           text,
  stage               text NOT NULL CHECK (stage IN
                        ('generation','approval','release','delivery','monitoring')),
  status              text NOT NULL CHECK (status IN ('PASS','WARN','BLOCK')),
  findings_json       jsonb NOT NULL DEFAULT '[]'::jsonb,
  required_actions    jsonb NOT NULL DEFAULT '[]'::jsonb,
  ruleset_version     text NOT NULL,
  model_hash          text,
  variant_hash        text NOT NULL,
  approval_id         uuid REFERENCES admin_approvals(id),
  actor               text,
  reason              text,
  trace_id            text,
  decided_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX guardrail_evaluations_evidence_idx
  ON guardrail_evaluations (tenant_id, run_id, stage, decided_at DESC);
COMMENT ON TABLE guardrail_evaluations IS
  'Append-only evidence. BLOCK findings require a brief change; WARN requires named human acknowledgement.';

CREATE TABLE automation_experiments (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL,
  run_id              uuid NOT NULL REFERENCES automation_runs(id),
  name                text NOT NULL,
  hypothesis          text NOT NULL,
  variants_json       jsonb NOT NULL DEFAULT '[]'::jsonb,
  primary_metric      text NOT NULL,
  guardrail_metrics   jsonb NOT NULL DEFAULT '{}'::jsonb,
  status              text NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft','approved','running','completed','stopped')),
  result_json         jsonb NOT NULL DEFAULT '{}'::jsonb,
  significance_label  text NOT NULL DEFAULT 'directional'
                        CHECK (significance_label IN ('directional','significant','inconclusive')),
  approval_id         uuid REFERENCES admin_approvals(id),
  started_at          timestamptz,
  ended_at            timestamptz
);
CREATE INDEX automation_experiments_run_idx
  ON automation_experiments (tenant_id, run_id, status);

CREATE TABLE automation_metrics_daily (
  id                  bigserial PRIMARY KEY,
  tenant_id           uuid NOT NULL,
  metric_date         date NOT NULL,
  domain              text NOT NULL CHECK (domain IN
                        ('ads','campaigns','email','social','seo','influencers')),
  metric_name         text NOT NULL,
  dimension_key       text NOT NULL DEFAULT 'all',
  metric_value        numeric(18,6) NOT NULL,
  dimensions_json     jsonb NOT NULL DEFAULT '{}'::jsonb,
  computed_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, metric_date, domain, metric_name, dimension_key)
);
CREATE INDEX automation_metrics_lookup_idx
  ON automation_metrics_daily (tenant_id, domain, metric_date DESC);

CREATE TABLE automation_kill_switches (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL,
  run_id              uuid REFERENCES automation_runs(id),
  scope               text NOT NULL CHECK (scope IN ('run','channel','brand','all')),
  reason              text NOT NULL,
  activated_by        uuid NOT NULL,
  approved_by         uuid,
  active              boolean NOT NULL DEFAULT true,
  activated_at        timestamptz NOT NULL DEFAULT now(),
  deactivated_at      timestamptz,
  trace_id            text,
  CHECK (approved_by IS NULL OR approved_by <> activated_by)
);
CREATE INDEX automation_kill_switches_active_idx
  ON automation_kill_switches (tenant_id, active, activated_at DESC)
  WHERE active;
COMMENT ON TABLE automation_kill_switches IS
  'Propagation target < 1 min. Activation pauses runs, revokes release tokens and stops connectors.';

-- ---------- row-level security ----------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'marketing_briefs','automation_goals','automation_runs','automation_run_steps',
    'channel_accounts','ad_accounts','social_accounts','ad_campaigns','ad_creatives',
    'ad_budget_policies','ad_budget_spend_daily','email_sequences','email_sends',
    'social_posts','seo_audits','seo_recommendations','influencer_profiles',
    'influencer_campaigns','influencer_outreach','guardrail_evaluations',
    'automation_experiments','automation_metrics_daily','automation_kill_switches'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I '
      || 'USING (tenant_id = current_setting(''app.tenant_id'', true)::uuid) '
      || 'WITH CHECK (tenant_id = current_setting(''app.tenant_id'', true)::uuid)',
      t);
  END LOOP;

  EXECUTE 'ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY';
  EXECUTE 'CREATE POLICY tenant_isolation ON marketing_campaigns '
       || 'USING (tenant_id = current_setting(''app.tenant_id'', true)::uuid) '
       || 'WITH CHECK (tenant_id = current_setting(''app.tenant_id'', true)::uuid)';
END $$;

-- Citus distribution notes (apply on the sharded deployment only):
-- SELECT create_distributed_table('automation_runs', 'tenant_id');
-- SELECT create_distributed_table('automation_run_steps', 'tenant_id');
-- SELECT create_distributed_table('guardrail_evaluations', 'tenant_id');
-- SELECT create_distributed_table('email_sends', 'tenant_id');
-- SELECT create_distributed_table('social_posts', 'tenant_id');
-- SELECT create_distributed_table('ad_budget_spend_daily', 'tenant_id');
-- SELECT create_distributed_table('automation_metrics_daily', 'tenant_id');
-- Reference/replicated: marketing_briefs, automation_goals, channel_accounts,
--   ad_budget_policies, influencer_profiles, automation_kill_switches.
-- NOTE: no trigger publishes, sends, spends or posts. All releases pass through
--   the approval gateway and guardrail service with a variant hash and reason.

COMMIT;
