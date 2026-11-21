-- =============================================================
-- VINTORA — presentational catalogue content.
-- Commercial data (price, stock, provenance) lives in the canonical
-- tables; editorial content used by the storefront lives here so the
-- UI no longer depends on a JavaScript demo array.
-- =============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS product_content (
  sku          text PRIMARY KEY REFERENCES skus(sku) ON DELETE CASCADE,
  region_label text,
  story        text,
  pairings     text[] NOT NULL DEFAULT '{}',
  palate       jsonb  NOT NULL DEFAULT '{}'::jsonb,
  rating       numeric(3,2) NOT NULL DEFAULT 0,
  review_count integer NOT NULL DEFAULT 0,
  updated_at   timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE product_content IS 'Storefront editorial content; never a source of price or inventory.';

COMMIT;
