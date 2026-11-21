-- Vintora verified catalogue import target (PostgreSQL 15+ / Supabase).
-- Apply with: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f sql/catalogue_import.sql
-- This is an internal staging table. RLS is enabled with no public policies.

CREATE TABLE IF NOT EXISTS catalogue_import (
  product_sku                     text PRIMARY KEY,
  category                        text NOT NULL,
  subcategory                     text NOT NULL,
  brand_name                      text,
  product_name                    text,
  country_of_origin               text,
  region                          text,
  producer_distillery             text,
  abv_pct                         numeric(4,2) CHECK (abv_pct IS NULL OR abv_pct BETWEEN 0 AND 100),
  bottle_size                     text,
  bottle_size_ml                  integer CHECK (bottle_size_ml IS NULL OR bottle_size_ml > 0),
  tasting_notes                   text,
  food_pairing                    text,
  awards                          jsonb NOT NULL DEFAULT '[]'::jsonb,
  product_description             text,
  msrp_price_usd                  numeric(12,2) CHECK (msrp_price_usd IS NULL OR msrp_price_usd >= 0),
  average_global_retail_price_usd numeric(12,2) CHECK (average_global_retail_price_usd IS NULL OR average_global_retail_price_usd >= 0),
  barcode                         text CHECK (barcode IS NULL OR barcode ~ '^\d{8,14}$'),
  official_brand_website          text,
  official_product_page           text,
  official_product_image_url      text,
  additional_gallery_images       jsonb NOT NULL DEFAULT '[]'::jsonb,
  product_tags                    text[] NOT NULL DEFAULT '{}',
  premium_luxury_segment          text,
  popularity_score                numeric(5,2) CHECK (popularity_score IS NULL OR popularity_score BETWEEN 0 AND 100),
  ai_recommendation_tags          text[] NOT NULL DEFAULT '{}',
  provenance                      jsonb NOT NULL DEFAULT '{}'::jsonb,
  imported_at                     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS catalogue_import_category_idx
  ON catalogue_import (category, subcategory);
CREATE INDEX IF NOT EXISTS catalogue_import_brand_idx
  ON catalogue_import (brand_name, product_name);
CREATE INDEX IF NOT EXISTS catalogue_import_barcode_idx
  ON catalogue_import (barcode) WHERE barcode IS NOT NULL;
CREATE INDEX IF NOT EXISTS catalogue_import_tags_idx
  ON catalogue_import USING gin (product_tags);
CREATE INDEX IF NOT EXISTS catalogue_import_provenance_idx
  ON catalogue_import USING gin (provenance jsonb_path_ops);

COMMENT ON TABLE catalogue_import IS
  'Verified-source catalogue staging. Nulls are intentional; no generated facts are stored.';
COMMENT ON COLUMN catalogue_import.provenance IS
  'Source, licence, retrieval time, field-level confidence and derived-value labels.';

ALTER TABLE catalogue_import ENABLE ROW LEVEL SECURITY;

-- Read-only view for rows that passed the higher confidence bar and are not fixtures.
CREATE OR REPLACE VIEW catalogue_import_verified AS
SELECT *
FROM catalogue_import
WHERE COALESCE((provenance->>'overall_confidence')::numeric, 0) >= 0.70
  AND COALESCE(provenance->>'source', '') <> 'fixture';
