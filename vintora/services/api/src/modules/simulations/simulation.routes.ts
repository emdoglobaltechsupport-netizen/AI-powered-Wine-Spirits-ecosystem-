import { Router, type Request } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../lib/async.js';
import { forbidden, notFound } from '../../lib/errors.js';
import {
  authorizedJurisdictions, normalizeJurisdiction, requireAccess,
} from '../../middleware/access.js';
import { bodyOf, paramsOf, validate } from '../../middleware/validate.js';
import { answer, recommendedProducts } from '../../sommelier.js';
import {
  suppliers, rfqs, quotesForRfq, purchaseOrders, creditFacility,
} from '../../trade.js';

/**
 * Interfaces for modules that remain adapter-backed in this build.
 * Every response carries `simulated: true` so callers can never mistake
 * deterministic demo output for a live supplier, model or campaign.
 */
export const simulationRouter = Router();

function rfqJurisdiction(rfqId: string | undefined): string {
  const market = rfqs.find((rfq) => rfq.id === rfqId)?.market ?? '';
  return normalizeJurisdiction(market);
}

function awardValueUsd(req: Parameters<typeof bodyOf>[0]): number {
  const { quoteId } = bodyOf<{ quoteId: string }>(req);
  const rfq = rfqs.find((row) => row.id === paramsOf<{ id: string }>(req).id);
  const quote = quotesForRfq(rfq?.id ?? '').find((row) => row.id === quoteId);
  return Math.round((quote?.pricePerBottleUsd ?? 0) * (rfq?.cases ?? 0) * 12 * 100) / 100;
}

function businessOwner(req: Request): string | undefined {
  return req.auth?.businessAccountId ?? undefined;
}

function businessCurrency(req: Request): string {
  return req.auth?.businessVerification?.creditCurrency ?? 'USD';
}

function allowedJurisdictions(req: Request): Set<string> {
  return new Set(authorizedJurisdictions(req));
}

function purchaseOrderJurisdiction(po: { incoterm: string; items: string }): string {
  const text = `${po.incoterm} ${po.items}`;
  if (/london/i.test(text)) return 'GB';
  if (/new york/i.test(text)) return 'US';
  if (/singapore/i.test(text)) return 'SG';
  if (/paris/i.test(text)) return 'FR';
  return normalizeJurisdiction(po.incoterm);
}

simulationRouter.post('/sommelier/ask',
  validate({
    body: z.object({
      query: z.string().trim().min(2).max(500),
      locale: z.string().length(2).default('en'),
    }).strict(),
  }),
  asyncHandler(async (req, res) => {
    const { query } = bodyOf<{ query: string }>(req);
    const result = answer(query);
    res.json({
      ...result,
      products: recommendedProducts(result.recommendedProductIds),
      simulated: true,
      provider: 'deterministic',
    });
  }),
);

simulationRouter.get('/trade/suppliers',
  requireAccess('trade:supplier:read:tenant', {
    resourceType: 'supplier',
    ownerBusinessAccountId: businessOwner,
  }),
  (req, res) => {
    const category = typeof req.query.category === 'string' ? req.query.category : undefined;
    const list = category ? suppliers.filter((s) => s.categories.includes(category)) : suppliers;
    res.json({ items: list, total: list.length, simulated: true });
  });

simulationRouter.get('/trade/rfqs',
  requireAccess('trade:rfq:read:tenant', {
    resourceType: 'rfq',
    ownerBusinessAccountId: businessOwner,
  }),
  (req, res) => {
    const allowed = allowedJurisdictions(req);
    const items = rfqs.filter((rfq) => allowed.has(rfqJurisdiction(rfq.id)));
    res.json({ items, total: items.length, simulated: true });
  });

simulationRouter.get('/trade/rfqs/:id/quotes',
  validate({ params: z.object({ id: z.string().min(2).max(40) }).strict() }),
  requireAccess('trade:quote:read:tenant', {
    jurisdiction: (req) => rfqJurisdiction(paramsOf<{ id: string }>(req).id),
    resourceType: 'rfq',
    resourceId: (req) => paramsOf<{ id: string }>(req).id,
    ownerBusinessAccountId: businessOwner,
    currency: businessCurrency,
  }),
  asyncHandler(async (req, res) => {
    const { id } = paramsOf<{ id: string }>(req);
    const rfq = rfqs.find((r) => r.id === id);
    if (!rfq) throw notFound('RFQ not found');
    res.json({ rfq, items: quotesForRfq(id), rankedBy: 'landed_cost_per_bottle', simulated: true });
  }),
);

