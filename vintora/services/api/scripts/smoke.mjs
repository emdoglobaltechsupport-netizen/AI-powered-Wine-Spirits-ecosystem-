/* Vintora API smoke test.
   Start the API first, then run: npm.cmd run test:smoke --workspace @vintora/api
   Uses Node built-ins plus the API's pg client for repeatable demo stock. */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config({ path: fileURLToPath(new URL('../../../.env', import.meta.url)) });

const base = process.env.API_BASE_URL ?? 'http://localhost:4000';
let passed = 0;
let failed = 0;

async function request(path, options = {}) {
  const { headers, ...rest } = options;
  const response = await fetch(base + path, {
    ...rest,
    headers: { 'content-type': 'application/json', ...(headers ?? {}) },
  });
  const text = await response.text();
  let body = {};
  try { body = text ? JSON.parse(text) : {}; } catch { body = { raw: text }; }
  const setCookie = typeof response.headers.getSetCookie === 'function'
    ? response.headers.getSetCookie()
    : [response.headers.get('set-cookie')].filter(Boolean);
  return { status: response.status, body, setCookie, headers: response.headers };
}

// Checkout decrements inventory. Restore the demo SKU used below so the smoke
// test remains repeatable without re-running the full seed.
async function resetDemoStock() {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query(
      `UPDATE inventory_items SET quantity_on_hand = 50
       WHERE sku_id = (SELECT id FROM skus WHERE sku = 'sku-1005')
         AND quantity_on_hand < 50`,
    );
  } finally {
    await client.end();
  }
}

async function check(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`PASS ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${name}: ${error.message}`);
  }
}

function sessionCookie(result) {
  const raw = result.setCookie.find((value) => value.startsWith('vintora_session='));
  assert.ok(raw, 'expected a session cookie');
  return raw.split(';')[0];
}

async function login(email, password) {
  const result = await request('/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  assert.equal(result.status, 200, JSON.stringify(result.body));
  return sessionCookie(result);
}

async function register(email, password, displayName) {
  const result = await request('/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, displayName }),
  });
  assert.equal(result.status, 201, JSON.stringify(result.body));
  return sessionCookie(result);
}

await resetDemoStock();
console.log(`Vintora API smoke test → ${base}`);

await check('GET /health reports a healthy database', async () => {
  const { status, body } = await request('/health');
  assert.equal(status, 200);
  assert.equal(body.status, 'ok');
  assert.equal(body.brand, 'VINTORA');
  assert.equal(body.modules, 10);
  assert.equal(body.runtimeProfile, 'local');
  assert.equal(body.runtimeBoundaryOk, true);
  assert.equal(body.db.ok, true);
});

await check('GET /v1/canon returns the locked canon', async () => {
  const { status, body, headers } = await request('/v1/canon');
  assert.equal(status, 200);
  assert.equal(headers.get('x-vintora-api-version'), 'v1');
  assert.ok(headers.get('ratelimit-limit'));
  assert.ok(headers.get('ratelimit-remaining'));
  assert.equal(body.scale.users2034, 100_000_000);
  assert.equal(body.modules.length, 10);
  assert.equal(body.pricing.advertisingRevenueCap, 0.08);
  const unsupported = await request('/v1/canon', { headers: { 'accept-version': 'v9' } });
  assert.equal(unsupported.status, 400);
  assert.equal(unsupported.body.error, 'invalid_request');
  assert.deepEqual(unsupported.body.details.supported, ['v1']);
  assert.equal(unsupported.headers.get('x-vintora-api-version'), 'v1');
});

await check('GET /v1/reference and /v1/fx/rates expose reference data', async () => {
  const [reference, fx] = await Promise.all([
    request('/v1/reference'),
    request('/v1/fx/rates'),
  ]);
  assert.equal(reference.status, 200);
  assert.equal(reference.body.clubPlans.length, 4);
  assert.equal(reference.body.simulatedProviders.payments, 'simulated');
  assert.equal(fx.status, 200);
  assert.equal(Object.keys(fx.body.rates).length, 8);
  assert.equal(fx.body.lockedForSeconds, 900);
});

await check('GET /v1/products lists and filters the DB-backed catalogue', async () => {
  const all = await request('/v1/products?limit=100');
  assert.equal(all.status, 200);
  assert.equal(all.body.items.length, 12);
  assert.ok(all.body.items.every((item) => item.id.startsWith('sku-')));
  assert.equal(all.body.catalogueSource.dataClass, 'demo');
  assert.equal(all.body.catalogueSource.sourceClass, 'seed');
  assert.equal(all.body.catalogueSource.fixtureClass, 'demo');
  assert.equal(all.body.catalogueSource.purchasable, false);
  assert.equal(all.body.catalogueSource.externalCheckoutBlocked, true);
  assert.ok(all.body.items.every((item) => item.dataClass === 'demo' && item.sourceClass === 'seed' && item.purchasable === false));
  assert.match(all.body.catalogueSource.sourceLabel, /not verified inventory/);
  const filtered = await request('/v1/products?q=riesling');
  assert.equal(filtered.body.items.length, 1);
  assert.equal(filtered.body.items[0].id, 'sku-1005');
});

await check('GET /v1/products/:id returns a bottle and 404s for unknown ids', async () => {
  const found = await request('/v1/products/sku-1002');
  assert.equal(found.status, 200);
  assert.equal(found.body.name, 'Barolo Cannubi');
  assert.equal(found.body.dataClass, 'demo');
  assert.equal(found.body.sourceClass, 'seed');
  assert.equal(found.body.fixtureClass, 'demo');
  assert.equal(found.body.purchasable, false);
  assert.equal(found.body.sourceRef, 'packages/db/seed/001_seed.sql');
  const missing = await request('/v1/products/sku-9999');
  assert.equal(missing.status, 404);
});

