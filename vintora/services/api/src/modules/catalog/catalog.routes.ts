import { Router } from 'express';
import { z } from 'zod';
import { config } from '../../config.js';
import { query, one } from '../../db/pool.js';
import { badRequest, notFound } from '../../lib/errors.js';
import { asyncHandler } from '../../lib/async.js';
import { queryOf, paramsOf, validate } from '../../middleware/validate.js';

export const catalogRouter = Router();

const CATALOGUE_SOURCE_META = config.CATALOGUE_SOURCE === 'demo'
  ? {
      dataClass: 'demo',
      fixtureClass: 'demo',
      sourceClass: 'seed',
      sourceRef: 'packages/db/seed/001_seed.sql',
      sourceLabel: 'Demo catalogue — not verified inventory or licensed supplier stock.',
      freshnessAsOf: 'prototype snapshot — 2026-11-21; no live feed',
      licenceEvidence: null,
      verifiedAt: null,
      purchasable: false,
      externalCheckoutBlocked: true,
      checkoutMode: 'simulation_only',
    }
  : {
      dataClass: 'verified',
      fixtureClass: 'mock',
      sourceClass: 'verified',
      sourceRef: 'catalogue_import_verified',
      sourceLabel: 'Verified catalogue — licence evidence required.',
      freshnessAsOf: null,
      licenceEvidence: null,
      verifiedAt: null,
      purchasable: false,
      externalCheckoutBlocked: true,
      checkoutMode: 'blocked',
    };

export const CATALOGUE_CHECKOUT_ELIGIBILITY = Object.freeze({
  sourceClass: config.CATALOGUE_SOURCE === 'demo' ? 'seed' : 'verified',
  purchasable: false,
  externalCheckoutBlocked: true,
  simulationOnly: true,
  reason: 'Demo catalogue rows are illustrative; no licensed or verified inventory is connected.',
});

function assertPrototypeCatalogueSource(): void {
  if (config.CATALOGUE_SOURCE !== 'demo') {
    throw badRequest('Verified catalogue adapter is not enabled in the prototype', {
      configuredSource: config.CATALOGUE_SOURCE,
      requiredEvidence: 'licensed-feed or rights-evidence import',
    });
  }
}

function withSourceMeta<T extends object>(row: T): T & typeof CATALOGUE_SOURCE_META {
  return { ...row, ...CATALOGUE_SOURCE_META };
}

const PRODUCT_COLUMNS = `
  SELECT s.sku AS id, w.name, p.name AS producer,
         COALESCE(pc.region_label, r.name || ', ' || c.name) AS region,
         a.name AS appellation, v.year AS vintage, w.type::text AS type,
         w.grapes, s.price_usd AS price, pc.rating, pc.review_count AS reviews,
         GREATEST(COALESCE(i.available, 0), 0) AS stock,
         v.provenance_score AS provenance, v.liquidity_score AS liquidity,
         w.liquid_color AS liquid, pc.palate, v.tasting_notes AS notes,
         pc.pairings, pc.story, v.custody
  FROM skus s
  JOIN vintages v ON v.id = s.vintage_id
  JOIN wines w ON w.id = v.wine_id
  JOIN producers p ON p.id = w.producer_id
  LEFT JOIN appellations a ON a.id = w.appellation_id
  LEFT JOIN regions r ON r.id = a.region_id
  LEFT JOIN countries c ON c.code = r.country_code
  LEFT JOIN product_content pc ON pc.sku = s.sku
  LEFT JOIN (
    SELECT sku_id, SUM(quantity_on_hand - quantity_reserved) AS available
    FROM inventory_items GROUP BY sku_id
  ) i ON i.sku_id = s.id
  WHERE s.is_active = true
`;

const listSchema = z.object({
  type: z.enum(['Red Wine', 'White Wine', 'Sparkling', 'Spirits', 'Fortified']).optional(),
  q: z.string().trim().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(24),
  offset: z.coerce.number().int().min(0).default(0),
}).strict();

catalogRouter.get('/products', validate({ query: listSchema }), asyncHandler(async (req, res) => {
  assertPrototypeCatalogueSource();
  const { type, q, limit, offset } = queryOf<z.infer<typeof listSchema>>(req);
  const pattern = q ? `%${q}%` : null;
  const rows = (await query(
    `${PRODUCT_COLUMNS}
     AND ($1::text IS NULL OR w.type::text = $1)
     AND ($2::text IS NULL OR w.name ILIKE $2 OR p.name ILIKE $2
          OR array_to_string(v.tasting_notes, ' ') ILIKE $2)
     ORDER BY w.name ASC
     LIMIT $3 OFFSET $4`,
    [type ?? null, pattern, limit, offset],
  )).map(withSourceMeta);
  res.json({ items: rows, total: rows.length, limit, offset, catalogueSource: CATALOGUE_SOURCE_META });
}));

catalogRouter.get('/products/:id', validate({
  params: z.object({ id: z.string().regex(/^sku-\d{4}$/) }).strict(),
}), asyncHandler(async (req, res) => {
  assertPrototypeCatalogueSource();
  const { id } = paramsOf<{ id: string }>(req);
  const product = await one(`${PRODUCT_COLUMNS} AND s.sku = $1`, [id]);
  if (!product) throw notFound('Product not found');
  res.json(withSourceMeta(product));
}));
