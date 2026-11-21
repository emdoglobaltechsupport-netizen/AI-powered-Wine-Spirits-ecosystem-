-- =============================================================
-- VINTORA — B2B wholesale domain (Vintora Trade)
-- Source of truth: vintora/11-b2b-wholesale-module.md
-- Extends 0001_initial.sql. Plain PostgreSQL 16; Citus calls commented.
-- All financial rows carry currency + FX provenance. All state rows
-- participate in the append-only audit trail.
-- =============================================================

BEGIN;

-- ---------- extend the Phase 1 B2B account ----------
ALTER TABLE b2b_accounts
  ADD COLUMN IF NOT EXISTS legal_name text,
  ADD COLUMN IF NOT EXISTS kyc_tier text NOT NULL DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS verification_score smallint,
  ADD COLUMN IF NOT EXISTS risk_tier char(1),
  ADD COLUMN IF NOT EXISTS credit_currency char(3) REFERENCES currencies(code),
  ADD COLUMN IF NOT EXISTS credit_used numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS credit_terms text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS b2b_accounts_verification_idx
  ON b2b_accounts (verification_status, kyc_tier);

-- ---------- identity, licences, verification ----------
CREATE TABLE b2b_licences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES b2b_accounts(id),
  jurisdiction char(2) NOT NULL REFERENCES countries(code),
  licence_type text NOT NULL CHECK (licence_type IN
    ('wholesale', 'on-premise', 'off-premise', 'import', 'export', 'bonded', 'manufacturer')),
  licence_number text NOT NULL,
  issuer text,
  valid_from date NOT NULL,
  valid_to date NOT NULL,
  document_uri text,
  verification_state text NOT NULL DEFAULT 'pending',
  verified_by uuid REFERENCES users(id),
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (valid_to >= valid_from)
);
CREATE INDEX b2b_licences_account_idx ON b2b_licences (account_id, jurisdiction);
CREATE INDEX b2b_licences_valid_idx ON b2b_licences (valid_to) WHERE verification_state = 'verified';

CREATE TABLE b2b_trading_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES b2b_accounts(id),
  kind text NOT NULL CHECK (kind IN ('producer', 'supplier', 'distributor', 'buyer')),
  categories text[] NOT NULL DEFAULT '{}',
  territories text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending',
  trust_score smallint,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX b2b_trading_profiles_account_idx ON b2b_trading_profiles (account_id);

CREATE TABLE b2b_verification_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES b2b_accounts(id),
  stage text NOT NULL DEFAULT 'draft',
  score smallint,
  risk_tier char(1),
  checks jsonb NOT NULL DEFAULT '{}'::jsonb,
  decision text,
  decided_by uuid REFERENCES users(id),
  decided_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX b2b_verification_cases_account_idx
  ON b2b_verification_cases (account_id, created_at DESC);

-- ---------- wholesale catalogue and pricing ----------
CREATE TABLE b2b_wholesale_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES b2b_trading_profiles(id),
  sku_id uuid NOT NULL REFERENCES skus(id),
  currency char(3) NOT NULL REFERENCES currencies(code),
  price_per_case numeric(14,2) NOT NULL CHECK (price_per_case > 0),
  tier_breaks jsonb NOT NULL DEFAULT '[]'::jsonb,
  moq_cases integer NOT NULL DEFAULT 1 CHECK (moq_cases > 0),
  incoterm text NOT NULL DEFAULT 'DAP' CHECK (incoterm IN ('DAP', 'DDP', 'FOB', 'CIF')),
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_to timestamptz,
  status text NOT NULL DEFAULT 'active'
);
CREATE INDEX b2b_offers_sku_idx ON b2b_wholesale_offers (sku_id, status);
CREATE INDEX b2b_offers_profile_idx ON b2b_wholesale_offers (profile_id, status);

-- ---------- RFQ, invitations, quotes, negotiation ----------
ALTER TABLE rfqs
  ADD COLUMN IF NOT EXISTS buyer_profile_id uuid REFERENCES b2b_trading_profiles(id),
  ADD COLUMN IF NOT EXISTS closes_at timestamptz,
  ADD COLUMN IF NOT EXISTS target_price_usd numeric(14,2),
  ADD COLUMN IF NOT EXISTS currency char(3) REFERENCES currencies(code),
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS winner_quote_id uuid;

CREATE TABLE b2b_rfq_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id uuid NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
  supplier_profile_id uuid NOT NULL REFERENCES b2b_trading_profiles(id),
  state text NOT NULL DEFAULT 'invited',
  confidential boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (rfq_id, supplier_profile_id)
);