await check('auth and cart routes require a session', async () => {
  const [me, cart] = await Promise.all([
    request('/v1/auth/me'),
    request('/v1/cart'),
  ]);
  assert.equal(me.status, 401);
  assert.equal(cart.status, 401);
});

// A fresh storefront identity keeps the age precondition and cart checks
// repeatable no matter how many times the smoke test has already run.
const userPassword = process.env.SEED_USER_PASSWORD;
const adminPassword = process.env.SEED_ADMIN_PASSWORD;
if (!userPassword || !adminPassword) {
  throw new Error('SEED_USER_PASSWORD and SEED_ADMIN_PASSWORD are required (run `npm run setup`).');
}

const smokeEmail = `smoke-${randomUUID().slice(0, 8)}@vintora.local`;
const demoCookie = await register(smokeEmail, userPassword, 'Smoke Collector');
const withDemo = (path, options = {}) => request(path, {
  ...options,
  headers: { cookie: demoCookie, ...(options.headers ?? {}) },
});

await check('commerce safeguards expose a fail-closed prototype control plane', async () => {
  const controls = await withDemo('/v1/commerce/safeguards/controls');
  assert.equal(controls.status, 200, JSON.stringify(controls.body));
  assert.equal(controls.body.prototypeMode, true);
  assert.equal(controls.body.publicLaunch, false);
  assert.equal(controls.body.enforcement, 'fail-closed');
  assert.deepEqual(controls.body.requiredControls, ['age', 'kyc', 'aml', 'sanctions', 'payment']);
  assert.equal(controls.body.maxEvidenceAgeMinutes, 15);
  assert.equal(controls.body.maxAgeEvidenceHours, 720);
  assert.match(controls.body.note, /No real screening/);

  const evaluated = await withDemo('/v1/commerce/safeguards/evaluate', {
    method: 'POST',
    body: JSON.stringify({ jurisdiction: 'US' }),
  });
  assert.equal(evaluated.status, 403, JSON.stringify(evaluated.body));
  assert.equal(evaluated.body.details.reasonCode, 'missing_age_evidence');
});

await check('privacy defaults deny personal-data use until explicit versioned opt-in', async () => {
  const controls = await withDemo('/v1/privacy/controls');
  assert.equal(controls.status, 200, JSON.stringify(controls.body));
  assert.equal(controls.body.personalizationEnabled, false);
  assert.equal(controls.body.defaultState, 'off');
  assert.equal(controls.body.purposeSeparation, true);
  assert.equal(controls.body.retention.enforced, false);
  assert.equal(controls.body.dpia.completed, false);

  const correlationId = `smoke-privacy-${Date.now()}`;
  const evaluate = (suffix, dataCategory = 'taste_profile') => withDemo('/v1/privacy/data-use/evaluate', {
    method: 'POST',
    body: JSON.stringify({
      correlationId: `${correlationId}-${suffix}`,
      purpose: 'recommendations',
      dataCategory,
      noticeVersion: 'v1',
    }),
  });

  const denied = await evaluate('default');
  assert.equal(denied.status, 200, JSON.stringify(denied.body));
  assert.equal(denied.body.allowed, false);
  assert.equal(denied.body.code, 'consent_required');
  const sensitive = await evaluate('sensitive', 'health_adjacent');
  assert.equal(sensitive.status, 200);
  assert.equal(sensitive.body.code, 'sensitive_data_denied');

  const governance = await withDemo('/v1/privacy/data-governance/evaluate', {
    method: 'POST',
    body: JSON.stringify({
      correlationId: `${correlationId}-governance`,
      purpose: 'recommendations',
      dataCategory: 'taste_profile',
      lawfulBasis: 'consent',
      crossBorder: { targetRegion: 'US', mechanism: 'SCC' },
      noticeVersion: 'v1',
    }),
  });
  assert.equal(governance.status, 200, JSON.stringify(governance.body));
  assert.equal(governance.body.code, 'cross_border_transfer_disabled');
  assert.equal(governance.body.externalEffects, false);

  const optIn = await withDemo('/v1/privacy/consents', {
    method: 'POST',
    body: JSON.stringify({
      correlationId: `${correlationId}-opt-in`,
      purpose: 'recommendations',
      decision: 'opt_in',
      policyVersion: 'v1',
      locale: 'en',
    }),
  });
  assert.equal(optIn.status, 200, JSON.stringify(optIn.body));
  assert.equal(optIn.body.consent.state, 'opt_in');
  const allowed = await evaluate('allowed');
  assert.equal(allowed.body.allowed, true);
  assert.equal(allowed.body.code, 'allowed');

  const withdrawal = await withDemo('/v1/privacy/consents', {
    method: 'POST',
    body: JSON.stringify({
      correlationId: `${correlationId}-withdraw`,
      purpose: 'recommendations',
      decision: 'withdraw',
      policyVersion: 'v1',
      locale: 'en',
    }),
  });
  assert.equal(withdrawal.status, 200);
  const afterWithdrawal = await evaluate('withdrawn');
  assert.equal(afterWithdrawal.body.code, 'consent_withdrawn');

  const audit = await withDemo('/v1/privacy/audit?limit=50');
  assert.equal(audit.status, 200);
  assert.ok(audit.body.items.some((item) => item.correlation_id === `${correlationId}-default`));
  assert.ok(audit.body.items.some((item) => item.reason_code === 'consent_withdrawn'));
});

