-- =============================================================
-- VINTORA — initial schema (Phase 1 foundation)
-- Source of truth: vintora/04-database-design.md
-- Plain PostgreSQL 16. Citus calls are included as comments for
-- the sharded deployment described in the architecture doc.
-- =============================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "citext";
-- Requires the pgvector extension to be installed in the Postgres image.
CREATE EXTENSION IF NOT EXISTS "vector";

-- ---------- enums ----------
CREATE TYPE product_type AS ENUM ('Red Wine', 'White Wine', 'Sparkling', 'Spirits', 'Fortified');
CREATE TYPE order_status AS ENUM ('draft', 'authorized', 'paid', 'allocated', 'shipped', 'delivered', 'cancelled', 'refunded');
CREATE TYPE verification_status AS ENUM ('pending', 'verified', 'rejected', 'expired');
CREATE TYPE shipment_status AS ENUM ('created', 'picked', 'in_transit', 'customs', 'out_for_delivery', 'delivered', 'exception');
CREATE TYPE trade_status AS ENUM ('draft', 'open', 'quoted', 'contracted', 'settled', 'cancelled');

-- ---------- reference / identity ----------
CREATE TABLE countries (
  code char(2) PRIMARY KEY,
  name text NOT NULL,
  minimum_drinking_age smallint NOT NULL DEFAULT 18,
  alcohol_licensing_regime text,
  currency_code char(3),
  is_launch_market boolean NOT NULL DEFAULT false
);
COMMENT ON TABLE countries IS 'Citus reference table';

CREATE TABLE currencies (
  code char(3) PRIMARY KEY,
  name text NOT NULL,
  symbol text NOT NULL,
  minor_units smallint NOT NULL DEFAULT 2
);
COMMENT ON TABLE currencies IS 'Citus reference table';

CREATE TABLE exchange_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  base_code char(3) NOT NULL REFERENCES currencies(code),
  quote_code char(3) NOT NULL REFERENCES currencies(code),
  rate numeric(18, 8) NOT NULL,
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_to timestamptz,
  source text NOT NULL DEFAULT 'internal-fx-engine'
);
CREATE UNIQUE INDEX exchange_rates_pair_time_uq ON exchange_rates (base_code, quote_code, valid_from);
CREATE INDEX exchange_rates_pair_time_idx ON exchange_rates (base_code, quote_code, valid_from DESC);
COMMENT ON TABLE exchange_rates IS 'Citus reference table';

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email citext UNIQUE,
  display_name text,
  locale char(2) NOT NULL DEFAULT 'en',
  preferred_currency char(3) NOT NULL REFERENCES currencies(code),
  country_code char(2) REFERENCES countries(code),
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
-- Citus: SELECT create_distributed_table('users', 'id');

CREATE TABLE addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  line1 text NOT NULL,
  line2 text,
  city text NOT NULL,
  region text,
  postal_code text NOT NULL,
  country_code char(2) NOT NULL REFERENCES countries(code),
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX addresses_user_idx ON addresses (user_id);

CREATE TABLE age_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  country_code char(2) NOT NULL REFERENCES countries(code),
  date_of_birth date NOT NULL,
  calculated_age smallint NOT NULL,
  minimum_age smallint NOT NULL,
  provider text NOT NULL,
  provider_reference text,
  status verification_status NOT NULL,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX age_verifications_user_idx ON age_verifications (user_id, created_at DESC);
COMMENT ON TABLE age_verifications IS 'Immutable audit trail. Never hard-delete; crypto-shred on erasure request.';