CREATE TABLE b2b_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id uuid NOT NULL REFERENCES rfqs(id),
  supplier_profile_id uuid NOT NULL REFERENCES b2b_trading_profiles(id),
  status text NOT NULL DEFAULT 'open',
  total_usd numeric(14,2) NOT NULL,
  landed_cost_usd numeric(14,2) NOT NULL,
  currency char(3) NOT NULL REFERENCES currencies(code),
  fx_rate numeric(18,8) NOT NULL,
  fx_locked_at timestamptz NOT NULL DEFAULT now(),
  valid_until timestamptz NOT NULL,
  supersedes_id uuid REFERENCES b2b_quotes(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX b2b_quotes_rfq_idx ON b2b_quotes (rfq_id, status);
COMMENT ON TABLE b2b_quotes IS 'Append-only: a revision is a new row with supersedes_id.';

CREATE TABLE b2b_quote_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES b2b_quotes(id) ON DELETE CASCADE,
  rfq_line_id uuid NOT NULL REFERENCES rfq_lines(id),
  sku_id uuid NOT NULL REFERENCES skus(id),
  price_per_case numeric(14,2) NOT NULL CHECK (price_per_case > 0),
  cases integer NOT NULL CHECK (cases > 0),
  incoterm text NOT NULL,
  lead_days integer NOT NULL CHECK (lead_days >= 0),
  moq_cases integer NOT NULL DEFAULT 1,
  landed_cost_per_case numeric(14,2) NOT NULL
);
CREATE INDEX b2b_quote_lines_quote_idx ON b2b_quote_lines (quote_id);

CREATE TABLE b2b_counter_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES b2b_quotes(id),
  round integer NOT NULL CHECK (round > 0),
  proposer_side text NOT NULL CHECK (proposer_side IN ('buyer', 'supplier')),
  price_per_case numeric(14,2) CHECK (price_per_case IS NULL OR price_per_case > 0),
  terms_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'open',
  expires_at timestamptz NOT NULL,
  accepted_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (quote_id, round, proposer_side)
);

-- ---------- credit, purchase orders, inventory ----------
CREATE TABLE b2b_credit_facilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES b2b_accounts(id),
  currency char(3) NOT NULL REFERENCES currencies(code),
  limit_amount numeric(14,2) NOT NULL CHECK (limit_amount > 0),
  used_amount numeric(14,2) NOT NULL DEFAULT 0,
  available_amount numeric(14,2) NOT NULL,
  payment_terms text NOT NULL DEFAULT 'Net 30',
  status text NOT NULL DEFAULT 'active',
  expires_at timestamptz,
  approved_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (available_amount >= 0),
  UNIQUE (account_id, currency)
);

CREATE TABLE b2b_credit_authorisations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL REFERENCES b2b_credit_facilities(id),
  po_id uuid,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  status text NOT NULL DEFAULT 'active',
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX b2b_credit_auth_facility_idx ON b2b_credit_authorisations (facility_id, status);

CREATE TABLE b2b_inventory_lots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku_id uuid NOT NULL REFERENCES skus(id),
  warehouse_id uuid REFERENCES warehouses(id),
  quantity_cases integer NOT NULL CHECK (quantity_cases >= 0),
  reserved_cases integer NOT NULL DEFAULT 0 CHECK (reserved_cases >= 0),
  quarantined_cases integer NOT NULL DEFAULT 0 CHECK (quarantined_cases >= 0),
  bonded boolean NOT NULL DEFAULT false,
  condition_grade text NOT NULL DEFAULT 'A',
  temperature_range text,
  provenance_hash text,
  received_at timestamptz NOT NULL DEFAULT now(),
  CHECK (reserved_cases + quarantined_cases <= quantity_cases)
);
CREATE INDEX b2b_inventory_lots_sku_idx ON b2b_inventory_lots (sku_id, warehouse_id);

CREATE TABLE b2b_inventory_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_id uuid NOT NULL REFERENCES b2b_inventory_lots(id),
  po_id uuid,
  cases integer NOT NULL CHECK (cases > 0),
  status text NOT NULL DEFAULT 'pending',
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX b2b_inventory_reservations_lot_idx ON b2b_inventory_reservations (lot_id, status);

CREATE TABLE b2b_purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id uuid REFERENCES rfqs(id),
  quote_id uuid REFERENCES b2b_quotes(id),
  buyer_account_id uuid NOT NULL REFERENCES b2b_accounts(id),
  supplier_account_id uuid NOT NULL REFERENCES b2b_accounts(id),
  credit_authorisation_id uuid REFERENCES b2b_credit_authorisations(id),
  currency char(3) NOT NULL REFERENCES currencies(code),
  total_amount numeric(14,2) NOT NULL CHECK (total_amount > 0),
  fx_rate numeric(18,8) NOT NULL,
  fx_locked_at timestamptz NOT NULL DEFAULT now(),
  incoterm text NOT NULL,
  payment_terms text NOT NULL,
  allow_partial boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'draft',
  confirmed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (rfq_id IS NOT NULL OR quote_id IS NOT NULL)
);
CREATE INDEX b2b_pos_buyer_idx ON b2b_purchase_orders (buyer_account_id, created_at DESC);
CREATE INDEX b2b_pos_supplier_idx ON b2b_purchase_orders (supplier_account_id, status);
COMMENT ON TABLE b2b_purchase_orders IS 'po.status is written exclusively by the Purchase Order service state machine.';