await check('privacy export/deletion requests are simulated, tenant-isolated and append-only', async () => {
  const correlationId = `smoke-dsar-${Date.now()}`;
  const exported = await withDemo('/v1/privacy/export', {
    method: 'POST',
    body: JSON.stringify({
      correlationId: `${correlationId}-export`,
      confirmation: 'EXPORT_MY_DATA',
      reason: 'Smoke test queues a simulated export manifest',
    }),
  });
  assert.equal(exported.status, 202, JSON.stringify(exported.body));
  assert.match(exported.body.manifest, /^simulated-export:sha256:/);
  const deletion = await withDemo('/v1/privacy/deletion-request', {
    method: 'POST',
    body: JSON.stringify({
      correlationId: `${correlationId}-deletion`,
      confirmation: 'DELETE_MY_DATA',
      reason: 'Smoke test queues a human-reviewed deletion request',
    }),
  });
  assert.equal(deletion.status, 202, JSON.stringify(deletion.body));
  assert.match(deletion.body.manifest, /^review-required:sha256:/);

  const audit = await withDemo('/v1/privacy/audit?limit=50');
  assert.ok(audit.body.items.some((item) => item.reason_code === 'export_queued'));
  assert.ok(audit.body.items.some((item) => item.reason_code === 'deletion_review_queued'));

  const me = await withDemo('/v1/auth/me');
  const { tenantId } = me.body;
  const userId = me.body.user.id;
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query("SELECT set_config('app.tenant_id', $1, false)", [tenantId]);
    await client.query("SELECT set_config('app.user_id', $1, false)", [userId]);
    let auditMutationRejected = false;
    try {
      await client.query('UPDATE privacy_decision_audit SET reason = $1 WHERE id = (SELECT min(id) FROM privacy_decision_audit)', ['tampered']);
    } catch {
      auditMutationRejected = true;
    }
    assert.equal(auditMutationRejected, true, 'privacy decision audit must be append-only');
    const own = await client.query('SELECT count(*)::int AS count FROM privacy_consents');
    assert.ok(own.rows[0].count >= 1);

    await client.query("SELECT set_config('app.tenant_id', '00000000-0000-0000-0000-000000000009', false)");
    const crossTenant = await client.query('SELECT count(*)::int AS count FROM privacy_consents');
    assert.equal(crossTenant.rows[0].count, 0, 'privacy consent rows must be tenant-isolated');
  } finally {
    await client.end();
  }
});

const businessCookie = await login('business@vintora.local', userPassword);
const withBusiness = (path, options = {}) => request(path, {
  ...options,
  headers: { cookie: businessCookie, ...(options.headers ?? {}) },
});
const merchantCookie = await login('seller@vintora.local', userPassword);
const withMerchant = (path, options = {}) => request(path, {
  ...options,
  headers: { cookie: merchantCookie, ...(options.headers ?? {}) },
});

await check('POST /v1/auth/login and GET /v1/auth/me resolve the demo identity', async () => {
  const { status, body } = await withDemo('/v1/auth/me');
  assert.equal(status, 200);
  assert.equal(body.user.email, smokeEmail);
  assert.equal(body.config.simulatedPayments, true);
  assert.equal(body.role, 'customer');
  assert.ok(body.tenantId);
  assert.deepEqual(body.jurisdictions, ['US', 'GB']);
});

await check('business and merchant identities are separate from the consumer account', async () => {
  const [business, merchant] = await Promise.all([
    withBusiness('/v1/auth/me'),
    withMerchant('/v1/auth/me'),
  ]);
  assert.equal(business.status, 200);
  assert.equal(business.body.role, 'distributor');
  assert.equal(business.body.business.status, 'verified');
  assert.equal(business.body.business.availableUsd, 115800);
  assert.equal(merchant.status, 200);
  assert.equal(merchant.body.role, 'merchant');
});

await check('a merchant cannot use the consumer cart or checkout', async () => {
  const cart = await withMerchant('/v1/cart');
  assert.equal(cart.status, 403);
  assert.equal(cart.body.details.code, 'permission_denied');
  const quote = await withMerchant('/v1/checkout/quote', {
    method: 'POST',
    body: JSON.stringify({ currency: 'USD' }),
  });
  assert.equal(quote.status, 403);
  assert.equal(quote.body.details.code, 'permission_denied');
});

await check('cart add and read are persisted for the session', async () => {
  const added = await withDemo('/v1/cart/items', {
    method: 'POST',
    body: JSON.stringify({ productId: 'sku-1005', quantity: 2 }),
  });
  assert.equal(added.status, 201);
  const cart = await withDemo('/v1/cart');
  assert.equal(cart.status, 200);
  assert.equal(cart.body.items.length, 1);
  assert.equal(cart.body.items[0].quantity, 2);
  assert.equal(cart.body.subtotal, 64);
});

await check('checkout quote is blocked until age is verified in the database', async () => {
  const { status, body } = await withDemo('/v1/checkout/quote', {
    method: 'POST',
    body: JSON.stringify({ currency: 'EUR' }),
  });
  assert.equal(status, 428);
  assert.equal(body.error, 'precondition_required');
});

