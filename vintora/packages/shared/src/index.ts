/**
 * @vintora/shared — canonical domain types, constants and pure helpers.
 * Every value here conforms to vintora/_canon.md.
 */

export const CANON = {
  brand: 'VINTORA',
  tagline: "The World's Cellar, Intelligent.",
  founded: 2026,
  hq: ['Singapore', 'New York City'],
  modules: [
    'Vintora Market',
    'Vintora Trade',
    'Vintora Sommelier',
    'Vintora Assist',
    'Vintora Studio',
    'Vintora Seller',
    'Vintora Flow',
    'Vintora Club',
    'Vintora Vault',
    'Vintora Rewards',
  ],
  scale: {
    users2034: 100_000_000,
    mau2034: 60_000_000,
    skus: 10_000_000,
    countries: 200,
    peakOrdersPerDay: 1_200_000,
    peakRequestsPerSecond: 50_000,
    p95Ms: 200,
    availability: '99.99%',
    knowledgeGraphEdges: 300_000_000,
    embeddings: 4_500_000_000,
  },
  revenue: {
    y2027: { users: 2_000_000, gmvUsd: 120_000_000, netRevenueUsd: 18_000_000, takeRate: 0.15 },
    y2028: { users: 8_000_000, gmvUsd: 520_000_000, netRevenueUsd: 72_000_000, takeRate: 0.138 },
    y2029: { users: 20_000_000, gmvUsd: 1_200_000_000, netRevenueUsd: 180_000_000, takeRate: 0.15 },
    y2031: { users: 50_000_000, gmvUsd: 5_000_000_000, netRevenueUsd: 750_000_000, takeRate: 0.15 },
    y2034: { users: 100_000_000, gmvUsd: 15_000_000_000, netRevenueUsd: 2_500_000_000, takeRate: 0.167 },
  },
  pricing: {
    marketCommissionBps: { min: 1200, max: 2000, luxuryMin: 800, luxuryMax: 1200 },
    tradeCommissionBps: { min: 300, max: 800 },
    clubMonthlyUsd: [29, 59, 119, 199] as const,
    sellerMonthlyUsd: [0, 99, 399, 999] as const,
    studioMonthlyUsd: [199, 599, 2999] as const,
    vault: { buyFee: 0.015, sellFee: 0.02, custodyAnnual: 0.005, performanceMin: 0.05, performanceMax: 0.15, fractionalMinimumUsd: 25 },
    advertisingRevenueCap: 0.08,
  },
} as const;

export type ModuleName = (typeof CANON.modules)[number];
export type LocaleCode = 'en' | 'fr' | 'es';
export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'SGD' | 'JPY' | 'AUD' | 'AED' | 'BRL';
export type ProductType = 'Red Wine' | 'White Wine' | 'Sparkling' | 'Spirits' | 'Fortified';

export interface PalateProfile {
  body: number;       // 0..5
  dryness: number;    // 0..5
  oak: number;        // 0..5
  fruit: number;      // 0..5
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  producer: string;
  region: string;
  appellation: string;
  vintage: number | null;
  type: ProductType;
  grapes: string[];
  priceUsd: number;
  rating: number;
  reviewCount: number;
  stock: number;
  liquidColor: string;
  palate: PalateProfile;
  notes: string[];
  pairings: string[];
  provenanceScore: number;
  liquidityScore: number;
  story: string;
  custody: string;
}

export interface CartLine {
  productId: string;
  quantity: number;
}

export interface Quote {
  currency: CurrencyCode;
  rate: number;
  subtotal: number;
  shipping: number;
  insurance: number;
  total: number;
  lockedForSeconds: number;
  fxDisclosure: string;
}

export interface SommelierAnswer {
  answer: string;
  citations: string[];
  recommendedProductIds: string[];
  confidence: number;
  safetyNote: string;
  supportNotice?: string;
  responsibleDrinkingCode?: string;
  actionTier: 'recommendation';
  provenance: {
    promptId: string;
    promptVersion: string;
    modelKey: string;
    modelVersion: string;
    retrievalSourceIds: string[];
    factPacketHash: string;
    approvalId: string | null;
  };
}