CREATE TABLE taste_profiles (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  body smallint NOT NULL DEFAULT 0 CHECK (body BETWEEN 0 AND 5),
  dryness smallint NOT NULL DEFAULT 0 CHECK (dryness BETWEEN 0 AND 5),
  oak smallint NOT NULL DEFAULT 0 CHECK (oak BETWEEN 0 AND 5),
  fruit smallint NOT NULL DEFAULT 0 CHECK (fruit BETWEEN 0 AND 5),
  confidence numeric(5,4) NOT NULL DEFAULT 0,
  embedding vector(1536),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------- catalogue ----------
CREATE TABLE producers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  country_code char(2) REFERENCES countries(code),
  region text,
  website text,
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX producers_name_trgm_idx ON producers USING gin (name gin_trgm_ops);
COMMENT ON TABLE producers IS 'Citus reference table';

CREATE TABLE regions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  country_code char(2) NOT NULL REFERENCES countries(code),
  parent_id uuid REFERENCES regions(id)
);
CREATE UNIQUE INDEX regions_name_country_uq ON regions (name, country_code);

CREATE TABLE appellations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id uuid NOT NULL REFERENCES regions(id),
  name text NOT NULL,
  classification text
);
CREATE UNIQUE INDEX appellations_region_name_uq ON appellations (region_id, name);

CREATE TABLE wines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  producer_id uuid NOT NULL REFERENCES producers(id),
  appellation_id uuid REFERENCES appellations(id),
  name text NOT NULL,
  type product_type NOT NULL,
  grapes text[] NOT NULL DEFAULT '{}',
  description text,
  liquid_color text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX wines_producer_idx ON wines (producer_id);
CREATE INDEX wines_name_trgm_idx ON wines USING gin (name gin_trgm_ops);
COMMENT ON TABLE wines IS 'Citus reference table';

CREATE TABLE vintages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wine_id uuid NOT NULL REFERENCES wines(id) ON DELETE CASCADE,
  year smallint CHECK (year IS NULL OR year BETWEEN 1800 AND 2100), -- null = NAS spirits
  score numeric(5,2),
  tasting_notes text[] NOT NULL DEFAULT '{}',
  provenance_score smallint CHECK (provenance_score BETWEEN 0 AND 100),
  liquidity_score smallint CHECK (liquidity_score BETWEEN 0 AND 100),
  custody text,
  UNIQUE (wine_id, year)
);

CREATE TABLE skus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vintage_id uuid NOT NULL REFERENCES vintages(id),
  sku text NOT NULL UNIQUE,
  volume_ml integer NOT NULL DEFAULT 750,
  price_usd numeric(14,2) NOT NULL CHECK (price_usd >= 0),
  bottle_count integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  embedding vector(1536),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX skus_vintage_idx ON skus (vintage_id);
COMMENT ON TABLE skus IS 'Citus reference table';

-- ---------- warehouses, sellers, listings ----------
CREATE TABLE warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  country_code char(2) NOT NULL REFERENCES countries(code),
  bonded boolean NOT NULL DEFAULT true,
  temperature_c numeric(5,2),
  capacity_units integer
);
COMMENT ON TABLE warehouses IS 'Citus reference table';

CREATE TABLE sellers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES users(id),
  legal_name text NOT NULL,
  trading_name text NOT NULL,
  country_code char(2) NOT NULL REFERENCES countries(code),
  licence_number text,
  status text NOT NULL DEFAULT 'pending',
  tier text NOT NULL DEFAULT 'free',
  created_at timestamptz NOT NULL DEFAULT now()
);
-- Citus: SELECT create_distributed_table('sellers', 'id');
CREATE INDEX sellers_owner_idx ON sellers (owner_user_id);

CREATE TABLE inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku_id uuid NOT NULL REFERENCES skus(id),
  warehouse_id uuid NOT NULL REFERENCES warehouses(id),
  seller_id uuid REFERENCES sellers(id),
  quantity_on_hand integer NOT NULL DEFAULT 0 CHECK (quantity_on_hand >= 0),
  quantity_reserved integer NOT NULL DEFAULT 0 CHECK (quantity_reserved >= 0),
  condition_grade text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sku_id, warehouse_id, seller_id)
);
-- Citus: SELECT create_distributed_table('inventory_items', 'sku_id');
CREATE INDEX inventory_sku_idx ON inventory_items (sku_id);

