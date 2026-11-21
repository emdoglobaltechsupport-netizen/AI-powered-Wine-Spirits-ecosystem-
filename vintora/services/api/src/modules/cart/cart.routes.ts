import { Router } from 'express';
import { z } from 'zod';
import { pool, one } from '../../db/pool.js';
import { notFound } from '../../lib/errors.js';
import { asyncHandler } from '../../lib/async.js';
import { requireAccess, requestJurisdiction } from '../../middleware/access.js';
import { requireUser } from '../../middleware/auth.js';
import { bodyOf, paramsOf, validate } from '../../middleware/validate.js';

export const cartRouter = Router();
cartRouter.use(requireUser);
cartRouter.use(requireAccess('market:browse:tenant', {
  resourceType: 'cart',
  jurisdiction: requestJurisdiction,
  ownerUserId: (req) => req.auth!.userId,
}));

async function cartId(userId: string): Promise<string> {
  const rows = await pool.query<{ id: string }>(
    `INSERT INTO carts (user_id, currency_code) VALUES ($1, 'USD')
     ON CONFLICT (user_id) DO UPDATE SET updated_at = now()
     RETURNING id`,
    [userId],
  );
  return rows.rows[0]!.id;
}

const itemSchema = z.object({
  productId: z.string().regex(/^sku-\d{4}$/),
  quantity: z.number().int().min(1).max(100),
}).strict();

cartRouter.get('/', asyncHandler(async (req, res) => {
  const id = await cartId(req.auth!.userId);
  const { rows } = await pool.query(
    `SELECT s.sku AS id, s.sku, w.name, p.name AS producer, s.price_usd AS price,
            ci.quantity, (s.price_usd * ci.quantity) AS line_total
     FROM cart_items ci
     JOIN skus s ON s.id = ci.sku_id
     JOIN vintages v ON v.id = s.vintage_id
     JOIN wines w ON w.id = v.wine_id
     JOIN producers p ON p.id = w.producer_id
     WHERE ci.cart_id = $1
     ORDER BY ci.id`,
    [id],
  );
  const subtotal = rows.reduce((sum, r) => sum + Number((r as { line_total: string }).line_total), 0);
  res.json({ items: rows, subtotal });
}));

cartRouter.post('/items', validate({ body: itemSchema }), asyncHandler(async (req, res) => {
  const { productId, quantity } = bodyOf<z.infer<typeof itemSchema>>(req);
  const sku = await one<{ id: string }>('SELECT id FROM skus WHERE sku = $1 AND is_active = true', [productId]);
  if (!sku) throw notFound('Product not found');
  const id = await cartId(req.auth!.userId);
  await pool.query(
    `INSERT INTO cart_items (cart_id, sku_id, quantity) VALUES ($1, $2, $3)
     ON CONFLICT (cart_id, sku_id) DO UPDATE SET quantity = EXCLUDED.quantity`,
    [id, sku.id, quantity],
  );
  res.status(201).json({ productId, quantity });
}));

cartRouter.patch('/items/:sku',
  validate({
    params: z.object({ sku: z.string().regex(/^sku-\d{4}$/) }).strict(),
    body: z.object({ quantity: z.number().int().min(1).max(100) }).strict(),
  }),
  asyncHandler(async (req, res) => {
    const { sku } = paramsOf<{ sku: string }>(req);
    const { quantity } = bodyOf<{ quantity: number }>(req);
    const id = await cartId(req.auth!.userId);
    const result = await pool.query(
      'UPDATE cart_items SET quantity = $1 WHERE cart_id = $2 AND sku_id = (SELECT id FROM skus WHERE sku = $3)',
      [quantity, id, sku],
    );
    if (!result.rowCount) throw notFound('Cart item not found');
    res.json({ productId: sku, quantity });
  }),
);

cartRouter.delete('/items/:sku',
  validate({ params: z.object({ sku: z.string().regex(/^sku-\d{4}$/) }).strict() }),
  asyncHandler(async (req, res) => {
    const { sku } = paramsOf<{ sku: string }>(req);
    const id = await cartId(req.auth!.userId);
    await pool.query(
      'DELETE FROM cart_items WHERE cart_id = $1 AND sku_id = (SELECT id FROM skus WHERE sku = $2)',
      [id, sku],
    );
    res.status(204).end();
  }),
);

cartRouter.delete('/', asyncHandler(async (req, res) => {
  const id = await cartId(req.auth!.userId);
  await pool.query('DELETE FROM cart_items WHERE cart_id = $1', [id]);
  res.status(204).end();
}));