await check('POST /v1/age/verify validates, rejects minors and stores an adult assertion', async () => {
  const invalid = await withDemo('/v1/age/verify', {
    method: 'POST',
    body: JSON.stringify({ dateOfBirth: '15/05/1990', country: 'USA' }),
  });
  assert.equal(invalid.status, 400);
  const underage = await withDemo('/v1/age/verify', {
    method: 'POST',
    body: JSON.stringify({ dateOfBirth: '2012-01-01', country: 'US' }),
  });
  assert.equal(underage.status, 200);
  assert.equal(underage.body.verified, false);
  assert.equal(underage.body.reason, 'underage');
  const adult = await withDemo('/v1/age/verify', {
    method: 'POST',
    body: JSON.stringify({ dateOfBirth: '1990-05-15', country: 'US' }),
  });
  assert.equal(adult.status, 200);
  assert.equal(adult.body.verified, true);
  assert.equal(adult.body.minimumAge, 21);
  const status = await withDemo('/v1/age/status');
  assert.equal(status.body.verified, true);
  assert.equal(status.body.country, 'US');
  const me = await withDemo('/v1/auth/me');
  assert.equal(me.body.ageVerified, true);
  assert.equal(me.body.ageCountry, 'US');
});

await check('denied safeguard jurisdiction cannot reach checkout', async () => {
  const denied = await withDemo('/v1/checkout/quote', {
    method: 'POST',
    body: JSON.stringify({ currency: 'USD', jurisdiction: 'UNVERIFIED' }),
  });
  assert.equal(denied.status, 403, JSON.stringify(denied.body));
  assert.equal(denied.body.error, 'forbidden');
  assert.equal(denied.body.details.reasonCode, 'denied_jurisdiction');
  assert.equal(denied.body.details.prototypeMode, true);
});

await check('POST /v1/checkout/quote locks a 15-minute FX quote', async () => {
  const { status, body } = await withDemo('/v1/checkout/quote', {
    method: 'POST',
    body: JSON.stringify({ currency: 'EUR' }),
  });
  assert.equal(status, 200);
  assert.equal(body.currency, 'EUR');
  assert.equal(body.rate, 0.92);
  assert.equal(body.lockedForSeconds, 900);
  assert.ok(body.total > body.subtotal);
  assert.match(body.fxDisclosure, /15 minutes/);
  assert.equal(body.catalogueEligibility.sourceClass, 'seed');
  assert.equal(body.catalogueEligibility.purchasable, false);
  assert.equal(body.catalogueEligibility.externalCheckoutBlocked, true);
});

await check('checkout creates an idempotent simulated order and clears the cart', async () => {
  const key = randomUUID();
  const first = await withDemo('/v1/checkout/orders', {
    method: 'POST',
    body: JSON.stringify({ currency: 'USD', idempotencyKey: key }),
  });
  assert.equal(first.status, 201, JSON.stringify(first.body));
  assert.equal(first.body.simulated, true);
  assert.equal(first.body.catalogueEligibility.simulationOnly, true);
  assert.equal(first.body.catalogueEligibility.purchasable, false);
  assert.match(first.body.orderNumber, /^VNT-/);
  const replay = await withDemo('/v1/checkout/orders', {
    method: 'POST',
    headers: { 'idempotency-key': key },
    body: JSON.stringify({ currency: 'USD' }),
  });
  assert.equal(replay.status, 200);
  assert.equal(replay.body.idempotentReplay, true);
  assert.equal(replay.body.orderNumber, first.body.orderNumber);
  const order = await withDemo(`/v1/orders/${first.body.orderNumber}`);
  assert.equal(order.status, 200);
  assert.equal(order.body.items.length, 1);
  const cart = await withDemo('/v1/cart');
  assert.equal(cart.body.items.length, 0);
});

await check('commerce safeguards are enforced before checkout quote and order', async () => {
  const me = await withDemo('/v1/auth/me');
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query("SELECT set_config('app.tenant_id', $1, false)", [me.body.tenantId]);
    await client.query("SELECT set_config('app.user_id', $1, false)", [me.body.user.id]);
    const rows = await client.query(
      `SELECT control_id, decision, reason_code FROM commerce_safeguard_decisions
       WHERE user_id = $1 ORDER BY id`,
      [me.body.user.id],
    );
    assert.ok(rows.rows.length >= 10, 'quote and order must each append five safeguard decisions');
    assert.deepEqual([...new Set(rows.rows.map((row) => row.control_id))].sort(),
      ['age', 'aml', 'kyc', 'payment', 'sanctions']);
    assert.ok(rows.rows.every((row) => row.decision === 'allowed' && row.reason_code === 'all_controls_clear'));
    let appendOnly = false;
    try {
      await client.query(
        'UPDATE commerce_safeguard_decisions SET result = $1 WHERE id = (SELECT min(id) FROM commerce_safeguard_decisions)',
        ['tampered'],
      );
    } catch {
      appendOnly = true;
    }
    assert.equal(appendOnly, true, 'commerce safeguard evidence must be append-only');
  } finally {
    await client.end();
  }
});

await check('POST /v1/sommelier/ask returns simulated, grounded guidance', async () => {
  const { status, body } = await request('/v1/sommelier/ask', {
    method: 'POST',
    body: JSON.stringify({ query: 'what works with spicy Thai food' }),
  });
  assert.equal(status, 200);
  assert.equal(body.simulated, true);
  assert.ok(body.citations.length > 0);
  assert.ok(body.products.length > 0);
  assert.match(body.safetyNote, /responsibly/i);
});

