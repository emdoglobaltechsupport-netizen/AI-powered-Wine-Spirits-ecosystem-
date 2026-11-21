import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CANON,
  FX_RATES,
  SAFETY_NOTE,
  minimumAgeFor,
  quoteCart,
  roundMoney,
  verifyAge,
  type Product,
} from './index.js';

const sampleProducts: Product[] = [
  {
    id: 'sku-1001', sku: 'sku-1001', name: 'Château Margaux', producer: 'Château Margaux',
    region: 'Bordeaux, France', appellation: 'Margaux AOC', vintage: 2016, type: 'Red Wine',
    grapes: [], priceUsd: 1290, rating: 4.9, reviewCount: 1284, stock: 12, liquidColor: '#4a1024',
    palate: { body: 5, dryness: 4, oak: 4, fruit: 4 }, notes: [], pairings: [],
    provenanceScore: 99, liquidityScore: 88, story: '', custody: '',
  },
  {
    id: 'sku-1005', sku: 'sku-1005', name: 'Riesling Kabinett Trocken', producer: 'Weingut Rheingau',
    region: 'Rheingau, Germany', appellation: 'Rheingau QbA', vintage: 2022, type: 'White Wine',
    grapes: [], priceUsd: 32, rating: 4.6, reviewCount: 734, stock: 120, liquidColor: '#d8bf5a',
    palate: { body: 2, dryness: 4, oak: 0, fruit: 5 }, notes: [], pairings: [],
    provenanceScore: 94, liquidityScore: 60, story: '', custody: '',
  },
];

test('canon identity and module names are stable', () => {
  assert.equal(CANON.brand, 'VINTORA');
  assert.equal(CANON.tagline, "The World's Cellar, Intelligent.");
  assert.deepEqual([...CANON.modules], [
    'Vintora Market', 'Vintora Trade', 'Vintora Sommelier', 'Vintora Assist',
    'Vintora Studio', 'Vintora Seller', 'Vintora Flow', 'Vintora Club',
    'Vintora Vault', 'Vintora Rewards',
  ]);
});

test('canon scale and financial targets', () => {
  assert.equal(CANON.scale.users2034, 100_000_000);
  assert.equal(CANON.scale.skus, 10_000_000);
  assert.equal(CANON.scale.peakRequestsPerSecond, 50_000);
  assert.deepEqual(
    { ...CANON.revenue.y2027 },
    { users: 2_000_000, gmvUsd: 120_000_000, netRevenueUsd: 18_000_000, takeRate: 0.15 },
  );
  assert.equal(CANON.revenue.y2034.users, 100_000_000);
  assert.equal(CANON.revenue.y2034.gmvUsd, 15_000_000_000);
});

test('all eight currencies have positive rates', () => {
  assert.equal(Object.keys(FX_RATES).length, 8);
  for (const [code, rate] of Object.entries(FX_RATES)) {
    assert.ok(rate > 0, `${code} rate must be positive`);
  }
  assert.equal(FX_RATES.USD, 1);
});

test('minimumAgeFor honours jurisdiction overrides and default', () => {
  assert.equal(minimumAgeFor('US'), 21);
  assert.equal(minimumAgeFor('AE'), 21);
  assert.equal(minimumAgeFor('JP'), 20);
  assert.equal(minimumAgeFor('CA'), 19);
  assert.equal(minimumAgeFor('GB'), 18);
  assert.equal(minimumAgeFor('us'), 21);
  assert.equal(minimumAgeFor('ZZ'), 18);
});

test('verifyAge accepts an adult in every launch market', () => {
  const now = new Date('2026-11-19T12:00:00Z');
  const result = verifyAge('1990-05-15', 'US', now);
  assert.equal(result.verified, true);
  assert.equal(result.minimumAge, 21);
  assert.equal(result.calculatedAge, 36);
  assert.equal(result.reason, 'ok');
});

test('verifyAge rejects underage users against local minimum', () => {
  const now = new Date('2026-11-19T12:00:00Z');
  const us = verifyAge('2010-01-01', 'US', now);
  assert.equal(us.verified, false);
  assert.equal(us.reason, 'underage');
  assert.equal(us.minimumAge, 21);

  const gb = verifyAge('2008-01-01', 'GB', now);
  assert.equal(gb.verified, true, 'same DOB is legal in an 18+ market');
});

test('verifyAge handles birthday boundaries and invalid input', () => {
  const now = new Date('2026-11-19T12:00:00Z');
  assert.equal(verifyAge('2005-11-20', 'US', now).reason, 'underage', 'day before 21st birthday');
  assert.equal(verifyAge('2005-11-19', 'US', now).verified, true, 'on 21st birthday');
  assert.equal(verifyAge('not-a-date', 'US', now).reason, 'invalid_dob');
  assert.equal(verifyAge('2099-01-01', 'US', now).reason, 'invalid_dob');
});

test('roundMoney drops minor units for JPY', () => {
  assert.equal(roundMoney(12.345, 'USD'), 12.35);
  assert.equal(roundMoney(12.345, 'JPY'), 12);
});

test('quoteCart computes subtotal, shipping and insurance consistently', () => {
  const quote = quoteCart(
    [{ productId: 'sku-1005', quantity: 2 }],
    sampleProducts,
    'USD',
  );
  assert.equal(quote.subtotal, 64);
  assert.equal(quote.shipping, 18, 'orders under $250 pay shipping');
  assert.equal(quote.insurance, 0.38, '0.6% insured value');
  assert.equal(quote.total, 82.38);
  assert.equal(quote.lockedForSeconds, 900);
  assert.match(quote.fxDisclosure, /15 minutes/);
});

test('quoteCart applies FX and free shipping above threshold', () => {
  const quote = quoteCart(
    [{ productId: 'sku-1001', quantity: 1 }],
    sampleProducts,
    'EUR',
  );
  assert.equal(quote.rate, 0.92);
  assert.equal(quote.subtotal, 1186.8);
  assert.equal(quote.shipping, 0, 'orders above $250 ship free');
  assert.equal(quote.insurance, 7.12, 'insurance is quoted in the locked currency');
  assert.equal(quote.total, 1193.92);
});

test('quoteCart ignores unknown product ids', () => {
  const quote = quoteCart([{ productId: 'missing', quantity: 3 }], sampleProducts, 'USD');
  assert.equal(quote.total, 18, 'only shipping remains on an empty basket');
});

test('safety note is always present', () => {
  assert.match(SAFETY_NOTE, /enjoy responsibly/i);
  assert.match(SAFETY_NOTE, /not health claims/i);
});
