-- =============================================================
-- VINTORA — Global Payments Module
-- Source of truth: vintora/22-global-payments-module.md §§2–5
-- Extends 0001_initial.sql (payments, payment_attempts, refunds)
-- and the conceptual exchange_rates table in 04-database-design.md.
-- Plain PostgreSQL 16; Citus calls commented. Money in minor units
-- with currency + locked-FX provenance. Ledger, webhook inbox,
-- settlement and audit rows are append-only. No raw PAN/CVV here.
-- =============================================================

BEGIN;

-- ---------- extend baseline payments ----------
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS tenant_id uuid NOT NULL
    DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  ADD COLUMN IF NOT EXISTS amount_minor bigint,
  ADD COLUMN IF NOT EXISTS payment_intent_id uuid,
  ADD COLUMN IF NOT EXISTS fx_quote_id uuid,
  ADD COLUMN IF NOT EXISTS payment_token_id uuid,
  ADD COLUMN IF NOT EXISTS processor_reference text,
  ADD COLUMN IF NOT EXISTS routing_decision_id uuid,
  ADD COLUMN IF NOT EXISTS network_token_used boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS settled_at timestamptz;

CREATE INDEX payments_intent_idx ON payments (tenant_id, payment_intent_id);
CREATE INDEX payments_processor_ref_idx
  ON payments (tenant_id, processor, processor_reference);

-- ---------- processor + method registry ----------
CREATE TABLE payment_processors (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             uuid NOT NULL,
  code                  text NOT NULL,
  name                  text NOT NULL,
  processor_type        text NOT NULL CHECK (processor_type IN
                          ('acquirer','wallet','bank_rail','usdc_partner')),
  primary_split_bps     integer NOT NULL DEFAULT 0,
  api_endpoint          text,
  webhook_secret_ref    text,
  status                text NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active','paused','retired')),
  supports_auth_only    boolean NOT NULL DEFAULT true,
  supports_capture      boolean NOT NULL DEFAULT true,
  supports_partial_refund boolean NOT NULL DEFAULT true,
  supports_3ds2         boolean NOT NULL DEFAULT false,
  supports_network_tokens boolean NOT NULL DEFAULT false,
  supports_webhooks     boolean NOT NULL DEFAULT true,
  UNIQUE (tenant_id, code)
);
COMMENT ON TABLE payment_processors IS
  'Adapter registry. Canon: Stripe + Adyen primary 60/40. PayPal/Razorpay additive. Secret values stay in the managed secret store.';

CREATE TABLE payment_methods (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             uuid NOT NULL,
  code                  text NOT NULL,
  label                 text NOT NULL,
  processor_id          uuid NOT NULL REFERENCES payment_processors(id),
  method_type           text NOT NULL CHECK (method_type IN
                          ('card','wallet','bank_transfer','usdc','local')),
  icon_token            text,
  requires_3ds          boolean NOT NULL DEFAULT false,
  supports_partial_refund boolean NOT NULL DEFAULT true,
  status                text NOT NULL DEFAULT 'active',
  UNIQUE (tenant_id, code)
);

CREATE TABLE payment_method_availability (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             uuid NOT NULL,
  method_id             uuid NOT NULL REFERENCES payment_methods(id) ON DELETE CASCADE,
  market                text NOT NULL,
  currency_code         char(3),
  min_amount_minor      bigint NOT NULL DEFAULT 0,
  max_amount_minor      bigint,
  age_min               integer,
  requires_kyc          boolean NOT NULL DEFAULT false,
  enabled               boolean NOT NULL DEFAULT true,
  effective_from        timestamptz NOT NULL DEFAULT now(),
  effective_to          timestamptz,
  UNIQUE (tenant_id, method_id, market, currency_code, effective_from)
);
CREATE INDEX payment_method_availability_lookup_idx
  ON payment_method_availability (tenant_id, market, currency_code, enabled);

-- ---------- FX ----------
CREATE TABLE fx_quotes (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             uuid NOT NULL,
  cart_id               uuid,
  order_id              uuid,
  base_code             char(3) NOT NULL,
  quote_code            char(3) NOT NULL,
  rate                  numeric(20,10) NOT NULL CHECK (rate > 0),
  source_rate           numeric(20,10),
  margin_bps            integer NOT NULL DEFAULT 0,
  base_amount_minor     bigint NOT NULL,
  quote_amount_minor    bigint NOT NULL,
  rate_locked_at        timestamptz NOT NULL DEFAULT now(),
  expires_at            timestamptz NOT NULL,
  status                text NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active','used','expired','cancelled')),
  trace_id              text,
  CHECK (expires_at > rate_locked_at)
);
CREATE INDEX fx_quotes_cart_idx
  ON fx_quotes (tenant_id, cart_id, status, expires_at DESC);