await check('Trade simulation requires a verified business identity', async () => {
  const anonymous = await request('/v1/trade/suppliers');
  assert.equal(anonymous.status, 401);
  const customer = await withDemo('/v1/trade/suppliers');
  assert.equal(customer.status, 403);
  assert.equal(customer.body.details.code, 'permission_denied');

  const [suppliers, rfqs, quotes, credit, purchaseOrders] = await Promise.all([
    withBusiness('/v1/trade/suppliers'),
    withBusiness('/v1/trade/rfqs'),
    withBusiness('/v1/trade/rfqs/RFQ-2041/quotes'),
    withBusiness('/v1/trade/credit'),
    withBusiness('/v1/trade/purchase-orders'),
  ]);
  assert.equal(suppliers.status, 200);
  assert.equal(suppliers.body.total, 6);
  assert.equal(rfqs.status, 200);
  assert.equal(rfqs.body.total, 2, 'only verified US/GB RFQs may be listed');
  assert.deepEqual(rfqs.body.items.map((rfq) => rfq.id), ['RFQ-2041', 'RFQ-2040']);
  assert.equal(purchaseOrders.status, 200);
  assert.ok(purchaseOrders.body.items.every((po) => ['US', 'GB'].includes(po.jurisdiction)));
  const deniedJurisdiction = await withBusiness('/v1/trade/rfqs/RFQ-2039/quotes');
  assert.equal(deniedJurisdiction.status, 403);
  assert.equal(deniedJurisdiction.body.details.code, 'jurisdiction_denied');
  assert.equal(quotes.body.rankedBy, 'landed_cost_per_bottle');
  assert.ok(quotes.body.items.length > 0);
  assert.equal(credit.body.limitUsd, 200_000);
  assert.equal(credit.body.availableUsd, 115_800);
  assert.equal(credit.body.source, 'server-verified-credit');
  const filtered = await withBusiness('/v1/trade/suppliers?category=Spirits');
  assert.equal(filtered.body.total, 1);
});

await check('Trade award derives verification, contract and credit from the session', async () => {
  const customer = await withDemo('/v1/trade/rfqs/RFQ-2040/award', {
    method: 'POST',
    body: JSON.stringify({ quoteId: 'Q-8809' }),
  });
  assert.equal(customer.status, 403);
  assert.equal(customer.body.details.code, 'permission_denied');

  const headerAttempt = await withDemo('/v1/trade/rfqs/RFQ-2040/award', {
    method: 'POST',
    headers: { 'x-business-verified': 'true' },
    body: JSON.stringify({ quoteId: 'Q-8809' }),
  });
  assert.equal(headerAttempt.status, 403, 'request headers cannot assert business verification');

  const aboveApprovalThreshold = await withBusiness('/v1/trade/rfqs/RFQ-2041/award', {
    method: 'POST',
    body: JSON.stringify({ quoteId: 'Q-8813' }),
  });
  assert.equal(aboveApprovalThreshold.status, 403);
  assert.equal(aboveApprovalThreshold.body.details.code, 'approval_required');

  const lowValue = await withBusiness('/v1/trade/rfqs/RFQ-2040/award', {
    method: 'POST',
    body: JSON.stringify({ quoteId: 'Q-8809' }),
  });
  assert.ok([200, 201].includes(lowValue.status), JSON.stringify(lowValue.body));
  assert.equal(lowValue.body.purchaseOrder.valueUsd, 17280);
  assert.equal(lowValue.body.simulated, true);
  if (lowValue.status === 201) assert.equal(lowValue.body.idempotentReplay, undefined);
  else assert.equal(lowValue.body.idempotentReplay, true);
});

await check('cross-tenant RLS hides decisions and authorization denials are append-only', async () => {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query(
      "SELECT set_config('app.tenant_id', '00000000-0000-0000-0000-000000000001', false)",
    );
    const denied = await client.query(
      `SELECT reason_code FROM authorization_decisions
       WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
         AND result = 'denied'
         AND actor_user_id = (SELECT id FROM users WHERE email = $1)
       ORDER BY id DESC LIMIT 1`,
      [smokeEmail],
    );
    assert.equal(denied.rows[0]?.reason_code, 'permission_denied');

    await client.query('BEGIN');
    await client.query(
      "SELECT set_config('app.tenant_id', '00000000-0000-0000-0000-000000000002', true)",
    );
    const crossTenant = await client.query(
      `SELECT count(*)::int AS total FROM authorization_decisions
       WHERE tenant_id = '00000000-0000-0000-0000-000000000001'`,
    );
    assert.equal(crossTenant.rows[0].total, 0, 'RLS must hide another tenant\'s decisions');
    await client.query('ROLLBACK');

    let updateRejected = false;
    try {
      await client.query('UPDATE authorization_decisions SET reason = $1 WHERE id = (SELECT min(id) FROM authorization_decisions)', ['tampered']);
    } catch {
      updateRejected = true;
    }
    assert.equal(updateRejected, true, 'decision log must be append-only');
  } finally {
    await client.end();
  }
});

await check('admin routes require an admin role', async () => {
  const anonymous = await request('/v1/admin/overview');
  assert.equal(anonymous.status, 401);
  const demo = await withDemo('/v1/admin/overview');
  assert.equal(demo.status, 403);
});

const adminCookie = await login(
  process.env.SEED_ADMIN_EMAIL ?? 'admin@vintora.local',
  adminPassword,
);
const withAdmin = (path, options = {}) => request(path, {
  ...options,
  headers: { cookie: adminCookie, ...(options.headers ?? {}) },
});

await check('admin routes require live elevation as well as an admin role', async () => {
  const beforeElevation = await withAdmin('/v1/admin/overview');
  assert.equal(beforeElevation.status, 403, JSON.stringify(beforeElevation.body));
  assert.equal(beforeElevation.body.details.code, 'admin_elevation_required');
  const elevated = await withAdmin('/v1/admin/elevation', {
    method: 'POST',
    body: JSON.stringify({ mode: 'jit', reason: 'Smoke test temporary admin elevation', minutes: 15 }),
  });
  assert.equal(elevated.status, 201, JSON.stringify(elevated.body));
  const me = await withAdmin('/v1/auth/me');
  assert.equal(me.body.staff.active, true);
  assert.equal(me.body.staff.elevationValid, true);
});

