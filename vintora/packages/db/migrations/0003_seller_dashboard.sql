-- =============================================================
-- VINTORA — Seller dashboard domain (Vintora Seller)
-- Source of truth: vintora/15-seller-dashboard-module.md §3
-- Extends 0001_initial.sql. Plain PostgreSQL 16; Citus calls commented.
-- All tables are tenant-partitioned. Financial and inventory-movement
-- rows are append-only. Dashboard columns are money-in-minor units.
-- =============================================================

BEGIN;

-- ---------- enum ----------
CREATE TYPE inventory_movement_type AS ENUM
  ('receive', 'reserve', 'release', 'pick', 'adjust',
   'quarantine', 'return', 'transfer', 'cycle_count');

-- ---------- storefronts (referenced by the seller analytics rollups) ----------
CREATE TABLE IF NOT EXISTS stores (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id   uuid NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  name        text NOT NULL,
  status      text NOT NULL DEFAULT 'active',
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS stores_seller_idx ON stores (seller_id);

-- ---------- analytics read models ----------
CREATE TABLE seller_daily_metrics (
  tenant_id        uuid NOT NULL,
  seller_id        uuid NOT NULL REFERENCES sellers(id),
  store_id         uuid REFERENCES stores(id), -- NULL = seller-level rollup
  metric_date      date NOT NULL,
  currency_code    char(3) NOT NULL REFERENCES currencies(code),
  gmv_minor        bigint NOT NULL DEFAULT 0,
  orders_count     integer NOT NULL DEFAULT 0,
  units_sold       integer NOT NULL DEFAULT 0,
  visitors         integer NOT NULL DEFAULT 0,
  conversion_bps   integer NOT NULL DEFAULT 0,
  refunds_minor    bigint NOT NULL DEFAULT 0,
  aov_minor        bigint NOT NULL DEFAULT 0,
  computed_at      timestamptz NOT NULL DEFAULT now()
);
-- NULL store_id cannot be part of a primary key; enforce uniqueness via an
-- expression index so seller-level and store-level rows can coexist per day.
CREATE UNIQUE INDEX seller_daily_metrics_key ON seller_daily_metrics
  (tenant_id, seller_id, metric_date, currency_code,
   COALESCE(store_id, '00000000-0000-0000-0000-000000000000'::uuid));
CREATE INDEX seller_daily_metrics_date_idx
  ON seller_daily_metrics (tenant_id, seller_id, metric_date DESC);

CREATE TABLE seller_product_daily_metrics (
  tenant_id        uuid NOT NULL,
  seller_id        uuid NOT NULL REFERENCES sellers(id),
  listing_id       uuid NOT NULL REFERENCES listings(id),
  sku_id           uuid NOT NULL REFERENCES skus(id),
  metric_date      date NOT NULL,
  currency_code    char(3) NOT NULL REFERENCES currencies(code),
  views            integer NOT NULL DEFAULT 0,
  clicks           integer NOT NULL DEFAULT 0,
  add_to_carts     integer NOT NULL DEFAULT 0,
  units_sold       integer NOT NULL DEFAULT 0,
  gmv_minor        bigint NOT NULL DEFAULT 0,
  refunds_minor    bigint NOT NULL DEFAULT 0,
  conversion_bps   integer NOT NULL DEFAULT 0,
  stockout_minutes integer NOT NULL DEFAULT 0,
  price_minor      bigint,
  computed_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, seller_id, listing_id, metric_date, currency_code)
);
CREATE INDEX seller_product_metrics_gmv_idx
  ON seller_product_daily_metrics (tenant_id, seller_id, metric_date, gmv_minor DESC);
CREATE INDEX seller_product_metrics_sku_idx
  ON seller_product_daily_metrics (tenant_id, sku_id, metric_date DESC);