COMMENT ON TABLE fx_quotes IS
  'Canonical 15-minute locked rate. No authorization or capture against an expired quote.';

CREATE TABLE fx_hedges (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             uuid NOT NULL,
  fx_quote_id           uuid NOT NULL REFERENCES fx_quotes(id),
  hedge_reference       text,
  instrument            text,
  notional_minor        bigint NOT NULL,
  currency_code         char(3) NOT NULL,
  hedged_rate           numeric(20,10),
  hedged_at             timestamptz NOT NULL DEFAULT now(),
  created_by            text
);

-- ---------- intents, routing, tokens, 3DS, retries ----------
CREATE TABLE payment_intents (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             uuid NOT NULL,
  user_id               uuid NOT NULL,
  order_id              uuid,
  cart_id               uuid,
  method_id             uuid REFERENCES payment_methods(id),
  fx_quote_id           uuid REFERENCES fx_quotes(id),
  amount_minor          bigint NOT NULL CHECK (amount_minor > 0),
  currency_code         char(3) NOT NULL,
  status                text NOT NULL DEFAULT 'created'
                          CHECK (status IN ('created','method_selected','requires_action',
                                            'authorized','captured','settled','refunded',
                                            'failed','cancelled','disputed')),
  idempotency_key       text NOT NULL,
  processor_reference   text,
  age_checked_at        timestamptz,
  kyc_checked_at        timestamptz,
  licence_checked_at    timestamptz,
  risk_score            numeric(5,4),
  trace_id              text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, idempotency_key)
);
CREATE INDEX payment_intents_user_idx
  ON payment_intents (tenant_id, user_id, status, created_at DESC);
CREATE INDEX payment_intents_order_idx ON payment_intents (tenant_id, order_id);
COMMENT ON TABLE payment_intents IS
  'One intent per checkout. Idempotency key is reused across all retries and webhooks.';

CREATE TABLE payment_routing_decisions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             uuid NOT NULL,
  payment_intent_id     uuid NOT NULL REFERENCES payment_intents(id) ON DELETE CASCADE,
  processor_id          uuid NOT NULL REFERENCES payment_processors(id),
  rank                  integer NOT NULL CHECK (rank > 0),
  reason_json           jsonb NOT NULL DEFAULT '{}'::jsonb,
  success_rate_estimate numeric(5,4),
  cost_estimate_minor   bigint,
  decided_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX payment_routing_decisions_intent_idx
  ON payment_routing_decisions (tenant_id, payment_intent_id, rank);

CREATE TABLE payment_tokens (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             uuid NOT NULL,
  user_id               uuid NOT NULL,
  processor_id          uuid NOT NULL REFERENCES payment_processors(id),
  token_reference       text NOT NULL,
  token_type            text NOT NULL CHECK (token_type IN
                          ('network','processor','wallet','bank_account')),
  brand                 text,
  last4                 char(4),
  expiry_month          smallint,
  expiry_year           smallint,
  status                text NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active','suspended','deleted')),
  created_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, processor_id, token_reference)
);
COMMENT ON TABLE payment_tokens IS
  'Opaque token references only. Raw PAN/CVV never stored in Vintora systems.';

CREATE TABLE three_ds_authentications (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             uuid NOT NULL,
  payment_intent_id     uuid NOT NULL REFERENCES payment_intents(id) ON DELETE CASCADE,
  version               text NOT NULL DEFAULT '2.2',
  flow                  text NOT NULL CHECK (flow IN ('frictionless','challenge')),
  sca_required          boolean NOT NULL DEFAULT false,
  challenge_type        text,
  result                text NOT NULL DEFAULT 'pending'
                          CHECK (result IN ('pending','authenticated','failed','rejected','timeout')),
  liability_shift       boolean NOT NULL DEFAULT false,
  acs_reference         text,
  attempted_at          timestamptz NOT NULL DEFAULT now(),
  completed_at          timestamptz
);
CREATE INDEX three_ds_intent_idx
  ON three_ds_authentications (tenant_id, payment_intent_id, attempted_at DESC);

