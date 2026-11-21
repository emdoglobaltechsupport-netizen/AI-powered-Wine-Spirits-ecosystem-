-- Vintora Africa Marketplace schema (PostgreSQL 15+ / Supabase).
-- Apply with: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f sql/africa_marketplace.sql
-- Internal expansion of Vintora Market. RLS enabled with no public policies.
-- Nulls are intentional: no product fact, price, barcode, award or image URL is generated.

CREATE TABLE IF NOT EXISTS am_currencies (
  code         char(3) PRIMARY KEY,
  name         text NOT NULL,
  minor_units  integer NOT NULL DEFAULT 2 CHECK (minor_units BETWEEN 0 AND 4),
  fx_source    text,
  active       boolean NOT NULL DEFAULT true,
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS am_languages (
  code     text PRIMARY KEY,
  name     text NOT NULL,
  locale   text NOT NULL,
  rtl      boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS am_countries (
  country_code             text PRIMARY KEY,
  name                     text NOT NULL,
  region                   text,
  currency_code            char(3) NOT NULL REFERENCES am_currencies(code),
  default_language_code    text REFERENCES am_languages(code),
  age_gate_required        boolean NOT NULL DEFAULT true,
  regulatory_profile       text NOT NULL DEFAULT 'local_counsel_review_required',
  regulator_reference      text,
  compliance_review_required boolean NOT NULL DEFAULT true,
  active                   boolean NOT NULL DEFAULT false,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS am_country_languages (
  country_code  text NOT NULL REFERENCES am_countries(country_code) ON DELETE CASCADE,
  language_code text NOT NULL REFERENCES am_languages(code),
  is_default    boolean NOT NULL DEFAULT false,
  PRIMARY KEY (country_code, language_code)
);

CREATE TABLE IF NOT EXISTS am_payment_gateways (
  code              text PRIMARY KEY,
  name              text NOT NULL,
  countries         text[] NOT NULL DEFAULT '{}',
  currencies        text[] NOT NULL DEFAULT '{}',
  integration_status text NOT NULL DEFAULT 'candidate_not_integrated'
    CHECK (integration_status IN ('candidate_not_integrated', 'integration_required', 'sandbox', 'live')),
  credential_env    text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS am_brands (
  brand_id              text PRIMARY KEY,
  brand_name            text NOT NULL,
  category_hint         text,
  origin_hint           text,
  source_group          text,
  is_brand              boolean NOT NULL DEFAULT true,
  needs_brand_resolution boolean NOT NULL DEFAULT false,
  verification_status   text NOT NULL DEFAULT 'candidate'
    CHECK (verification_status IN ('candidate', 'identity_verified', 'rights_verified', 'asset_review', 'approved', 'rejected')),
  official_website      text,
  source                text,
  source_url            text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS am_product_templates (
  template_id    text PRIMARY KEY,
  brand_id       text NOT NULL REFERENCES am_brands(brand_id),
  brand_name     text NOT NULL,
  category_hint  text,
  listing_status text NOT NULL DEFAULT 'draft_template'
    CHECK (listing_status IN ('draft_template', 'source_attached', 'data_validation', 'compliance_review', 'asset_moderation', 'approved', 'rejected')),
  template       jsonb NOT NULL DEFAULT '{}'::jsonb,
  search_document text GENERATED ALWAYS AS (
    coalesce(template->>'brand_name', '') || ' ' || coalesce(template->>'category', '')
  ) STORED,
  search_tsv     tsvector GENERATED ALWAYS AS (
    to_tsvector('english'::regconfig,
      coalesce(template->>'brand_name', '') || ' ' || coalesce(template->>'category', ''))
  ) STORED,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS am_products (
  product_id             text PRIMARY KEY,
  brand_id               text REFERENCES am_brands(brand_id),
  sku                    text UNIQUE,
  category               text NOT NULL,
  subcategory            text,
  country_of_origin      text,
  region                 text,
  abv_pct                numeric(5,2) CHECK (abv_pct IS NULL OR abv_pct BETWEEN 0 AND 100),
  bottle_size_ml         integer CHECK (bottle_size_ml IS NULL OR bottle_size_ml > 0),
  product_description    text,
  tasting_notes          text,
  food_pairings          text[] NOT NULL DEFAULT '{}',
  awards                 jsonb NOT NULL DEFAULT '[]'::jsonb,
  barcode                text CHECK (barcode IS NULL OR barcode ~ '^\d{8,14}$'),
  official_website       text,
  official_product_url   text,
  official_images        jsonb NOT NULL DEFAULT '[]'::jsonb,
  lifestyle_images       jsonb NOT NULL DEFAULT '[]'::jsonb,
  seo_metadata           jsonb NOT NULL DEFAULT '{}'::jsonb,
  ai_recommendation_tags text[] NOT NULL DEFAULT '{}',
  listing_status         text NOT NULL DEFAULT 'draft'
    CHECK (listing_status IN ('draft', 'source_attached', 'data_validation', 'compliance_review', 'asset_moderation', 'approved', 'published', 'rejected')),
  provenance             jsonb NOT NULL DEFAULT '{}'::jsonb,
  search_document        text NOT NULL DEFAULT '',
  search_tsv             tsvector GENERATED ALWAYS AS (
    to_tsvector('english'::regconfig, coalesce(search_document, ''))
  ) STORED,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT am_products_images_arrays CHECK (
    jsonb_typeof(official_images) = 'array' AND jsonb_typeof(lifestyle_images) = 'array'
  )
);

CREATE TABLE IF NOT EXISTS am_product_country_availability (
  product_id          text NOT NULL REFERENCES am_products(product_id) ON DELETE CASCADE,
  country_code        text NOT NULL REFERENCES am_countries(country_code),
  availability_status text NOT NULL DEFAULT 'unverified'
    CHECK (availability_status IN ('unverified', 'available', 'restricted', 'unavailable')),
  legal_review_status text NOT NULL DEFAULT 'pending'
    CHECK (legal_review_status IN ('pending', 'approved', 'rejected')),
  evidence            text,
  last_synced_at      timestamptz,
  PRIMARY KEY (product_id, country_code)
);

CREATE TABLE IF NOT EXISTS am_prices (
  price_id      bigserial PRIMARY KEY,
  product_id    text NOT NULL REFERENCES am_products(product_id) ON DELETE CASCADE,
  country_code  text REFERENCES am_countries(country_code),
  price_type    text NOT NULL CHECK (price_type IN ('wholesale', 'retail', 'distributor', 'african_market')),
  currency_code char(3) NOT NULL REFERENCES am_currencies(code),
  amount        numeric(14,2) CHECK (amount IS NULL OR amount >= 0),
  effective_from timestamptz,
  effective_to   timestamptz,
  source        text,
  source_url    text,
  provenance    jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS am_tax_rules (
  tax_rule_id     bigserial PRIMARY KEY,
  country_code    text NOT NULL REFERENCES am_countries(country_code),
  tax_type        text NOT NULL,
  rate            numeric(7,4) CHECK (rate IS NULL OR rate >= 0),
  source          text,
  source_url      text,
  review_status   text NOT NULL DEFAULT 'pending'
    CHECK (review_status IN ('pending', 'approved', 'rejected')),
  effective_from  timestamptz,
  effective_to    timestamptz
);

CREATE TABLE IF NOT EXISTS am_distributors (
  distributor_id  text PRIMARY KEY,
  legal_name      text NOT NULL,
  trading_name    text,
  country_code    text NOT NULL REFERENCES am_countries(country_code),
  kyc_status      text NOT NULL DEFAULT 'pending',
  licence_reference text,
  status          text NOT NULL DEFAULT 'candidate'
    CHECK (status IN ('candidate', 'kyc', 'licence_review', 'territory_review', 'approved', 'suspended')),
  compliance_docs jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS am_distributor_brand_authorizations (
  authorization_id bigserial PRIMARY KEY,
  distributor_id   text NOT NULL REFERENCES am_distributors(distributor_id) ON DELETE CASCADE,
  brand_id         text NOT NULL REFERENCES am_brands(brand_id),
  territories      text[] NOT NULL DEFAULT '{}',
  authorization_reference text,
  status           text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  valid_from       timestamptz,
  valid_to         timestamptz
);

CREATE TABLE IF NOT EXISTS am_compliance_records (
  record_id     bigserial PRIMARY KEY,
  entity_type   text NOT NULL,
  entity_id     text NOT NULL,
  country_code  text REFERENCES am_countries(country_code),
  document_type text NOT NULL,
  document_ref  text,
  status        text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'evidence_required', 'reviewing', 'approved', 'rejected')),
  reviewed_by   text,
  reviewed_at   timestamptz,
  expires_at    timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS am_approval_workflows (
  workflow_id  bigserial PRIMARY KEY,
  definition_id text NOT NULL,
  entity_type  text NOT NULL,
  entity_id    text NOT NULL,
  state        text NOT NULL DEFAULT 'draft',
  requested_by text,
  approver     text,
  reason       text,
  audit        jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CHECK (approver IS NULL OR approver <> requested_by)
);

CREATE TABLE IF NOT EXISTS am_inventory_sync (
  sync_id       bigserial PRIMARY KEY,
  product_id    text REFERENCES am_products(product_id) ON DELETE CASCADE,
  country_code  text REFERENCES am_countries(country_code),
  distributor_id text REFERENCES am_distributors(distributor_id),
  external_sku  text,
  quantity      integer CHECK (quantity IS NULL OR quantity >= 0),
  sync_status   text NOT NULL DEFAULT 'scheduled'
    CHECK (sync_status IN ('scheduled', 'fetching', 'reconciling', 'done', 'failed')),
  sync_cursor   text,
  synced_at     timestamptz
);

CREATE TABLE IF NOT EXISTS am_logistics_shipments (
  shipment_id       bigserial PRIMARY KEY,
  order_ref         text,
  product_id        text REFERENCES am_products(product_id),
  origin_country    text REFERENCES am_countries(country_code),
  destination_country text REFERENCES am_countries(country_code),
  carrier           text,
  status            text NOT NULL DEFAULT 'created',
  customs_ref       text,
  events            jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS am_search_synonyms (
  synonym_id   bigserial PRIMARY KEY,
  language_code text NOT NULL REFERENCES am_languages(code),
  term         text NOT NULL,
  synonyms     text[] NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS am_validation_rules (
  rule_id     text PRIMARY KEY,
  severity    text NOT NULL CHECK (severity IN ('error', 'warning')),
  description text NOT NULL,
  config      jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS am_workflow_definitions (
  workflow_id text PRIMARY KEY,
  name        text NOT NULL,
  states      text[] NOT NULL DEFAULT '{}',
  guards      jsonb NOT NULL DEFAULT '[]'::jsonb,
  description text,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS am_audit (
  id         bigserial PRIMARY KEY,
  table_name text NOT NULL,
  entity_id  text,
  action     text NOT NULL CHECK (action IN ('create', 'update', 'delete', 'import', 'approval')),
  actor      text,
  source     text,
  reason     text,
  before     jsonb,
  after      jsonb,
  at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS am_countries_currency_idx ON am_countries (currency_code);
CREATE INDEX IF NOT EXISTS am_brands_status_idx ON am_brands (verification_status, category_hint);
CREATE INDEX IF NOT EXISTS am_brands_name_trgm_idx ON am_brands (brand_name);
CREATE INDEX IF NOT EXISTS am_templates_status_idx ON am_product_templates (listing_status);
CREATE INDEX IF NOT EXISTS am_templates_search_idx ON am_product_templates USING gin (search_tsv);
CREATE INDEX IF NOT EXISTS am_products_brand_idx ON am_products (brand_id, category, subcategory);
CREATE INDEX IF NOT EXISTS am_products_status_idx ON am_products (listing_status);
CREATE INDEX IF NOT EXISTS am_products_search_idx ON am_products USING gin (search_tsv);
CREATE INDEX IF NOT EXISTS am_products_ai_tags_idx ON am_products USING gin (ai_recommendation_tags);
CREATE INDEX IF NOT EXISTS am_products_images_idx ON am_products USING gin (official_images jsonb_path_ops);
CREATE INDEX IF NOT EXISTS am_prices_product_idx ON am_prices (product_id, price_type, country_code);
CREATE INDEX IF NOT EXISTS am_availability_country_idx ON am_product_country_availability (country_code, availability_status);
CREATE INDEX IF NOT EXISTS am_distributors_country_idx ON am_distributors (country_code, status);
CREATE INDEX IF NOT EXISTS am_compliance_entity_idx ON am_compliance_records (entity_type, entity_id, status);
CREATE INDEX IF NOT EXISTS am_workflow_entity_idx ON am_approval_workflows (entity_type, entity_id, state);
CREATE INDEX IF NOT EXISTS am_inventory_sync_idx ON am_inventory_sync (country_code, sync_status);
CREATE INDEX IF NOT EXISTS am_shipment_destination_idx ON am_logistics_shipments (destination_country, status);
CREATE INDEX IF NOT EXISTS am_audit_entity_idx ON am_audit (entity_id, at DESC);

COMMENT ON TABLE am_products IS
  'Africa Marketplace product master. Target 500,000 products; shard by brand_id or product_id with Citus when enabled.';
COMMENT ON TABLE am_brands IS
  'Brand master. Target 10,000 brands; candidate names require identity and rights verification.';
COMMENT ON TABLE am_product_templates IS
  'Draft listing templates. Null fields indicate no verified source supplied a value.';
COMMENT ON COLUMN am_products.search_tsv IS
  'Generated full-text search index over the source-backed search document.';

CREATE OR REPLACE FUNCTION am_set_updated_at_fn()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS am_brands_updated_at_trg ON am_brands;
CREATE TRIGGER am_brands_updated_at_trg BEFORE UPDATE ON am_brands
  FOR EACH ROW EXECUTE FUNCTION am_set_updated_at_fn();
DROP TRIGGER IF EXISTS am_countries_updated_at_trg ON am_countries;
CREATE TRIGGER am_countries_updated_at_trg BEFORE UPDATE ON am_countries
  FOR EACH ROW EXECUTE FUNCTION am_set_updated_at_fn();
DROP TRIGGER IF EXISTS am_products_updated_at_trg ON am_products;
CREATE TRIGGER am_products_updated_at_trg BEFORE UPDATE ON am_products
  FOR EACH ROW EXECUTE FUNCTION am_set_updated_at_fn();

CREATE OR REPLACE FUNCTION am_audit_fn()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_action text;
  v_new jsonb;
  v_old jsonb;
  v_entity text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'create';
    v_new := to_jsonb(NEW);
    v_old := NULL;
    v_entity := coalesce(v_new->>'brand_id', v_new->>'product_id', v_new->>'template_id', v_new->>'distributor_id');
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'update';
    v_new := to_jsonb(NEW);
    v_old := to_jsonb(OLD);
    v_entity := coalesce(v_new->>'brand_id', v_new->>'product_id', v_new->>'template_id', v_new->>'distributor_id');
  ELSE
    v_action := 'delete';
    v_new := NULL;
    v_old := to_jsonb(OLD);
    v_entity := coalesce(v_old->>'brand_id', v_old->>'product_id', v_old->>'template_id', v_old->>'distributor_id');
  END IF;

  INSERT INTO am_audit (table_name, entity_id, action, actor, source, reason, before, after)
  VALUES (
    TG_TABLE_NAME,
    v_entity,
    v_action,
    coalesce(v_new->>'actor', v_old->>'actor', 'system'),
    coalesce(v_new->>'source', v_old->>'source', TG_TABLE_NAME),
    TG_TABLE_NAME || ' ' || v_action,
    v_old,
    v_new
  );

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS am_brands_audit_trg ON am_brands;
CREATE TRIGGER am_brands_audit_trg AFTER INSERT OR UPDATE OR DELETE ON am_brands
  FOR EACH ROW EXECUTE FUNCTION am_audit_fn();
DROP TRIGGER IF EXISTS am_products_audit_trg ON am_products;
CREATE TRIGGER am_products_audit_trg AFTER INSERT OR UPDATE OR DELETE ON am_products
  FOR EACH ROW EXECUTE FUNCTION am_audit_fn();
DROP TRIGGER IF EXISTS am_templates_audit_trg ON am_product_templates;
CREATE TRIGGER am_templates_audit_trg AFTER INSERT OR UPDATE OR DELETE ON am_product_templates
  FOR EACH ROW EXECUTE FUNCTION am_audit_fn();

CREATE OR REPLACE FUNCTION am_audit_immutable_fn()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'am_audit is append-only';
END;
$$;

DROP TRIGGER IF EXISTS am_audit_immutable_trg ON am_audit;
CREATE TRIGGER am_audit_immutable_trg BEFORE UPDATE OR DELETE ON am_audit
  FOR EACH ROW EXECUTE FUNCTION am_audit_immutable_fn();

CREATE OR REPLACE VIEW am_product_templates_review AS
SELECT template_id, brand_id, brand_name, category_hint, listing_status,
       (template->>'brand_name') AS brand_name_from_template,
       (template->>'ai_recommendation_tags') AS ai_tags,
       (template->'validation'->>'valid')::boolean AS template_valid
FROM am_product_templates
WHERE listing_status = 'draft_template';

CREATE OR REPLACE VIEW am_products_approved AS
SELECT *
FROM am_products
WHERE listing_status IN ('approved', 'published')
  AND COALESCE((provenance->>'rights_verified')::boolean, false) = true;

DO $$
DECLARE
  t text;
BEGIN
  FOR t IN
    SELECT tablename FROM pg_tables
    WHERE schemaname = current_schema() AND tablename LIKE 'am_%'
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END;
$$;
