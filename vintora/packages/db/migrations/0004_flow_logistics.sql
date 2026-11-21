-- =============================================================
-- VINTORA — Logistics domain (Vintora Flow)
-- Source of truth: vintora/16-logistics-delivery-module.md §§2–3
-- Extends 0001_initial.sql (carriers, shipments, shipping_events,
-- warehouses, warehouse_telemetry). Plain PostgreSQL 16; Citus and
-- TimescaleDB calls commented for the sharded deployment.
-- =============================================================

BEGIN;

-- ---------- extend the baseline shipment ----------
ALTER TABLE shipments
  ADD COLUMN IF NOT EXISTS incoterm text DEFAULT 'DAP'
    CHECK (incoterm IN ('DAP', 'DDP', 'FOB', 'CIF')),
  ADD COLUMN IF NOT EXISTS route_plan_id uuid,
  ADD COLUMN IF NOT EXISTS customs_status text NOT NULL DEFAULT 'not_required',
  ADD COLUMN IF NOT EXISTS tax_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS risk_score numeric(5,4),
  ADD COLUMN IF NOT EXISTS eta_at timestamptz,
  ADD COLUMN IF NOT EXISTS insurance_policy_id uuid,
  ADD COLUMN IF NOT EXISTS temperature_band text,
  ADD COLUMN IF NOT EXISTS idempotency_key text;

CREATE UNIQUE INDEX IF NOT EXISTS shipments_idempotency_idx
  ON shipments (idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX shipments_status_idx ON shipments (status, eta_at);
CREATE INDEX shipments_tracking_idx ON shipments (tracking_number)
  WHERE tracking_number IS NOT NULL;

-- ---------- carrier master data (referenced by the baseline design) ----------
CREATE TABLE IF NOT EXISTS carriers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL UNIQUE,
  code          text NOT NULL UNIQUE,
  country_code  char(2) REFERENCES countries(code),
  active        boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ---------- carrier integrations and rates ----------
CREATE TABLE carrier_integrations (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL,
  carrier_id       uuid NOT NULL REFERENCES carriers(id),
  adapter          text NOT NULL CHECK (adapter IN
                     ('parcel', 'freight', 'forwarder', 'last_mile')),
  credential_ref   text NOT NULL,          -- vault reference, never a secret
  capabilities     jsonb NOT NULL DEFAULT '{}'::jsonb,
  endpoint_region  text,
  status           text NOT NULL DEFAULT 'active',
  health           text NOT NULL DEFAULT 'unknown',
  last_check_at    timestamptz,
  UNIQUE (tenant_id, carrier_id, adapter)
);
COMMENT ON COLUMN carrier_integrations.credential_ref IS
  'HashiCorp-style vault reference. Secrets must never be stored in this table.';

CREATE TABLE shipping_rates (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL,
  carrier_id       uuid NOT NULL REFERENCES carriers(id),
  service_level    text NOT NULL,
  origin_country   char(2) NOT NULL,
  destination_country char(2) NOT NULL,
  destination_zone text,
  weight_from_kg   numeric(10,2) NOT NULL DEFAULT 0,
  weight_to_kg     numeric(10,2) NOT NULL,
  volume_from_m3   numeric(10,3) NOT NULL DEFAULT 0,
  volume_to_m3     numeric(10,3) NOT NULL,
  price_minor      bigint NOT NULL CHECK (price_minor >= 0),
  currency_code    char(3) NOT NULL REFERENCES currencies(code),
  transit_days_min integer NOT NULL,
  transit_days_max integer NOT NULL,
  supports_temperature boolean NOT NULL DEFAULT false,
  valid_from       timestamptz NOT NULL DEFAULT now(),
  valid_to         timestamptz,
  CHECK (weight_to_kg >= weight_from_kg AND volume_to_m3 >= volume_from_m3)
);
CREATE INDEX shipping_rates_lane_idx
  ON shipping_rates (tenant_id, carrier_id, origin_country, destination_country,
                     valid_from, valid_to);

-- ---------- route planning ----------
CREATE TABLE route_plans (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL,
  shipment_id      uuid NOT NULL REFERENCES shipments(id),
  revision         integer NOT NULL DEFAULT 1,
  modes            text[] NOT NULL DEFAULT '{}',
  cost_minor       bigint NOT NULL,
  currency_code    char(3) NOT NULL REFERENCES currencies(code),
  eta_at           timestamptz NOT NULL,
  risk_score       numeric(5,4) NOT NULL CHECK (risk_score BETWEEN 0 AND 1),
  score            numeric(8,4) NOT NULL,
  rationale_json   jsonb NOT NULL DEFAULT '{}'::jsonb,
  chosen           boolean NOT NULL DEFAULT false,
  model_version    text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shipment_id, revision)
);
COMMENT ON TABLE route_plans IS 'Append-only. A re-plan creates a new revision.';