-- ---------- inventory ledger and alerts ----------
CREATE TABLE inventory_movements (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL,
  sku_id           uuid NOT NULL REFERENCES skus(id),
  warehouse_id     uuid NOT NULL REFERENCES warehouses(id),
  movement_type    inventory_movement_type NOT NULL,
  quantity_delta   integer NOT NULL,
  quantity_before  integer NOT NULL,
  quantity_after   integer NOT NULL CHECK (quantity_after >= 0),
  lot_code         text,
  reason           text,
  reference_type   text,
  reference_id     uuid,
  actor_id         uuid REFERENCES users(id),
  occurred_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX inventory_movements_timeline_idx
  ON inventory_movements (tenant_id, sku_id, occurred_at DESC);
CREATE INDEX inventory_movements_warehouse_idx
  ON inventory_movements (tenant_id, warehouse_id, occurred_at DESC);
COMMENT ON TABLE inventory_movements IS
  'Append-only. Every ATP change writes exactly one movement row.';

CREATE TABLE inventory_alerts (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL,
  seller_id        uuid NOT NULL REFERENCES sellers(id),
  sku_id           uuid NOT NULL REFERENCES skus(id),
  warehouse_id     uuid REFERENCES warehouses(id),
  alert_type       text NOT NULL CHECK (alert_type IN
                     ('low_stock', 'overstock', 'quarantine',
                      'temperature', 'expiry', 'count_variance')),
  severity         text NOT NULL CHECK (severity IN ('info', 'warn', 'critical')),
  threshold_value  numeric(14,2),
  observed_value   numeric(14,2),
  status           text NOT NULL DEFAULT 'open',
  created_at       timestamptz NOT NULL DEFAULT now(),
  resolved_at      timestamptz,
  resolved_by      uuid REFERENCES users(id),
  CHECK (resolved_at IS NULL OR status <> 'open')
);
CREATE INDEX inventory_alerts_open_idx
  ON inventory_alerts (tenant_id, seller_id, alert_type, created_at DESC)
  WHERE status = 'open';

-- Low-stock partial index supporting the SELL-03 action queue.
CREATE INDEX inventory_items_low_stock_idx
  ON inventory_items (warehouse_id, sku_id)
  WHERE (quantity_on_hand - quantity_reserved) < 10;

-- ---------- fulfilment projection ----------
CREATE TABLE seller_fulfilment (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL,
  seller_id        uuid NOT NULL REFERENCES sellers(id),
  order_id         uuid NOT NULL REFERENCES orders(id),
  status           text NOT NULL DEFAULT 'to_pick'
                     CHECK (status IN ('to_pick', 'picking', 'picked', 'to_ship',
                                       'shipped', 'delivered', 'on_hold', 'cancelled')),
  warehouse_id     uuid REFERENCES warehouses(id),
  ship_by          timestamptz,
  picked_at        timestamptz,
  shipped_at       timestamptz,
  delivered_at     timestamptz,
  carrier          text,
  tracking_code    text,
  exception_reason text,
  UNIQUE (tenant_id, seller_id, order_id)
);
CREATE INDEX seller_fulfilment_queue_idx
  ON seller_fulfilment (tenant_id, seller_id, status, ship_by)
  WHERE status NOT IN ('delivered', 'cancelled');

-- ---------- customer insight rollups (pseudonymous) ----------
CREATE TABLE seller_customers (
  tenant_id            uuid NOT NULL,
  seller_id            uuid NOT NULL REFERENCES sellers(id),
  customer_key         uuid NOT NULL,
  first_order_at       timestamptz,
  last_order_at        timestamptz,
  orders_count         integer NOT NULL DEFAULT 0,
  lifetime_value_minor bigint NOT NULL DEFAULT 0,
  currency_code        char(3) NOT NULL REFERENCES currencies(code),
  avg_order_value_minor bigint NOT NULL DEFAULT 0,
  preferred_categories text[] NOT NULL DEFAULT '{}',
  return_rate_bps      integer NOT NULL DEFAULT 0,
  churn_risk           numeric(5,4) CHECK (churn_risk BETWEEN 0 AND 1),
  marketing_consent    boolean NOT NULL DEFAULT false,
  age_verified         boolean NOT NULL DEFAULT false,
  computed_at          timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, seller_id, customer_key)
);
CREATE INDEX seller_customers_ltv_idx
  ON seller_customers (tenant_id, seller_id, lifetime_value_minor DESC);

CREATE TABLE customer_segments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL,
  seller_id     uuid NOT NULL REFERENCES sellers(id),
  name          text NOT NULL,
  rule_json     jsonb NOT NULL DEFAULT '{}'::jsonb,
  member_count  integer NOT NULL DEFAULT 0,
  status        text NOT NULL DEFAULT 'active',
  created_by    uuid REFERENCES users(id),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, seller_id, name)
);
CREATE INDEX customer_segments_rules_idx ON customer_segments USING gin (rule_json);
COMMENT ON COLUMN seller_customers.customer_key IS
  'Pseudonymous identifier. Raw PII stays in the identity domain.';

-- ---------- revenue and payouts (append-only) ----------
CREATE TABLE revenue_recognition (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL,
  seller_id        uuid NOT NULL REFERENCES sellers(id),
  order_id         uuid NOT NULL REFERENCES orders(id),
  period           date NOT NULL,
  currency_code    char(3) NOT NULL REFERENCES currencies(code),
  gross_minor      bigint NOT NULL,
  refunds_minor    bigint NOT NULL DEFAULT 0,
  commission_minor bigint NOT NULL DEFAULT 0,
  processing_minor bigint NOT NULL DEFAULT 0,
  shipping_minor   bigint NOT NULL DEFAULT 0,
  tax_minor        bigint NOT NULL DEFAULT 0,
  net_minor        bigint NOT NULL,
  fx_rate          numeric(18,8),
  fx_locked_at     timestamptz,
  status           text NOT NULL DEFAULT 'recognized',
  recognized_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, order_id, period)
);
CREATE INDEX revenue_recognition_period_idx
  ON revenue_recognition (tenant_id, seller_id, period DESC);