await check('AI marketing is draft-only with approval, audience, claim and budget gates', async () => {
  const controls = await withAdmin('/v1/admin/marketing/controls');
  assert.equal(controls.status, 200, JSON.stringify(controls.body));
  assert.equal(controls.body.releaseEnabled, false);
  assert.equal(controls.body.humanApprovalRequired, true);
  assert.equal(controls.body.defaultOutcome, 'draft');
  assert.equal(controls.body.budgetControls.maxIncreasePercent, 0);
  assert.equal(controls.body.budgetControls.revenueCap, 0.08);
  assert.ok(controls.body.audienceRestrictions.deniedGeographies.includes('UNVERIFIED'));
  const shopper = await withDemo('/v1/admin/marketing/controls');
  assert.equal(shopper.status, 403);

  const correlationId = `smoke-marketing-${Date.now()}`;
  const campaignId = `cmp-smoke-${Date.now()}`;
  const provenance = {
    campaignId,
    createdBy: 'seller@vintora.local',
    promptHash: 'sha256:smoke-provenance',
    evidenceRefs: ['fact-packet:v1'],
    modelOrAdapter: 'deterministic-studio-adapter',
    reviewedAt: new Date().toISOString(),
    version: 'v1',
  };
  const approval = {
    approver: 'growth_ops',
    reason: 'Smoke test distinct human approval for campaign control',
  };
  const base = {
    correlationId,
    campaignId,
    action: 'draft',
    geography: 'GB',
    audienceSegments: ['age_verified_adults'],
    claims: ['Single-estate Rioja with verified provenance'],
    evidenceRefs: ['fact-packet:v1'],
    provenance,
  };
  const evaluate = (suffix, overrides = {}) => withAdmin('/v1/admin/marketing/campaigns/evaluate', {
    method: 'POST',
    body: JSON.stringify({
      ...base,
      correlationId: `${correlationId}-${suffix}`,
      ...overrides,
    }),
  });

  const draft = await evaluate('draft');
  assert.equal(draft.status, 200, JSON.stringify(draft.body));
  assert.equal(draft.body.allowed, true);
  assert.equal(draft.body.code, 'allowed_draft');
  assert.equal(draft.body.outcome, 'draft');
  assert.equal(draft.body.liveEffects, false);

  const externalChannel = await withAdmin('/v1/admin/marketing/external-actions/evaluate', {
    method: 'POST',
    body: JSON.stringify({
      correlationId: `${correlationId}-external-channel`,
      campaignId,
      action: 'preview',
      channel: 'ad_platform',
      claims: base.claims,
      audienceSegments: base.audienceSegments,
    }),
  });
  assert.equal(externalChannel.status, 200, JSON.stringify(externalChannel.body));
  assert.equal(externalChannel.body.code, 'blocked_channel');
  const externalSandbox = await withAdmin('/v1/admin/marketing/external-actions/evaluate', {
    method: 'POST',
    body: JSON.stringify({
      correlationId: `${correlationId}-external-sandbox`,
      campaignId,
      action: 'preview',
      channel: 'sandbox',
      claims: base.claims,
      audienceSegments: base.audienceSegments,
      preview: {
        renderedVariantId: 'variant-smoke-1',
        audienceVerified: true,
        verifiedFields: ['age_gate', 'jurisdiction', 'consent_state', 'segment_exclusions'],
      },
    }),
  });
  assert.equal(externalSandbox.status, 200, JSON.stringify(externalSandbox.body));
  assert.equal(externalSandbox.body.code, 'allowed_sandbox_draft');
  assert.equal(externalSandbox.body.externalEffects, false);

  const geography = await evaluate('geography', { geography: 'UNVERIFIED' });
  assert.equal(geography.body.code, 'restricted_geography');
  const audience = await evaluate('audience', { audienceSegments: ['underage'] });
  assert.equal(audience.body.code, 'restricted_audience');
  const claim = await evaluate('claim', { claims: ['safe drinking claim'] });
  assert.equal(claim.body.code, 'denied_claim');

  const release = await evaluate('release', {
    action: 'release',
    approval,
    alcoholValidation: {
      completed: true,
      passed: true,
      reviewer: 'counsel@vintora.local',
      jurisdiction: 'GB',
    },
  });
  assert.equal(release.body.code, 'release_disabled', JSON.stringify(release.body));
  assert.equal(release.body.allowed, false);
  const unvalidated = await evaluate('unvalidated', { action: 'release', approval });
  assert.equal(unvalidated.body.code, 'alcohol_validation_required');
  const increase = await evaluate('budget', { action: 'budget_increase', approval, budgetIncreasePercent: 5 });
  assert.equal(increase.body.code, 'budget_increase_blocked');
  const unapproved = await evaluate('unapproved', { action: 'pause' });
  assert.equal(unapproved.body.code, 'approval_required');
  const paused = await evaluate('pause', { action: 'pause', approval, observedSpendVariancePct: 25 });
  assert.equal(paused.body.allowed, true);
  assert.equal(paused.body.code, 'allowed_pause');
  assert.equal(paused.body.requiresAlert, true);

  const audit = await withAdmin('/v1/admin/marketing/audit?limit=50');
  assert.equal(audit.status, 200);
  assert.ok(audit.body.items.some((item) => item.correlation_id === `${correlationId}-draft`));
  assert.ok(audit.body.items.some((item) => item.reason_code === 'release_disabled'));
  assert.ok(audit.body.items.some((item) => item.reason_code === 'budget_increase_blocked'));
  assert.ok(audit.body.items.some((item) => item.reason_code === 'restricted_audience'));

  const me = await withAdmin('/v1/auth/me');
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query("SELECT set_config('app.tenant_id', $1, false)", [me.body.tenantId]);
    let auditMutationRejected = false;
    try {
      await client.query('UPDATE marketing_release_audit SET reason = $1 WHERE id = (SELECT min(id) FROM marketing_release_audit)', ['tampered']);
    } catch {
      auditMutationRejected = true;
    }
    assert.equal(auditMutationRejected, true, 'marketing release audit must be append-only');

    let liveStateRejected = false;
    try {
      await client.query(
        `INSERT INTO marketing_campaign_controls (tenant_id, campaign_id, status, provenance_hash)
         VALUES ($1, $2, 'live', 'smoke')`,
        [me.body.tenantId, `cmp-live-${Date.now()}`],
      );
    } catch {
      liveStateRejected = true;
    }
    assert.equal(liveStateRejected, true, 'storage must not permit a live campaign state');

    let budgetIncreaseRejected = false;
    try {
      await client.query(
        `INSERT INTO marketing_campaign_controls
           (tenant_id, campaign_id, status, requested_increase_pct, provenance_hash)
         VALUES ($1, $2, 'draft', 5, 'smoke')`,
        [me.body.tenantId, `cmp-budget-${Date.now()}`],
      );
    } catch {
      budgetIncreaseRejected = true;
    }
    assert.equal(budgetIncreaseRejected, true, 'storage must reject budget increases');

    await client.query("SELECT set_config('app.tenant_id', '00000000-0000-0000-0000-000000000009', false)");
    const crossTenant = await client.query('SELECT count(*)::int AS count FROM marketing_release_audit');
    assert.equal(crossTenant.rows[0].count, 0, 'marketing audit must be tenant-isolated');
  } finally {
    await client.end();
  }
});

