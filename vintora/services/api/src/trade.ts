/* Vintora Trade — B2B wholesale domain contracts.
   Deterministic, in-memory demo data mirroring the prototype. Replace with
   repository-backed services in a production deployment. */

export interface Supplier {
  id: string;
  name: string;
  market: string;
  categories: string[];
  rating: number;
  orders: number;
  onTime: number;
  terms: string;
  moq: number;
  leadDays: number;
  verified: boolean;
}

export interface Rfq {
  id: string;
  productId: string;
  cases: number;
  market: string;
  targetPerBottleUsd: number;
  status: 'Draft' | 'Open' | 'Quotes received' | 'Awarded';
  quotes: number;
  created: string;
  incoterm: 'DAP' | 'DDP';
}

export interface SupplierQuote {
  id: string;
  rfqId: string;
  supplierId: string;
  supplier: string;
  pricePerBottleUsd: number;
  incoterm: string;
  leadDays: number;
  moqCases: number;
  rating: number;
  validUntil: string;
}

export interface PurchaseOrder {
  id: string;
  supplier: string;
  items: string;
  valueUsd: number;
  status: string;
  incoterm: string;
  eta: string;
}

export const suppliers: Supplier[] = [
  { id: 'sup-01', name: 'Meridian Wine Co.', market: 'Bordeaux, FR', categories: ['Red Wine', 'Sparkling'], rating: 4.8, orders: 142, onTime: 97, terms: 'Net 30', moq: 5, leadDays: 12, verified: true },
  { id: 'sup-02', name: 'Casa Vino SRL', market: 'Piedmont, IT', categories: ['Red Wine'], rating: 4.9, orders: 318, onTime: 99, terms: 'Net 45', moq: 3, leadDays: 9, verified: true },
  { id: 'sup-03', name: 'Clos Distribution', market: 'Burgundy, FR', categories: ['White Wine', 'Sparkling'], rating: 4.7, orders: 96, onTime: 95, terms: 'Net 30', moq: 6, leadDays: 14, verified: true },
  { id: 'sup-04', name: 'Nippon Spirits KK', market: 'Kyoto, JP', categories: ['Spirits'], rating: 4.9, orders: 74, onTime: 98, terms: 'Net 60', moq: 2, leadDays: 21, verified: true },
  { id: 'sup-05', name: 'Etna Export Group', market: 'Sicily, IT', categories: ['Red Wine'], rating: 4.6, orders: 211, onTime: 94, terms: 'Net 30', moq: 8, leadDays: 16, verified: true },
  { id: 'sup-06', name: 'Douro Direct Lda', market: 'Douro, PT', categories: ['Fortified', 'Red Wine'], rating: 4.7, orders: 63, onTime: 96, terms: 'Net 30', moq: 4, leadDays: 16, verified: false },
];

export const rfqs: Rfq[] = [
  { id: 'RFQ-2041', productId: 'sku-1002', cases: 24, market: 'London, UK', targetPerBottleUsd: 152, status: 'Quotes received', quotes: 3, created: '18 Nov', incoterm: 'DAP' },
  { id: 'RFQ-2040', productId: 'sku-1005', cases: 60, market: 'New York, US', targetPerBottleUsd: 26, status: 'Awarded', quotes: 5, created: '15 Nov', incoterm: 'DDP' },
  { id: 'RFQ-2039', productId: 'sku-1010', cases: 12, market: 'Singapore', targetPerBottleUsd: 98, status: 'Open', quotes: 1, created: '12 Nov', incoterm: 'DAP' },
  { id: 'RFQ-2038', productId: 'sku-1004', cases: 40, market: 'Paris, FR', targetPerBottleUsd: 34, status: 'Draft', quotes: 0, created: '09 Nov', incoterm: 'DAP' },
];