COMMENT ON TABLE revenue_recognition IS
  'Append-only. Corrections are compensating rows, never UPDATE or DELETE.';

CREATE TABLE seller_payouts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL,
  seller_id     uuid NOT NULL REFERENCES sellers(id),
  period_start  date NOT NULL,
  period_end    date NOT NULL,
  currency_code char(3) NOT NULL REFERENCES currencies(code),
  gross_minor   bigint NOT NULL,
  fees_minor    bigint NOT NULL,
  net_minor     bigint NOT NULL,
  rail          text NOT NULL,
  status        text NOT NULL DEFAULT 'scheduled'
                  CHECK (status IN ('scheduled', 'approved', 'processing', 'paid', 'failed')),
  due_at        timestamptz NOT NULL,
  paid_at       timestamptz,
  reference     text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CHECK (period_end >= period_start)
);
CREATE INDEX seller_payouts_due_idx
  ON seller_payouts (tenant_id, seller_id, due_at)
  WHERE status <> 'paid';

-- ---------- price benchmarks and AI recommendations ----------
CREATE TABLE price_benchmarks (
  tenant_id     uuid NOT NULL,
  sku_id        uuid NOT NULL REFERENCES skus(id),
  market        text NOT NULL,
  currency_code char(3) NOT NULL REFERENCES currencies(code),
  p25_minor     bigint,
  median_minor  bigint,
  p75_minor     bigint,
  sample_size   integer NOT NULL DEFAULT 0,
  as_of         date NOT NULL,
  PRIMARY KEY (tenant_id, sku_id, market, currency_code, as_of)
);

CREATE TABLE seller_recommendations (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            uuid NOT NULL,
  seller_id            uuid NOT NULL REFERENCES sellers(id),
  rec_type             text NOT NULL CHECK (rec_type IN
                         ('replenish', 'price_change', 'copy_refresh', 'bundle',
                          'discount', 'customer_winback', 'overstock',
                          'fulfilment', 'compliance')),
  target_type          text,
  target_id            uuid,
  title                text NOT NULL,
  rationale_json       jsonb NOT NULL DEFAULT '{}'::jsonb,
  expected_impact_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence           numeric(5,4) NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  status               text NOT NULL DEFAULT 'open'
                         CHECK (status IN ('open', 'approved', 'rejected',
                                           'snoozed', 'expired', 'acted')),
  created_at           timestamptz NOT NULL DEFAULT now(),
  expires_at           timestamptz,
  acted_at             timestamptz,
  acted_by             uuid REFERENCES users(id),
  prompt_version       text,
  model_hash           text
);
CREATE INDEX seller_recommendations_open_idx
  ON seller_recommendations (tenant_id, seller_id, created_at DESC)
  WHERE status = 'open';

-- ---------- row-level security (defence in depth) ----------
-- Application connects as a non-bypassrls role and sets app.tenant_id per request.
-- Vintora ops use a separate scoped role with BYPASSRLS and audited access.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'seller_daily_metrics', 'seller_product_daily_metrics', 'inventory_movements',
    'inventory_alerts', 'seller_fulfilment', 'seller_customers',
    'customer_segments', 'revenue_recognition', 'seller_payouts',
    'price_benchmarks', 'seller_recommendations'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING (tenant_id = current_setting(''app.tenant_id'', true)::uuid) WITH CHECK (tenant_id = current_setting(''app.tenant_id'', true)::uuid)',
      t);
  END LOOP;
END $$;

-- Citus distribution notes (apply on the sharded deployment only):
-- SELECT create_distributed_table('seller_daily_metrics', 'tenant_id');
-- SELECT create_distributed_table('seller_product_daily_metrics', 'tenant_id');
-- SELECT create_distributed_table('inventory_movements', 'tenant_id');
-- SELECT create_distributed_table('seller_fulfilment', 'tenant_id');
-- SELECT create_distributed_table('seller_customers', 'tenant_id');
-- SELECT create_distributed_table('revenue_recognition', 'tenant_id');
-- SELECT create_distributed_table('seller_recommendations', 'tenant_id');
-- Reference tables: price_benchmarks, customer_segments, seller_payouts,
--                   inventory_alerts (co-locate with their parent where possible).

COMMIT;