export interface AgeVerificationResult {
  verified: boolean;
  minimumAge: number;
  calculatedAge: number;
  reason: 'ok' | 'underage' | 'invalid_dob' | 'unsupported_country';
}

/** Indicative FX rates for prototype quoting. Production uses the FX service + locked-rate ledger. */
export const FX_RATES: Record<CurrencyCode, number> = {
  USD: 1, EUR: 0.92, GBP: 0.79, SGD: 1.34,
  JPY: 149, AUD: 1.52, AED: 3.67, BRL: 5.05,
};

/**
 * Illustrative prototype thresholds only. These values drive the local UI gate
 * and are not legal determinations; config/age-assurance-policy.json records
 * every jurisdiction as not_obtained until counsel supplies sourced rules.
 */
const PROTOTYPE_MINIMUM_AGE_ASSUMPTIONS: Record<string, number> = {
  US: 21, AE: 21, JP: 20, CA: 19,
  GB: 18, FR: 18, DE: 18, IT: 18, ES: 18, NL: 18,
  SG: 18, AU: 18, BR: 18, ZA: 18,
};

export function minimumAgeFor(countryCode: string): number {
  return PROTOTYPE_MINIMUM_AGE_ASSUMPTIONS[countryCode.toUpperCase()] ?? 18;
}

export function verifyAge(dobIso: string, countryCode: string, now = new Date()): AgeVerificationResult {
  const min = minimumAgeFor(countryCode);
  const born = new Date(`${dobIso}T00:00:00Z`);
  if (Number.isNaN(born.getTime()) || born > now) {
    return { verified: false, minimumAge: min, calculatedAge: -1, reason: 'invalid_dob' };
  }
  let age = now.getUTCFullYear() - born.getUTCFullYear();
  if (now.getUTCMonth() < born.getUTCMonth() ||
      (now.getUTCMonth() === born.getUTCMonth() && now.getUTCDate() < born.getUTCDate())) {
    age -= 1;
  }
  return {
    verified: age >= min,
    minimumAge: min,
    calculatedAge: age,
    reason: age >= min ? 'ok' : 'underage',
  };
}

export function roundMoney(value: number, currency: CurrencyCode): number {
  const digits = FX_RATES[currency] >= 100 ? 0 : 2;
  return Number(value.toFixed(digits));
}

export function quoteCart(
  lines: CartLine[],
  products: readonly Product[],
  currency: CurrencyCode,
): Quote {
  const byId = new Map(products.map((p) => [p.id, p]));
  const subtotalUsd = lines.reduce((sum, line) => {
    const product = byId.get(line.productId);
    return product ? sum + product.priceUsd * line.quantity : sum;
  }, 0);
  const rate = FX_RATES[currency];
  const shippingUsd = subtotalUsd >= 250 ? 0 : 18;
  const insuranceUsd = subtotalUsd * 0.006;
  return {
    currency,
    rate,
    subtotal: roundMoney(subtotalUsd * rate, currency),
    shipping: roundMoney(shippingUsd * rate, currency),
    insurance: roundMoney(insuranceUsd * rate, currency),
    total: roundMoney((subtotalUsd + shippingUsd + insuranceUsd) * rate, currency),
    lockedForSeconds: 900,
    fxDisclosure: 'Locked FX rate — your total is guaranteed for 15 minutes at checkout.',
  };
}

export const SAFETY_NOTE = 'Please enjoy responsibly. Vintora does not sell to minors. Answers are guidance, not health claims.';

export * from './compliance.js';
export * from './ai-safety.js';
export * from './agent-controls.js';
export * from './privacy-controls.js';
export * from './marketing-controls.js';
export * from './data-governance.js';
export * from './external-marketing-actions.js';
export * from './responsible-drinking.js';
export * from './pricing-controls.js';
export * from './commerce-safeguards.js';
export * from './runtime-boundaries.js';
