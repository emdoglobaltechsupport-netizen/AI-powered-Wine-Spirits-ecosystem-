import { randomBytes } from 'node:crypto';
import type { Request } from 'express';
import { Router } from 'express';
import { z } from 'zod';
import { FX_RATES, quoteCart, type CartLine, type CurrencyCode, type Product } from '@vintora/shared';
import { config } from '../../config.js';
import { one, query, transaction } from '../../db/pool.js';
import { evaluateCheckoutSafeguards } from '../commerce/commerce-safeguards.service.js';
import { asyncHandler } from '../../lib/async.js';
import { badRequest, conflict, forbidden, notFound } from '../../lib/errors.js';
import { CATALOGUE_CHECKOUT_ELIGIBILITY } from '../catalog/catalog.routes.js';
import { requireAccess, requestJurisdiction } from '../../middleware/access.js';
import { requireAge, requireUser } from '../../middleware/auth.js';
import { bodyOf, validate } from '../../middleware/validate.js';

export const checkoutRouter = Router();
checkoutRouter.use(requireUser);
checkoutRouter.use(requireAccess('market:checkout:tenant', {
  resourceType: 'checkout',
  jurisdiction: requestJurisdiction,
  ownerUserId: (req) => req.auth!.userId,
}));

const currencySchema = z.enum(Object.keys(FX_RATES) as [CurrencyCode, ...CurrencyCode[]]);
const jurisdictionSchema = z.string().trim().min(2).max(30)
  .regex(/^[A-Za-z]+(?:_[A-Za-z]+)*$/, 'Use a 2-letter country code or fixture label');
const quoteSchema = z.object({
  currency: currencySchema,
  jurisdiction: jurisdictionSchema.optional(),
}).strict();
const orderSchema = z.object({
  currency: currencySchema,
  idempotencyKey: z.string().uuid().optional(),
  jurisdiction: jurisdictionSchema.optional(),
}).strict();

