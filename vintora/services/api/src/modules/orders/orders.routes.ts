import { Router } from 'express';
import { z } from 'zod';
import { tenantQuery } from '../../db/tenant.js';
import { notFound } from '../../lib/errors.js';
import { asyncHandler } from '../../lib/async.js';
import { requireAccess } from '../../middleware/access.js';
import { requireUser } from '../../middleware/auth.js';
import { paramsOf, validate } from '../../middleware/validate.js';

export const ordersRouter = Router();
ordersRouter.use(requireUser);
ordersRouter.use(requireAccess('market:browse:tenant', { resourceType: 'order' }));

ordersRouter.get('/:orderNumber',
  validate({ params: z.object({ orderNumber: z.string().min(6).max(40) }).strict() }),
  asyncHandler(async (req, res) => {
    const { orderNumber } = paramsOf<{ orderNumber: string }>(req);
    const rows = await tenantQuery<{
      id: string; order_number: string; status: string; currency_code: string;
      total: string; placed_at: Date | null;
    }>(
      `SELECT id, order_number, status, currency_code, total, placed_at
       FROM orders WHERE order_number = $1 AND user_id = $2`,
      [orderNumber, req.auth!.userId],
      req.auth!.tenantId,
      req.auth!.userId,
    );
    const order = rows[0];
    if (!order) throw notFound('Order not found');

    const items = await tenantQuery(
      `SELECT s.sku AS product_id, w.name, oi.quantity, oi.unit_price, oi.line_total
       FROM order_items oi
       JOIN skus s ON s.id = oi.sku_id
       JOIN vintages v ON v.id = s.vintage_id
       JOIN wines w ON w.id = v.wine_id
       WHERE oi.order_id = $1 ORDER BY oi.id`,
      [order.id],
      req.auth!.tenantId,
      req.auth!.userId,
    );
    res.json({ ...order, items, simulated: true });
  }),
);