CREATE TABLE shipment_legs (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL,
  shipment_id      uuid NOT NULL REFERENCES shipments(id),
  route_plan_id    uuid REFERENCES route_plans(id),
  seq              integer NOT NULL CHECK (seq > 0),
  mode             text NOT NULL CHECK (mode IN ('air', 'sea', 'road', 'rail')),
  carrier_id       uuid REFERENCES carriers(id),
  from_location    text NOT NULL,
  to_location      text NOT NULL,
  depart_at        timestamptz,
  arrive_at        timestamptz,
  temperature_band text,
  status           text NOT NULL DEFAULT 'planned',
  UNIQUE (shipment_id, route_plan_id, seq)
);
CREATE INDEX shipment_legs_plan_idx ON shipment_legs (tenant_id, route_plan_id, seq);

-- ---------- warehouse operations ----------
CREATE TABLE storage_zones (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL,
  warehouse_id     uuid NOT NULL REFERENCES warehouses(id),
  zone_code        text NOT NULL,
  temperature_band text NOT NULL,
  bonded           boolean NOT NULL DEFAULT false,
  capacity_cases   integer NOT NULL CHECK (capacity_cases >= 0),
  occupied_cases   integer NOT NULL DEFAULT 0 CHECK (occupied_cases >= 0),
  status           text NOT NULL DEFAULT 'active',
  UNIQUE (tenant_id, warehouse_id, zone_code),
  CHECK (occupied_cases <= capacity_cases)
);