const generatedPos: Array<{
  id: string; rfqId: string; quoteId: string; valueUsd: number; status: string;
  businessAccountId: string | null;
}> = [];
let poSequence = 7830;

simulationRouter.post('/trade/rfqs/:id/award',
  validate({
    params: z.object({ id: z.string().min(2).max(40) }).strict(),
    body: z.object({ quoteId: z.string().min(1).max(60) }).strict(),
  }),
  requireAccess('trade:order:write:tenant', {
    jurisdiction: (req) => rfqJurisdiction(paramsOf<{ id: string }>(req).id),
    resourceType: 'rfq',
    resourceId: (req) => paramsOf<{ id: string }>(req).id,
    ownerBusinessAccountId: businessOwner,
    amountUsd: awardValueUsd,
    currency: businessCurrency,
  }),
  asyncHandler(async (req, res) => {
    // B2B award remains a local simulation: no contract, payment or supplier call.
    // Verification, licence, contract, jurisdiction, credit and currency are
    // derived from the authenticated session and server records, never headers.
    const { id } = paramsOf<{ id: string }>(req);
    const { quoteId } = bodyOf<{ quoteId: string }>(req);
    const rfq = rfqs.find((r) => r.id === id);
    if (!rfq) throw notFound('RFQ not found');
    const quote = quotesForRfq(id).find((q) => q.id === quoteId);
    if (!quote) throw notFound('Quote not found for this RFQ');
    const businessAccountId = req.auth!.businessAccountId ?? null;
    const existing = generatedPos.find((po) => po.quoteId === quote.id);
    if (existing) {
      if (existing.businessAccountId !== businessAccountId) {
        throw forbidden('This quote has already been awarded to another business account');
      }
      const { businessAccountId: _owner, ...purchaseOrder } = existing;
      res.status(200).json({ purchaseOrder, idempotentReplay: true, simulated: true });
      return;
    }
    const po = {
      id: `PO-${++poSequence}`,
      rfqId: rfq.id,
      quoteId: quote.id,
      valueUsd: Math.round(quote.pricePerBottleUsd * rfq.cases * 12 * 100) / 100,
      status: 'Confirmed — awaiting pickup',
      businessAccountId,
    };
    generatedPos.push(po);
    const { businessAccountId: _owner, ...purchaseOrder } = po;
    res.status(201).json({
      purchaseOrder,
      message: 'Contract terms, Incoterm and licensed delivery route locked (simulation only).',
      simulated: true,
    });
  }),
);

simulationRouter.get('/trade/purchase-orders',
  requireAccess('trade:rfq:read:tenant', {
    resourceType: 'purchase-order',
    ownerBusinessAccountId: businessOwner,
    currency: businessCurrency,
  }),
  (req, res) => {
    const allowed = allowedJurisdictions(req);
    const mapped = [
      ...generatedPos.map((po) => ({
        id: po.id,
        quoteId: po.quoteId,
        supplier: 'Awarded supplier',
        items: po.rfqId,
        valueUsd: po.valueUsd,
        status: po.status,
        incoterm: 'DAP',
        eta: 'Pending pickup',
        jurisdiction: rfqJurisdiction(po.rfqId),
      })),
      ...purchaseOrders.map((po) => ({ ...po, jurisdiction: purchaseOrderJurisdiction(po) })),
    ];
    const items = mapped.filter((po) => allowed.has(po.jurisdiction));
    res.json({ items, total: items.length, simulated: true });
  });

simulationRouter.get('/trade/credit',
  requireAccess('trade:credit:read:tenant', {
    resourceType: 'credit-facility',
    ownerBusinessAccountId: businessOwner,
    currency: businessCurrency,
  }),
  (req, res) => {
    const available = req.auth?.businessVerification
      ? Math.max(0, req.auth.businessVerification.creditLimit
        - req.auth.businessVerification.creditUsed
        - req.auth.businessVerification.reservedCredit)
      : 0;
    res.json({
      ...creditFacility,
      availableUsd: available,
      source: 'server-verified-credit',
      simulated: true,
    });
  });