CREATE TABLE listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  sku_id uuid NOT NULL REFERENCES skus(id),
  title text NOT NULL,
  price_usd numeric(14,2) NOT NULL,
  channel text NOT NULL DEFAULT 'market',
  status text NOT NULL DEFAULT 'draft',
  ai_generated_copy boolean NOT NULL DEFAULT false,
  human_approved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- Citus: SELECT create_distributed_table('listings', 'seller_id');
CREATE INDEX listings_seller_idx ON listings (seller_id);
CREATE INDEX listings_sku_idx ON listings (sku_id);

-- ---------- commerce ----------
CREATE TABLE carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  currency_code char(3) NOT NULL REFERENCES currencies(code),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- Citus: SELECT create_distributed_table('carts', 'user_id');

CREATE TABLE cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id uuid NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  sku_id uuid NOT NULL REFERENCES skus(id),
  quantity integer NOT NULL CHECK (quantity > 0),
  UNIQUE (cart_id, sku_id)
);
-- Citus: SELECT create_distributed_table('cart_items', 'cart_id');

CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL UNIQUE,
  user_id uuid NOT NULL REFERENCES users(id),
  seller_id uuid REFERENCES sellers(id),
  status order_status NOT NULL DEFAULT 'draft',
  currency_code char(3) NOT NULL REFERENCES currencies(code),
  fx_rate numeric(18,8) NOT NULL DEFAULT 1,
  subtotal numeric(14,2) NOT NULL,
  shipping_fee numeric(14,2) NOT NULL DEFAULT 0,
  insurance_fee numeric(14,2) NOT NULL DEFAULT 0,
  tax_amount numeric(14,2) NOT NULL DEFAULT 0,
  total numeric(14,2) NOT NULL,
  age_verification_id uuid REFERENCES age_verifications(id),
  placed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- Citus: SELECT create_distributed_table('orders', 'user_id');
CREATE INDEX orders_user_idx ON orders (user_id, created_at DESC);
CREATE INDEX orders_status_idx ON orders (status);

CREATE TABLE order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  sku_id uuid NOT NULL REFERENCES skus(id),
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price numeric(14,2) NOT NULL,
  line_total numeric(14,2) NOT NULL
);
-- Citus: SELECT create_distributed_table('order_items', 'order_id');
CREATE INDEX order_items_order_idx ON order_items (order_id);

CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id),
  processor text NOT NULL,
  processor_reference text,
  amount numeric(14,2) NOT NULL,
  currency_code char(3) NOT NULL REFERENCES currencies(code),
  status text NOT NULL DEFAULT 'pending',
  idempotency_key text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX payments_order_idx ON payments (order_id);

CREATE TABLE shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id),
  warehouse_id uuid REFERENCES warehouses(id),
  carrier text NOT NULL,
  tracking_number text,
  status shipment_status NOT NULL DEFAULT 'created',
  temperature_excursion boolean NOT NULL DEFAULT false,
  insured_value numeric(14,2),
  shipped_at timestamptz,
  delivered_at timestamptz
);
CREATE INDEX shipments_order_idx ON shipments (order_id);

-- ---------- b2b ----------
CREATE TABLE b2b_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  country_code char(2) NOT NULL REFERENCES countries(code),
  vat_number text,
  credit_limit numeric(14,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending'
);

CREATE TABLE rfqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  b2b_account_id uuid NOT NULL REFERENCES b2b_accounts(id),
  status trade_status NOT NULL DEFAULT 'draft',
  destination_market char(2) REFERENCES countries(code),
  incoterm text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE rfq_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id uuid NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
  sku_id uuid NOT NULL REFERENCES skus(id),
  cases integer NOT NULL CHECK (cases > 0),
  target_price_usd numeric(14,2)
);