/** An explicit checkout jurisdiction is scoped to safeguard evaluation only. */
function safeguardJurisdiction(req: Request): string {
  const requested = bodyOf<{ jurisdiction?: string }>(req).jurisdiction;
  return requested ? requested.toUpperCase() : requestJurisdiction(req);
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Demo catalogue rows can support a clearly labelled simulation only. Any
 * non-simulated PSP or verified-source configuration fails closed here, so an
 * unverified listing can never enter a live checkout path.
 */
function assertCheckoutCatalogueEligibility(): void {
  if (config.CATALOGUE_SOURCE !== 'demo') {
    throw forbidden('Verified catalogue checkout adapter is not enabled in the prototype', {
      configuredSource: config.CATALOGUE_SOURCE,
    });
  }
  if (config.PAYMENT_PROVIDER !== 'simulated') {
    throw forbidden('Live checkout is disabled for unverified catalogue rows', {
      sourceClass: CATALOGUE_CHECKOUT_ELIGIBILITY.sourceClass,
      requiredRecordClass: 'live',
      requiredEvidence: 'licensed-feed, verified listing and regulated payment approval',
    });
  }
}

interface CartRow {
  sku_id: string; sku: string; name: string; price_usd: string; quantity: number;
}

async function loadCart(userId: string): Promise<CartRow[]> {
  return query<CartRow>(
    `SELECT ci.sku_id, s.sku, w.name, s.price_usd, ci.quantity
     FROM cart_items ci
     JOIN carts c ON c.id = ci.cart_id
     JOIN skus s ON s.id = ci.sku_id
     JOIN vintages v ON v.id = s.vintage_id
     JOIN wines w ON w.id = v.wine_id
     WHERE c.user_id = $1 ORDER BY ci.id`,
    [userId],
  );
}

function buildQuote(cart: CartRow[], currency: CurrencyCode) {
  const lines: CartLine[] = cart.map((r) => ({ productId: r.sku, quantity: r.quantity }));
  const products = cart.map((r) => ({
    id: r.sku,
    priceUsd: Number(r.price_usd),
  })) as Product[];
  return quoteCart(lines, products, currency);
}

checkoutRouter.post('/quote', requireAge, validate({ body: quoteSchema }),
  asyncHandler(async (req, res) => {
    assertCheckoutCatalogueEligibility();
    const { currency } = bodyOf<{ currency: CurrencyCode }>(req);
    await evaluateCheckoutSafeguards({
      tenantId: req.auth!.tenantId,
      userId: req.auth!.userId,
      jurisdiction: safeguardJurisdiction(req),
      ageVerified: req.auth!.ageVerified,
      ageVerifiedAt: req.auth!.ageVerifiedAt,
    }, req.id);
    const cart = await loadCart(req.auth!.userId);
    if (!cart.length) throw badRequest('Your cart is empty');
    res.json({ ...buildQuote(cart, currency), catalogueEligibility: CATALOGUE_CHECKOUT_ELIGIBILITY });
  }),
);

checkoutRouter.post('/orders', requireAge, validate({ body: orderSchema }),
  asyncHandler(async (req, res) => {
    assertCheckoutCatalogueEligibility();
    const { currency, idempotencyKey: bodyKey } = bodyOf<{
      currency: CurrencyCode;
      idempotencyKey?: string;
    }>(req);
    const idempotencyKey = bodyKey ?? req.header('idempotency-key')?.trim();
    if (!idempotencyKey || !UUID_PATTERN.test(idempotencyKey)) {
      throw badRequest('A valid idempotency key is required', {
        source: 'body.idempotencyKey or Idempotency-Key header',
      });
    }

    const existing = await one<{ order_number: string }>(
      'SELECT order_number FROM orders WHERE user_id = $1 AND idempotency_key = $2',
      [req.auth!.userId, idempotencyKey],
    );
    if (existing) {
      res.json({ orderNumber: existing.order_number, idempotentReplay: true });
      return;
    }

    await evaluateCheckoutSafeguards({
      tenantId: req.auth!.tenantId,
      userId: req.auth!.userId,
      jurisdiction: safeguardJurisdiction(req),
      ageVerified: req.auth!.ageVerified,
      ageVerifiedAt: req.auth!.ageVerifiedAt,
    }, req.id);

    const result = await transaction(async (client) => {
      const cartResult = await client.query<CartRow>(
        `SELECT ci.sku_id, s.sku, w.name, s.price_usd, ci.quantity
         FROM cart_items ci
         JOIN carts c ON c.id = ci.cart_id
         JOIN skus s ON s.id = ci.sku_id
         JOIN vintages v ON v.id = s.vintage_id
         JOIN wines w ON w.id = v.wine_id
         WHERE c.user_id = $1 ORDER BY ci.id FOR UPDATE OF ci`,
        [req.auth!.userId],
      );
      const cart = cartResult.rows;
      if (!cart.length) throw badRequest('Your cart is empty');

      const age = await client.query<{ id: string }>(
        `SELECT id FROM age_verifications
         WHERE user_id = $1 AND status = 'verified' AND verified_at IS NOT NULL
         ORDER BY verified_at DESC LIMIT 1`,
        [req.auth!.userId],
      );
      if (!age.rowCount) throw badRequest('Verified age assertion required');

      const quote = buildQuote(cart, currency);

      for (const line of cart) {
        const updated = await client.query(
          `UPDATE inventory_items SET quantity_on_hand = quantity_on_hand - $1
           WHERE id = (
             SELECT id FROM inventory_items
             WHERE sku_id = $2 AND quantity_on_hand >= $1
             ORDER BY quantity_on_hand DESC LIMIT 1
           )`,
          [line.quantity, line.sku_id],
        );
        if (!updated.rowCount) throw conflict(`Insufficient stock for ${line.sku}`);
      }

      const orderNumber = `VNT-${Date.now().toString(36).toUpperCase()}-${randomBytes(2).toString('hex').toUpperCase()}`;
      const orderResult = await client.query<{ id: string; created_at: Date }>(
        `INSERT INTO orders
           (order_number, user_id, status, currency_code, fx_rate, subtotal,
            shipping_fee, insurance_fee, total, age_verification_id, placed_at, idempotency_key)
         VALUES ($1, $2, 'paid', $3, $4, $5, $6, $7, $8, $9, now(), $10)
         RETURNING id, created_at`,
        [
          orderNumber, req.auth!.userId, currency, quote.rate,
          quote.subtotal, quote.shipping, quote.insurance, quote.total,
          age.rows[0]!.id, idempotencyKey,
        ],
      );
      const order = orderResult.rows[0]!;

      for (const line of cart) {
        await client.query(
          `INSERT INTO order_items (order_id, sku_id, quantity, unit_price, line_total)
           VALUES ($1, $2, $3, $4, $5)`,
          [order.id, line.sku_id, line.quantity, Number(line.price_usd), Number(line.price_usd) * line.quantity],
        );
      }

      await client.query(
        `INSERT INTO payments (order_id, processor, amount, currency_code, status, idempotency_key)
         VALUES ($1, $2, $3, $4, 'captured', $5)`,
        [order.id, config.PAYMENT_PROVIDER, quote.total, currency, idempotencyKey],
      );

      await client.query(
        'DELETE FROM cart_items WHERE cart_id = (SELECT id FROM carts WHERE user_id = $1)',
        [req.auth!.userId],
      );

      return { orderNumber, total: quote.total, currency, createdAt: order.created_at };
    });

    res.status(201).json({
      ...result,
      simulated: config.PAYMENT_PROVIDER === 'simulated',
      catalogueEligibility: CATALOGUE_CHECKOUT_ELIGIBILITY,
    });
  }),
);