CREATE TABLE payment_retries (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             uuid NOT NULL,
  payment_intent_id     uuid NOT NULL REFERENCES payment_intents(id) ON DELETE CASCADE,
  attempt_no            smallint NOT NULL CHECK (attempt_no > 0),
  processor_id          uuid REFERENCES payment_processors(id),
  strategy              text NOT NULL CHECK (strategy IN
                          ('network_token','issuer_cascade','processor_cascade','fixed_delay')),
  trigger_decline_code  text,
  scheduled_at          timestamptz,
  executed_at           timestamptz,
  result                text,
  latency_ms            integer,
  UNIQUE (tenant_id, payment_intent_id, attempt_no)
);

-- ---------- double-entry ledger ----------
CREATE TABLE ledger_accounts (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             uuid NOT NULL,
  code                  text NOT NULL,
  name                  text NOT NULL,
  account_type          text NOT NULL CHECK (account_type IN
                          ('asset','liability','revenue','expense','clearing')),
  currency_code         char(3) NOT NULL,
  parent_code           text,
  active                boolean NOT NULL DEFAULT true,
  UNIQUE (tenant_id, code, currency_code)
);

CREATE TABLE ledger_postings (
  id                    bigserial PRIMARY KEY,
  tenant_id             uuid NOT NULL,
  posting_group         uuid NOT NULL,
  account_id            uuid NOT NULL REFERENCES ledger_accounts(id),
  direction             text NOT NULL CHECK (direction IN ('debit','credit')),
  amount_minor          bigint NOT NULL CHECK (amount_minor >= 0),
  currency_code         char(3) NOT NULL,
  payment_intent_id     uuid REFERENCES payment_intents(id),
  payment_id            uuid REFERENCES payments(id),
  settlement_id         uuid,
  event_type            text NOT NULL CHECK (event_type IN
                          ('authorization','capture','commission','processing_fee',
                           'tax','shipping','fx_spread','refund','chargeback','payout')),
  idempotency_key       text NOT NULL,
  posted_at             timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, idempotency_key)
);
CREATE INDEX ledger_postings_group_idx
  ON ledger_postings (tenant_id, posting_group, posted_at);
CREATE INDEX ledger_postings_account_idx
  ON ledger_postings (tenant_id, account_id, posted_at DESC);
COMMENT ON TABLE ledger_postings IS
  'Append-only double-entry. Every posting_group must balance debits = credits. Refunds are reversing postings.';

-- ---------- settlement, reconciliation, disputes, payouts ----------
CREATE TABLE payment_settlements (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             uuid NOT NULL,
  processor_id          uuid NOT NULL REFERENCES payment_processors(id),
  processor_batch_ref   text NOT NULL,
  settlement_date       date NOT NULL,
  currency_code         char(3) NOT NULL,
  gross_minor           bigint NOT NULL,
  fees_minor            bigint NOT NULL,
  net_minor             bigint NOT NULL,
  status                text NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending','matched','reconciled','failed')),
  received_at           timestamptz,
  UNIQUE (tenant_id, processor_id, processor_batch_ref, settlement_date)
);
CREATE INDEX payment_settlements_date_idx
  ON payment_settlements (tenant_id, processor_id, settlement_date DESC);