-- Back-reference the credit hold to its PO (created after both tables exist).
ALTER TABLE b2b_credit_authorisations
  ADD CONSTRAINT b2b_credit_auth_po_fk
  FOREIGN KEY (po_id) REFERENCES b2b_purchase_orders(id);

ALTER TABLE b2b_inventory_reservations
  ADD CONSTRAINT b2b_inventory_res_po_fk
  FOREIGN KEY (po_id) REFERENCES b2b_purchase_orders(id);

CREATE TABLE b2b_po_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id uuid NOT NULL REFERENCES b2b_purchase_orders(id) ON DELETE CASCADE,
  sku_id uuid NOT NULL REFERENCES skus(id),
  lot_id uuid REFERENCES b2b_inventory_lots(id),
  cases integer NOT NULL CHECK (cases > 0),
  price_per_case numeric(14,2) NOT NULL CHECK (price_per_case > 0),
  tax_treatment text NOT NULL DEFAULT 'duty-paid' CHECK (tax_treatment IN ('bonded', 'duty-paid')),
  line_total numeric(14,2) NOT NULL
);
CREATE INDEX b2b_po_lines_po_idx ON b2b_po_lines (po_id);

-- ---------- distributor management ----------
CREATE TABLE b2b_distributor_agreements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_account_id uuid NOT NULL REFERENCES b2b_accounts(id),
  distributor_account_id uuid NOT NULL REFERENCES b2b_accounts(id),
  territories text[] NOT NULL DEFAULT '{}',
  categories text[] NOT NULL DEFAULT '{}',
  exclusivity boolean NOT NULL DEFAULT false,
  minimum_annual_cases integer,
  rebate_schedule jsonb NOT NULL DEFAULT '{}'::jsonb,
  sub_distribution_allowed boolean NOT NULL DEFAULT false,
  document_uri text,
  status text NOT NULL DEFAULT 'proposed',
  valid_from date,
  valid_to date
);
CREATE INDEX b2b_agreements_brand_idx
  ON b2b_distributor_agreements (brand_account_id, status);
CREATE INDEX b2b_agreements_distributor_idx
  ON b2b_distributor_agreements (distributor_account_id, status);

-- Territory exclusivity conflicts are resolved by the Distributor service
-- before quote publication (see 11-b2b-wholesale-module.md §5.2), because
-- array-overlap exclusion constraints cannot express jurisdiction hierarchy.

CREATE TABLE b2b_sub_distributors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id uuid NOT NULL REFERENCES b2b_distributor_agreements(id),
  distributor_account_id uuid NOT NULL REFERENCES b2b_accounts(id),
  territory text NOT NULL,
  status text NOT NULL DEFAULT 'proposed',
  UNIQUE (agreement_id, distributor_account_id, territory)
);

-- ---------- settlement and audit ----------
CREATE TABLE b2b_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id uuid NOT NULL REFERENCES b2b_purchase_orders(id),
  invoice_number text NOT NULL UNIQUE,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  currency char(3) NOT NULL REFERENCES currencies(code),
  due_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'issued',
  matched_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX b2b_invoices_po_idx ON b2b_invoices (po_id);
CREATE INDEX b2b_invoices_due_idx ON b2b_invoices (due_at) WHERE status <> 'paid';

CREATE TABLE b2b_disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id uuid NOT NULL REFERENCES b2b_purchase_orders(id),
  invoice_id uuid REFERENCES b2b_invoices(id),
  reason text NOT NULL CHECK (reason IN
    ('quality', 'quantity', 'condition', 'documentation', 'late_delivery', 'billing')),
  amount_held numeric(14,2),
  evidence_uri text[],
  status text NOT NULL DEFAULT 'open',
  owner_id uuid REFERENCES users(id),
  sla_due_at timestamptz NOT NULL,
  resolution text,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX b2b_disputes_status_idx ON b2b_disputes (status, sla_due_at);

CREATE TABLE b2b_audit_events (
  id bigserial PRIMARY KEY,
  tenant_id uuid NOT NULL,
  actor_id uuid,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  from_state text,
  to_state text,
  reason text,
  trace_id text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX b2b_audit_entity_idx ON b2b_audit_events (entity_type, entity_id, occurred_at DESC);
CREATE INDEX b2b_audit_tenant_idx ON b2b_audit_events (tenant_id, occurred_at DESC);
COMMENT ON TABLE b2b_audit_events IS
  'Append-only. Mirrored to Kafka topic trade.audit.v1. Never UPDATE or DELETE.';

-- Citus distribution notes (apply on the sharded deployment only):
-- SELECT create_distributed_table('b2b_quotes', 'rfq_id');
-- SELECT create_distributed_table('b2b_purchase_orders', 'buyer_account_id');
-- SELECT create_distributed_table('b2b_inventory_lots', 'sku_id');
-- SELECT create_distributed_table('b2b_audit_events', 'tenant_id');
-- Reference tables: b2b_licences, b2b_trading_profiles, b2b_verification_cases,
--                   b2b_distributor_agreements, b2b_credit_facilities.

COMMIT;