await check('admin overview, cases and evidence export read DB rows', async () => {
  const [overview, cases, evidence] = await Promise.all([
    withAdmin('/v1/admin/overview'),
    withAdmin('/v1/admin/cases'),
    withAdmin('/v1/admin/evidence/export'),
  ]);
  assert.equal(overview.status, 200);
  assert.equal(overview.body.pendingApprovals >= 0, true);
  assert.ok(overview.body.metrics.ad_spend_pct_revenue <= 8);
  assert.equal(cases.status, 200);
  assert.ok(cases.body.queue.length >= 5);
  assert.equal(evidence.status, 200);
  assert.match(evidence.body.manifest, /^sha256:/);
});

await check('admin coverage reports 19 count-only workspaces', async () => {
  const anonymous = await request('/v1/admin/coverage');
  assert.equal(anonymous.status, 401);
  const shopper = await withDemo('/v1/admin/coverage');
  assert.equal(shopper.status, 403);
  const result = await withAdmin('/v1/admin/coverage');
  assert.equal(result.status, 200);
  assert.equal(result.body.source, 'seeded-postgres-demo');
  assert.ok(result.body.computedAt);
  assert.equal(result.body.asOf, 'seeded-demo-data');
  assert.equal(result.body.modules.length, 19);
  assert.equal(new Set(result.body.modules.map((module) => module.module)).size, 19);
  assert.equal(result.body.summary.modules, 19);
  assert.match(result.body.disclaimer, /seeded demo rows/i);
  for (const module of result.body.modules) {
    assert.ok(['db-backed', 'partial', 'simulated'].includes(module.status));
    assert.ok(module.note.length > 0);
    if (module.status !== 'simulated') assert.ok(module.counts.length > 0);
    for (const count of module.counts) {
      assert.ok(Number.isInteger(count.value));
      assert.ok(['rls-tenant', 'explicit-tenant', 'single-tenant-demo', 'shared-reference'].includes(count.scope));
      assert.ok(!('rows' in count), 'coverage must not expose business rows');
    }
  }
});

await check('admin case assignment writes an append-only audit action', async () => {
  const assigned = await withAdmin('/v1/admin/cases/case-901/assign', { method: 'POST' });
  assert.equal(assigned.status, 200);
  assert.equal(assigned.body.status, 'assigned');
  const cases = await withAdmin('/v1/admin/cases');
  assert.ok(cases.body.actions.some((action) => action.action === 'Assign case'));
});

await check('AI kill switch toggles twice and records tier-4 evidence', async () => {
  const reason = JSON.stringify({
    reason: 'Smoke test toggles and restores the adapter kill switch',
    approver: 'ai_ops',
  });
  const withoutApprover = await withAdmin('/v1/admin/ai/kill-switch', {
    method: 'POST',
    body: JSON.stringify({ reason: 'Smoke test without a distinct approver' }),
  });
  assert.equal(withoutApprover.status, 400);
  const first = await withAdmin('/v1/admin/ai/kill-switch', { method: 'POST', body: reason });
  assert.equal(first.status, 200);
  assert.ok(first.body.models.length >= 4);
  const second = await withAdmin('/v1/admin/ai/kill-switch', { method: 'POST', body: reason });
  assert.equal(second.status, 200);
  assert.deepEqual(
    first.body.models.map((model) => model.kill_switch),
    second.body.models.map((model) => !model.kill_switch),
  );
});