CREATE TABLE settlement_reconciliations (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             uuid NOT NULL,
  settlement_id         uuid NOT NULL REFERENCES payment_settlements(id) ON DELETE CASCADE,
  expected_minor        bigint NOT NULL,
  actual_minor          bigint NOT NULL,
  variance_minor        bigint NOT NULL,
  status                text NOT NULL CHECK (status IN ('matched','break_open','resolved')),
  break_reason          text,
  resolved_by           uuid,
  resolved_at           timestamptz,
  checked_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX settlement_reconciliations_breaks_idx
  ON settlement_reconciliations (tenant_id, status, checked_at DESC)
  WHERE status = 'break_open';

CREATE TABLE chargebacks (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             uuid NOT NULL,
  payment_intent_id     uuid NOT NULL REFERENCES payment_intents(id),
  processor_case_id     text NOT NULL,
  reason_code           text,
  amount_minor          bigint NOT NULL,
  currency_code         char(3) NOT NULL,
  status                text NOT NULL DEFAULT 'open'
                          CHECK (status IN ('open','responding','won','lost','closed')),
  due_at                timestamptz,
  evidence_object_keys  text[] NOT NULL DEFAULT '{}',
  representative        text,
  outcome               text,
  opened_at             timestamptz NOT NULL DEFAULT now(),
  resolved_at           timestamptz,
  UNIQUE (tenant_id, processor_case_id)
);
CREATE INDEX chargebacks_due_idx
  ON chargebacks (tenant_id, status, due_at) WHERE status IN ('open','responding');

CREATE TABLE payment_payouts (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             uuid NOT NULL,
  seller_id             uuid NOT NULL,
  settlement_id         uuid REFERENCES payment_settlements(id),
  amount_minor          bigint NOT NULL CHECK (amount_minor >= 0),
  currency_code         char(3) NOT NULL,
  rail                  text NOT NULL CHECK (rail IN ('sepa','sepa_instant','ach','wire','processor','usdc')),
  status                text NOT NULL DEFAULT 'scheduled'
                          CHECK (status IN ('scheduled','on_hold','processing','paid','failed','cancelled')),
  hold_reason           text,
  processor_reference   text,
  approval_id           uuid,
  scheduled_at          timestamptz,
  paid_at               timestamptz
);
CREATE INDEX payment_payouts_seller_idx
  ON payment_payouts (tenant_id, seller_id, status, scheduled_at DESC);

-- ---------- webhook inbox + audit ----------
CREATE TABLE processor_webhook_events (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             uuid NOT NULL,
  processor_id          uuid NOT NULL REFERENCES payment_processors(id),
  event_id              text NOT NULL,
  event_type            text NOT NULL,
  signature_verified    boolean NOT NULL DEFAULT false,
  payload_json          jsonb NOT NULL,
  status                text NOT NULL DEFAULT 'received'
                          CHECK (status IN ('received','applied','ignored','failed')),
  applied_at            timestamptz,
  received_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE (processor_id, event_id)
);
CREATE INDEX processor_webhook_events_received_idx
  ON processor_webhook_events (tenant_id, status, received_at DESC);
COMMENT ON TABLE processor_webhook_events IS
  'Exactly-once webhook inbox. Signature verified before any state change.';

CREATE TABLE payment_audit_events (
  id                    bigserial PRIMARY KEY,
  tenant_id             uuid NOT NULL,
  payment_intent_id     uuid REFERENCES payment_intents(id),
  entity_type           text NOT NULL,
  entity_id             text,
  action                text NOT NULL,
  from_value            jsonb,
  to_value              jsonb,
  actor                 text NOT NULL,
  reason                text,
  trace_id              text,
  occurred_at           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX payment_audit_events_entity_idx
  ON payment_audit_events (tenant_id, entity_type, entity_id, occurred_at DESC);

-- ---------- row-level security ----------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'payment_processors','payment_methods','payment_method_availability',
    'fx_quotes','fx_hedges','payment_intents','payment_routing_decisions',
    'payment_tokens','three_ds_authentications','payment_retries',
    'ledger_accounts','ledger_postings','payment_settlements',
    'settlement_reconciliations','chargebacks','payment_payouts',
    'processor_webhook_events','payment_audit_events'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I '
      || 'USING (tenant_id = current_setting(''app.tenant_id'', true)::uuid) '
      || 'WITH CHECK (tenant_id = current_setting(''app.tenant_id'', true)::uuid)',
      t);
  END LOOP;

  EXECUTE 'ALTER TABLE payments ENABLE ROW LEVEL SECURITY';
  EXECUTE 'CREATE POLICY tenant_isolation ON payments '
       || 'USING (tenant_id = current_setting(''app.tenant_id'', true)::uuid) '
       || 'WITH CHECK (tenant_id = current_setting(''app.tenant_id'', true)::uuid)';
END $$;

-- Citus distribution notes (apply on the sharded deployment only):
-- SELECT create_distributed_table('payment_intents', 'tenant_id');
-- SELECT create_distributed_table('ledger_postings', 'tenant_id');
-- SELECT create_distributed_table('payment_settlements', 'tenant_id');
-- SELECT create_distributed_table('chargebacks', 'tenant_id');
-- SELECT create_distributed_table('payment_payouts', 'tenant_id');
-- SELECT create_distributed_table('payment_audit_events', 'tenant_id');
-- Reference/replicated: payment_processors, payment_methods, ledger_accounts,
--   fx_quotes (short-lived, can be reference with TTL).
-- NOTE: this schema contains no PAN/CVV columns. Tokenization happens in the
--   separate PCI-scoped vault service; no trigger here contacts a processor.

COMMIT;