export const quotes: SupplierQuote[] = [
  { id: 'Q-8812', rfqId: 'RFQ-2041', supplierId: 'sup-01', supplier: 'Meridian Wine Co.', pricePerBottleUsd: 152, incoterm: 'DAP London', leadDays: 12, moqCases: 5, rating: 4.8, validUntil: '27 Nov' },
  { id: 'Q-8813', rfqId: 'RFQ-2041', supplierId: 'sup-02', supplier: 'Casa Vino SRL', pricePerBottleUsd: 148, incoterm: 'DDP London', leadDays: 9, moqCases: 3, rating: 4.9, validUntil: '25 Nov' },
  { id: 'Q-8814', rfqId: 'RFQ-2041', supplierId: 'sup-05', supplier: 'Etna Export Group', pricePerBottleUsd: 139, incoterm: 'DAP London', leadDays: 16, moqCases: 8, rating: 4.6, validUntil: '29 Nov' },
  { id: 'Q-8809', rfqId: 'RFQ-2040', supplierId: 'sup-03', supplier: 'Clos Distribution', pricePerBottleUsd: 24, incoterm: 'DDP New York', leadDays: 14, moqCases: 6, rating: 4.7, validUntil: 'Awarded' },
  { id: 'Q-8802', rfqId: 'RFQ-2039', supplierId: 'sup-04', supplier: 'Nippon Spirits KK', pricePerBottleUsd: 96, incoterm: 'DAP Singapore', leadDays: 21, moqCases: 2, rating: 4.9, validUntil: '03 Dec' },
];

export const purchaseOrders: PurchaseOrder[] = [
  { id: 'PO-7821', supplier: 'Casa Vino SRL', items: 'Etna Rosso 2021 · 60 bottles', valueUsd: 2640, status: 'In transit', incoterm: 'DDP London', eta: '24 Nov' },
  { id: 'PO-7818', supplier: 'Meridian Wine Co.', items: 'Barolo Cannubi 2018 · 24 bottles', valueUsd: 3552, status: 'Customs', incoterm: 'DAP London', eta: '27 Nov' },
  { id: 'PO-7804', supplier: 'Clos Distribution', items: 'Riesling Kabinett · 120 bottles', valueUsd: 2880, status: 'Delivered', incoterm: 'DDP New York', eta: '12 Nov' },
];

/** Landed cost per bottle = unit price + insured freight + duty estimate.
    DDP quotes include duty; DAP quotes add a 4.5% destination-duty estimate. */
export function landedCostPerBottle(quote: SupplierQuote): number {
  const freightPerBottle = 2.4;
  const duty = quote.incoterm.startsWith('DDP') ? 0 : quote.pricePerBottleUsd * 0.045;
  return Math.round((quote.pricePerBottleUsd + freightPerBottle + duty) * 100) / 100;
}

export function quotesForRfq(rfqId: string) {
  const rfq = rfqs.find((r) => r.id === rfqId);
  const target = rfq?.targetPerBottleUsd ?? 0;
  return quotes
    .filter((q) => q.rfqId === rfqId)
    .map((q) => ({
      ...q,
      landedCostPerBottleUsd: landedCostPerBottle(q),
      savingVsTargetUsd: Math.round((target - q.pricePerBottleUsd) * 100) / 100,
    }))
    .sort((a, b) => a.landedCostPerBottleUsd - b.landedCostPerBottleUsd);
}

export const creditFacility = {
  limitUsd: 200_000,
  usedUsd: 84_200,
  availableUsd: 115_800,
  utilisationPct: 42.1,
  terms: ['Net 30', 'Net 45'],
  interestOnOverdueMonthlyPct: 1.2,
  security: 'Inventory-backed',
  reviewedQuarterly: true,
  payablesAgeing: [
    { bucket: 'Current', amountUsd: 26_400, pct: 62 },
    { bucket: '1–30 days', amountUsd: 11_800, pct: 28 },
    { bucket: '31–60 days', amountUsd: 3_400, pct: 8 },
    { bucket: '60+ days', amountUsd: 600, pct: 2 },
  ],
  settlementMethods: ['SEPA / SEPA Instant', 'ACH & wire', 'Local methods (iDEAL, Pix, UPI)', 'USDC (Vault settlement — design target only; no live settlement)'],
};