await check('internal agents are advisory-only with allowlist, audit and independent safe-stop', async () => {
  const controls = await withAdmin('/v1/admin/agents/controls');
  assert.equal(controls.status, 200, JSON.stringify(controls.body));
  assert.equal(controls.body.executionEnabled, false);
  assert.equal(controls.body.killSwitch.engaged, true);
  assert.equal(controls.body.killSwitch.independent, true);
  assert.equal(controls.body.killSwitch.drillCompleted, false);
  assert.equal(controls.body.toolAllowlist.length, 6);
  assert.ok(controls.body.deniedTools.includes('content.publish'));
  assert.equal(controls.body.auditFields.length, 12);

  const correlationId = `smoke-agent-${Date.now()}`;
  const baseInput = {
    correlationId,
    agentId: 'SRE-01',
    toolId: 'metrics.read',
    intent: 'advise',
    mode: 'advisory',
  };
  const evaluated = await withAdmin('/v1/admin/agents/tools/evaluate', {
    method: 'POST',
    body: JSON.stringify(baseInput),
  });
  assert.equal(evaluated.status, 200, JSON.stringify(evaluated.body));
  assert.equal(evaluated.body.allowed, false);
  assert.equal(evaluated.body.code, 'agent_kill_switch_engaged');
  assert.equal(evaluated.body.killSwitchEngaged, true);

  const deniedTool = await withAdmin('/v1/admin/agents/tools/evaluate', {
    method: 'POST',
    body: JSON.stringify({ ...baseInput, toolId: 'content.publish' }),
  });
  assert.equal(deniedTool.status, 200);
  assert.equal(deniedTool.body.code, 'denied_tool');
  const injection = await withAdmin('/v1/admin/agents/tools/evaluate', {
    method: 'POST',
    body: JSON.stringify({ ...baseInput, untrustedOutputAsInstructions: true }),
  });
  assert.equal(injection.status, 200);
  assert.equal(injection.body.code, 'prompt_injection_rejected');

  const audit = await withAdmin('/v1/admin/agents/audit?limit=20');
  assert.equal(audit.status, 200);
  assert.ok(audit.body.items.some((item) => item.correlation_id === correlationId));
  assert.ok(audit.body.items.some((item) => item.reason_code === 'prompt_injection_rejected'));

  const engaged = await withAdmin('/v1/admin/agents/kill-switch', {
    method: 'POST',
    body: JSON.stringify({
      action: 'engage',
      correlationId: `${correlationId}-kill`,
      reason: 'Smoke test confirms independent agent safe-stop',
      approver: 'ai_ops',
    }),
  });
  assert.equal(engaged.status, 200, JSON.stringify(engaged.body));
  assert.equal(engaged.body.killSwitch.engaged, true);
  assert.equal(engaged.body.executionEnabled, false);

  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query("SELECT set_config('app.tenant_id', '00000000-0000-0000-0000-000000000001', true)");
    let resetRejected = false;
    let auditMutationRejected = false;
    try {
      await client.query('UPDATE agent_kill_switch SET engaged = false WHERE tenant_id = $1', ['00000000-0000-0000-0000-000000000001']);
    } catch {
      resetRejected = true;
    }
    try {
      await client.query('UPDATE agent_decision_audit SET reason = $1 WHERE id = (SELECT min(id) FROM agent_decision_audit)', ['tampered']);
    } catch {
      auditMutationRejected = true;
    }
    assert.equal(resetRejected, true, 'agent kill switch reset must be blocked');
    assert.equal(auditMutationRejected, true, 'agent decision audit must be append-only');
  } finally {
    await client.end();
  }
});

await check('elevation is time-boxed and break-glass requires a distinct approver', async () => {
  const ended = await withAdmin('/v1/admin/session/end', { method: 'POST' });
  assert.equal(ended.status, 200);
  const deniedAfterEnd = await withAdmin('/v1/admin/overview');
  assert.equal(deniedAfterEnd.status, 403);
  assert.equal(deniedAfterEnd.body.details.code, 'admin_elevation_required');

  const blocked = await withAdmin('/v1/admin/elevation', {
    method: 'POST',
    body: JSON.stringify({ mode: 'break_glass', reason: 'Smoke test without an approver' }),
  });
  assert.equal(blocked.status, 400);
  const breakGlass = await withAdmin('/v1/admin/elevation', {
    method: 'POST',
    body: JSON.stringify({
      mode: 'break_glass', reason: 'Smoke test break-glass elevation',
      approver: 'ai_ops', minutes: 5,
    }),
  });
  assert.equal(breakGlass.status, 201, JSON.stringify(breakGlass.body));
  assert.equal(breakGlass.body.break_glass, true);
  const me = await withAdmin('/v1/auth/me');
  assert.equal(me.body.staff.approverDistinct, true);
  const jit = await withAdmin('/v1/admin/elevation', {
    method: 'POST',
    body: JSON.stringify({ mode: 'jit', reason: 'Smoke test temporary elevation', minutes: 5 }),
  });
  assert.equal(jit.status, 201);
  assert.equal(jit.body.break_glass, false);
  const finalEnd = await withAdmin('/v1/admin/session/end', { method: 'POST' });
  assert.equal(finalEnd.status, 200);
});

await check('the API also serves the modular storefront', async () => {
  const page = await request('/');
  assert.equal(page.status, 200);
  assert.match(page.body.raw, /VINTORA/);
  const module = await request('/src/app.js');
  assert.equal(module.status, 200);
  assert.match(module.body.raw, /hydrateCatalogue/);
});

await check('unknown API routes return JSON 404', async () => {
  const { status, body } = await request('/v1/unknown');
  assert.equal(status, 404);
  assert.equal(body.error, 'route_not_found');
});

console.log(`${passed} passed, ${failed} failed`);
if (failed) process.exitCode = 1;