-- ---------- subscription, vault, loyalty ----------
CREATE TABLE club_plans (
  code text PRIMARY KEY,
  name text NOT NULL,
  monthly_usd numeric(10,2) NOT NULL,
  bottle_count integer NOT NULL,
  description text
);
COMMENT ON TABLE club_plans IS 'Citus reference table';

CREATE TABLE subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_code text NOT NULL REFERENCES club_plans(code),
  status text NOT NULL DEFAULT 'active',
  current_period_start date NOT NULL,
  current_period_end date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- Citus: SELECT create_distributed_table('subscriptions', 'user_id');

CREATE TABLE lots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku_id uuid NOT NULL REFERENCES skus(id),
  quantity integer NOT NULL CHECK (quantity > 0),
  warehouse_id uuid REFERENCES warehouses(id),
  condition_grade text,
  provenance_hash text,
  status text NOT NULL DEFAULT 'custodied'
);

CREATE TABLE vault_holdings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  lot_id uuid NOT NULL REFERENCES lots(id),
  fraction numeric(9,6) NOT NULL CHECK (fraction > 0 AND fraction <= 1),
  cost_basis_usd numeric(14,2) NOT NULL,
  acquired_at timestamptz NOT NULL DEFAULT now()
);
-- Citus: SELECT create_distributed_table('vault_holdings', 'user_id');

CREATE TABLE trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_id uuid NOT NULL REFERENCES lots(id),
  buyer_id uuid NOT NULL REFERENCES users(id),
  seller_id uuid NOT NULL REFERENCES users(id),
  price_usd numeric(14,2) NOT NULL,
  fraction numeric(9,6) NOT NULL,
  settlement_asset text NOT NULL DEFAULT 'USDC',
  executed_at timestamptz NOT NULL DEFAULT now()
);
-- Citus: SELECT create_distributed_table('trades', 'buyer_id');

CREATE TABLE loyalty_accounts (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  tier text NOT NULL DEFAULT 'Explorer',
  points_balance integer NOT NULL DEFAULT 0 CHECK (points_balance >= 0),
  lifetime_points integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE loyalty_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  module text NOT NULL,
  points integer NOT NULL,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- Citus: SELECT create_distributed_table('loyalty_transactions', 'user_id');

-- ---------- content, AI, governance ----------
CREATE TABLE reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  sku_id uuid NOT NULL REFERENCES skus(id),
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body text,
  verified_purchase boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- Citus: SELECT create_distributed_table('reviews', 'user_id');

CREATE TABLE sommelier_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  locale char(2) NOT NULL DEFAULT 'en',
  transcript jsonb NOT NULL DEFAULT '[]',
  retrieved_doc_ids uuid[] NOT NULL DEFAULT '{}',
  safety_flags text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
-- Citus: SELECT create_distributed_table('sommelier_conversations', 'user_id');

CREATE TABLE ai_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  surface text NOT NULL,
  sku_ids uuid[] NOT NULL,
  model_version text NOT NULL,
  score numeric(8,5),
  created_at timestamptz NOT NULL DEFAULT now()
);
-- Citus: SELECT create_distributed_table('ai_recommendations', 'user_id');

CREATE TABLE marketing_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES sellers(id),
  channel text NOT NULL,
  brief jsonb NOT NULL,
  generated_copy jsonb,
  brand_voice_score numeric(5,2),
  compliance_status text NOT NULL DEFAULT 'pending',
  human_approved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- Citus: SELECT create_distributed_table('marketing_campaigns', 'seller_id');

CREATE TABLE audit_logs (
  id bigserial PRIMARY KEY,
  actor_type text NOT NULL,
  actor_id uuid,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}',
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_logs_entity_idx ON audit_logs (entity_type, entity_id, occurred_at DESC);

-- ---------- trigger: updated_at ----------
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['users','taste_profiles','inventory_items','carts','loyalty_accounts']
  LOOP
    EXECUTE format('CREATE TRIGGER trg_%s_updated BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at()', t, t);
  END LOOP;
END $$;

COMMIT;