CREATE TABLE pick_tasks (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL,
  warehouse_id     uuid NOT NULL REFERENCES warehouses(id),
  shipment_id      uuid NOT NULL REFERENCES shipments(id),
  zone_id          uuid REFERENCES storage_zones(id),
  sku_id           uuid NOT NULL REFERENCES skus(id),
  lot_code         text,
  cases            integer NOT NULL CHECK (cases > 0),
  status           text NOT NULL DEFAULT 'created'
                     CHECK (status IN ('created', 'assigned', 'picked', 'packed',
                                       'cancelled', 'exception')),
  picked_at        timestamptz,
  picker_id        uuid REFERENCES users(id),
  condition_photo_uri text,
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX pick_tasks_warehouse_idx
  ON pick_tasks (tenant_id, warehouse_id, status, created_at);

-- ---------- customs ----------
CREATE TABLE customs_declarations (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL,
  shipment_id      uuid NOT NULL REFERENCES shipments(id),
  declaration_no   text,
  hs_codes         text[] NOT NULL DEFAULT '{}',
  hs_confidence    numeric(5,4),
  declared_value_minor bigint NOT NULL,
  currency_code    char(3) NOT NULL REFERENCES currencies(code),
  broker_id        uuid,
  status           text NOT NULL DEFAULT 'draft'
                     CHECK (status IN ('draft', 'review', 'filed', 'held',
                                       'cleared', 'rejected', 'rework', 'not_required')),
  submitted_at     timestamptz,
  cleared_at       timestamptz,
  reviewed_by      uuid REFERENCES users(id),
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX customs_declarations_queue_idx
  ON customs_declarations (tenant_id, status, created_at);

CREATE TABLE customs_documents (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL,
  declaration_id   uuid NOT NULL REFERENCES customs_declarations(id) ON DELETE CASCADE,
  doc_type         text NOT NULL CHECK (doc_type IN
                     ('commercial_invoice', 'packing_list', 'certificate_of_origin',
                      'licence', 'insurance_certificate', 'other')),
  s3_uri           text NOT NULL,
  content_hash     text NOT NULL,
  status           text NOT NULL DEFAULT 'generated',
  uploaded_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX customs_documents_declaration_idx
  ON customs_documents (tenant_id, declaration_id, doc_type);

-- ---------- tax automation ----------
CREATE TABLE tax_rules (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL,
  jurisdiction     text NOT NULL,
  tax_type         text NOT NULL CHECK (tax_type IN ('vat', 'gst', 'excise', 'duty', 'handling')),
  rule_json        jsonb NOT NULL,
  source           text,
  effective_from   date NOT NULL,
  effective_to     date,
  approved_by      uuid REFERENCES users(id),
  created_at       timestamptz NOT NULL DEFAULT now(),
  CHECK (effective_to IS NULL OR effective_to >= effective_from)
);
CREATE INDEX tax_rules_lookup_idx
  ON tax_rules (tenant_id, jurisdiction, tax_type, effective_from, effective_to);

CREATE TABLE tax_assessments (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL,
  shipment_id      uuid NOT NULL REFERENCES shipments(id),
  jurisdiction     text NOT NULL,
  tax_type         text NOT NULL,
  rate             numeric(10,6) NOT NULL,
  amount_minor     bigint NOT NULL,
  currency_code    char(3) NOT NULL REFERENCES currencies(code),
  tax_inclusive    boolean NOT NULL DEFAULT false,
  liability_party  text NOT NULL CHECK (liability_party IN ('shipper', 'consignee')),
  rule_id          uuid REFERENCES tax_rules(id),
  rule_version     text,
  fx_rate          numeric(18,8),
  fx_locked_at     timestamptz,
  status           text NOT NULL DEFAULT 'assessed',
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX tax_assessments_shipment_idx
  ON tax_assessments (tenant_id, shipment_id, tax_type);
COMMENT ON TABLE tax_assessments IS
  'Append-only. Corrections are new rows with a new rule_version, never UPDATE.';

-- ---------- exceptions, insurance and claims ----------
CREATE TABLE delivery_exceptions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL,
  shipment_id      uuid NOT NULL REFERENCES shipments(id),
  exception_type   text NOT NULL CHECK (exception_type IN
                     ('delay', 'temperature', 'route_deviation',
                      'failed_delivery', 'documentation', 'damage')),
  severity         text NOT NULL CHECK (severity IN ('info', 'warn', 'critical')),
  detected_at      timestamptz NOT NULL DEFAULT now(),
  status           text NOT NULL DEFAULT 'open',
  owner_id         uuid REFERENCES users(id),
  resolution       text,
  resolved_at      timestamptz
);
CREATE INDEX delivery_exceptions_open_idx
  ON delivery_exceptions (tenant_id, status, detected_at DESC) WHERE status = 'open';

CREATE TABLE insurance_policies (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL,
  shipment_id      uuid NOT NULL REFERENCES shipments(id),
  provider         text NOT NULL,
  insured_value_minor bigint NOT NULL CHECK (insured_value_minor > 0),
  currency_code    char(3) NOT NULL REFERENCES currencies(code),
  rate             numeric(6,5) NOT NULL CHECK (rate BETWEEN 0.003 AND 0.012),
  premium_minor    bigint NOT NULL,
  risk_score       numeric(5,4),
  status           text NOT NULL DEFAULT 'quoted'
                     CHECK (status IN ('quoted', 'bound', 'cancelled', 'expired')),
  bound_at         timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, shipment_id)
);

-- Back-reference the chosen plan/policy on the shipment.
ALTER TABLE shipments
  ADD CONSTRAINT shipments_route_plan_fk
  FOREIGN KEY (route_plan_id) REFERENCES route_plans(id),
  ADD CONSTRAINT shipments_insurance_policy_fk
  FOREIGN KEY (insurance_policy_id) REFERENCES insurance_policies(id);

CREATE TABLE claims (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL,
  shipment_id      uuid NOT NULL REFERENCES shipments(id),
  policy_id        uuid REFERENCES insurance_policies(id),
  reason           text NOT NULL CHECK (reason IN
                     ('temperature', 'damage', 'loss', 'delay', 'documentation')),
  amount_minor     bigint NOT NULL CHECK (amount_minor >= 0),
  currency_code    char(3) NOT NULL REFERENCES currencies(code),
  evidence_uri     text[] NOT NULL DEFAULT '{}',
  status           text NOT NULL DEFAULT 'open'
                     CHECK (status IN ('open', 'review', 'approved', 'rejected', 'paid')),
  owner_id         uuid REFERENCES users(id),
  resolution       text,
  decided_at       timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX claims_status_idx ON claims (tenant_id, status, created_at);

-- ---------- telemetry excursion alerts ----------
CREATE TABLE telemetry_excursions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL,
  shipment_id      uuid REFERENCES shipments(id),
  warehouse_id     uuid REFERENCES warehouses(id),
  sensor_id        text NOT NULL,
  observed_c       numeric(5,2) NOT NULL,
  threshold_c      numeric(5,2) NOT NULL,
  duration_minutes integer NOT NULL,
  severity         text NOT NULL DEFAULT 'warn',
  status           text NOT NULL DEFAULT 'open',
  detected_at      timestamptz NOT NULL DEFAULT now(),
  acknowledged_by  uuid REFERENCES users(id)
);
CREATE INDEX telemetry_excursions_open_idx
  ON telemetry_excursions (tenant_id, status, detected_at DESC) WHERE status = 'open';

-- ---------- row-level security ----------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'carrier_integrations', 'shipping_rates', 'route_plans', 'shipment_legs',
    'storage_zones', 'pick_tasks', 'customs_declarations', 'customs_documents',
    'tax_rules', 'tax_assessments', 'delivery_exceptions', 'insurance_policies',
    'claims', 'telemetry_excursions'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING (tenant_id = current_setting(''app.tenant_id'', true)::uuid) WITH CHECK (tenant_id = current_setting(''app.tenant_id'', true)::uuid)',
      t);
  END LOOP;
END $$;

-- Citus distribution notes (apply on the sharded deployment only):
-- SELECT create_distributed_table('shipping_rates', 'tenant_id');
-- SELECT create_distributed_table('route_plans', 'tenant_id');
-- SELECT create_distributed_table('shipment_legs', 'tenant_id');
-- SELECT create_distributed_table('pick_tasks', 'tenant_id');
-- SELECT create_distributed_table('customs_declarations', 'tenant_id');
-- SELECT create_distributed_table('tax_assessments', 'tenant_id');
-- SELECT create_distributed_table('delivery_exceptions', 'tenant_id');
-- Reference tables: carrier_integrations, carriers, tax_rules, storage_zones.
--
-- TimescaleDB notes: warehouse_telemetry and device_telemetry are already
-- hypertables in 0001_initial.sql. Add an in-transit telemetry hypertable
-- keyed on (time) with 1-day chunks, 7-day compression and 2-year retention.

COMMIT;
