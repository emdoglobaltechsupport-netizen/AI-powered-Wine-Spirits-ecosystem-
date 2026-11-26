#!/usr/bin/env node
/**
 * Local prototype Admin control walkthrough.
 *
 * Exercises the generated local seeded admin identity through JIT elevation,
 * break-glass, distinct-approver gates, session revocation, count-only coverage
 * and append-only privileged-action audit. Records prototype-only evidence;
 * it does not prove production IdP/MFA enrolment, an immutable external audit
 * sink, alert routing, a break-glass incident review or launch approval.
 */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import pg from 'pg';

const API_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ROOT = resolve(API_DIR, '..', '..');
dotenv.config({ path: join(ROOT, '.env') });

const RESULT_PATH = join(ROOT, 'evidence', 'local-admin-control-walkthrough.json');
const base = process.env.API_BASE_URL ?? 'http://localhost:4000';
const runtimeProfile = String(process.env.RUNTIME_PROFILE ?? 'local').toLowerCase();
const TENANT_ID = '00000000-0000-0000-0000-000000000001';

if (runtimeProfile !== 'local' && runtimeProfile !== 'test') {
  console.error(`Local Admin walkthrough failed: RUNTIME_PROFILE=${runtimeProfile} is not a disposable local/test profile.`);
  process.exit(1);
}
if (String(process.env.NODE_ENV ?? '').toLowerCase() === 'production') {
  console.error('Local Admin walkthrough failed: NODE_ENV=production is not permitted for the local walkthrough.');
  process.exit(1);
}
let url;
try {
  url = new URL(base);
} catch {
  console.error('Local Admin walkthrough failed: API_BASE_URL is not a valid URL.');
  process.exit(1);
}
if (!['localhost', '127.0.0.1', '::1'].includes(url.hostname.toLowerCase())) {
  console.error('Local Admin walkthrough failed: API_BASE_URL must point to a loopback host; remote APIs are not permitted.');
  process.exit(1);
}
if (url.username || url.password) {
  console.error('Local Admin walkthrough failed: API_BASE_URL must not embed credentials.');
  process.exit(1);
}
if (!process.env.SEED_ADMIN_PASSWORD || !process.env.SEED_USER_PASSWORD) {
  console.error('Local Admin walkthrough failed: generated SEED_ADMIN_PASSWORD and SEED_USER_PASSWORD are required (run `npm run setup`).');
  process.exit(1);
}

async function request(path, options = {}) {
  const { headers, ...rest } = options;
  const response = await fetch(`${base}${path}`, {
    ...rest,
    headers: { 'content-type': 'application/json', ...(headers ?? {}) },
    signal: AbortSignal.timeout(10_000),
  });
  const text = await response.text();
  let body = {};
  try { body = text ? JSON.parse(text) : {}; } catch { body = { raw: text }; }
  const setCookie = typeof response.headers.getSetCookie === 'function'
    ? response.headers.getSetCookie()
    : [response.headers.get('set-cookie')].filter(Boolean);
  return { status: response.status, body, setCookie };
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

const checks = {};
const details = {};
const errors = [];
const verify = async (name, fn) => {
  try {
    details[name] = await fn();
    checks[name] = true;
    console.log(`PASS ${name}`);
  } catch (error) {
    checks[name] = false;
    errors.push(`${name}: ${error.message}`);
    console.error(`FAIL ${name}: ${error.message}`);
  }
};

console.log(`Vintora local Admin control walkthrough → ${base}`);
await verify('health reports the prototype runtime boundary', async () => {
  const { status, body } = await request('/health');
  assert.equal(status, 200);
  assert.equal(body.status, 'ok');
  assert.equal(body.runtimeProfile, runtimeProfile);
  assert.equal(body.runtimeBoundaryOk, true);
  assert.equal(body.db.ok, true);
  return { runtimeProfile: body.runtimeProfile, modules: body.modules, environment: body.environment };
});

const shopperCookie = await register(
  `admin-walkthrough-${randomUUID().slice(0, 8)}@vintora.local`,
  process.env.SEED_USER_PASSWORD,
  'Walkthrough Collector',
);
const adminCookie = await login(
  process.env.SEED_ADMIN_EMAIL ?? 'admin@vintora.local',
  process.env.SEED_ADMIN_PASSWORD,
);
const withShopper = (path, options = {}) => request(path, {
  ...options,
  headers: { cookie: shopperCookie, ...(options.headers ?? {}) },
});
const withAdmin = (path, options = {}) => request(path, {
  ...options,
  headers: { cookie: adminCookie, ...(options.headers ?? {}) },
});

await verify('admin access requires an elevation even for an admin role', async () => {
  const anonymous = await request('/v1/admin/overview');
  assert.equal(anonymous.status, 401);
  const shopper = await withShopper('/v1/admin/overview');
  assert.equal(shopper.status, 403);
  const admin = await withAdmin('/v1/admin/overview');
  assert.equal(admin.status, 403);
  assert.equal(admin.body.details.code, 'admin_elevation_required');
  return { anonymous: anonymous.status, shopper: shopper.status, adminBeforeElevation: admin.status };
});

await verify('JIT elevation is granted and visible in the session', async () => {
  const elevated = await withAdmin('/v1/admin/elevation', {
    method: 'POST',
    body: JSON.stringify({ mode: 'jit', reason: 'Walkthrough temporary admin elevation', minutes: 15 }),
  });
  assert.equal(elevated.status, 201, JSON.stringify(elevated.body));
  const me = await withAdmin('/v1/auth/me');
  assert.equal(me.body.staff.active, true);
  assert.equal(me.body.staff.elevationValid, true);
  return { mode: 'jit', breakGlass: elevated.body.break_glass, staffActive: me.body.staff.active };
});

await verify('coverage is count-only across 19 workspaces', async () => {
  const result = await withAdmin('/v1/admin/coverage');
  assert.equal(result.status, 200, JSON.stringify(result.body));
  assert.equal(result.body.source, 'seeded-postgres-demo');
  assert.equal(result.body.asOf, 'seeded-demo-data');
  assert.equal(result.body.environment, 'local-demo');
  assert.equal(result.body.modules.length, 19);
  for (const module of result.body.modules) {
    for (const count of module.counts) {
      assert.ok(!('rows' in count), 'coverage must not expose business rows');
    }
  }
  return { workspaceCount: result.body.modules.length, rowPayloadsExposed: false };
});

await verify('high-impact kill-switch requires a distinct approver', async () => {
  const reason = JSON.stringify({
    reason: 'Walkthrough toggles and restores the simulated adapter kill switch',
    approver: 'ai_ops',
  });
  const withoutApprover = await withAdmin('/v1/admin/ai/kill-switch', {
    method: 'POST',
    body: JSON.stringify({ reason: 'Walkthrough without a distinct approver' }),
  });
  assert.equal(withoutApprover.status, 400);
  const first = await withAdmin('/v1/admin/ai/kill-switch', { method: 'POST', body: reason });
  assert.equal(first.status, 200, JSON.stringify(first.body));
  assert.ok(first.body.models.length >= 4);
  const second = await withAdmin('/v1/admin/ai/kill-switch', { method: 'POST', body: reason });
  assert.equal(second.status, 200, JSON.stringify(second.body));
  assert.deepEqual(
    first.body.models.map((model) => model.kill_switch),
    second.body.models.map((model) => !model.kill_switch),
  );
  return { withoutApproverStatus: withoutApprover.status, toggledModels: first.body.models.length, restored: true };
});

await verify('privileged actions produce a local evidence manifest', async () => {
  const assigned = await withAdmin('/v1/admin/cases/case-901/assign', { method: 'POST' });
  assert.equal(assigned.status, 200, JSON.stringify(assigned.body));
  const exported = await withAdmin('/v1/admin/evidence/export');
  assert.equal(exported.status, 200, JSON.stringify(exported.body));
  assert.equal(exported.body.note, 'Simulated evidence manifest — no live PII');
  assert.ok(exported.body.records >= 1);
  assert.match(exported.body.manifest, /^sha256:[0-9a-f]{16}$/);
  return { records: exported.body.records, manifestPrefix: exported.body.manifest.slice(0, 7) };
});

await verify('local admin action log rejects mutation', async () => {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query('SELECT set_config($1, $2, true)', ['app.tenant_id', TENANT_ID]);
    const count = await client.query('SELECT count(*)::bigint AS n FROM admin_actions');
    assert.ok(Number(count.rows[0].n) >= 1, 'expected at least one local admin action');
    let mutationRejected = false;
    try {
      await client.query('UPDATE admin_actions SET reason = $1 WHERE id = (SELECT min(id) FROM admin_actions)', ['walkthrough-tamper']);
    } catch (error) {
      mutationRejected = /append-only/i.test(error.message);
    }
    assert.equal(mutationRejected, true, 'admin_actions must reject updates locally');
    return { rows: Number(count.rows[0].n), mutationRejected: true };
  } finally {
    await client.end();
  }
});

await verify('ending the elevation revokes admin access immediately', async () => {
  const ended = await withAdmin('/v1/admin/session/end', { method: 'POST' });
  assert.equal(ended.status, 200);
  const after = await withAdmin('/v1/admin/overview');
  assert.equal(after.status, 403);
  assert.equal(after.body.details.code, 'admin_elevation_required');
  return { endStatus: ended.status, accessAfterEnd: after.status };
});

await verify('break-glass requires a distinct named approver', async () => {
  const blocked = await withAdmin('/v1/admin/elevation', {
    method: 'POST',
    body: JSON.stringify({ mode: 'break_glass', reason: 'Walkthrough without an approver' }),
  });
  assert.equal(blocked.status, 400);
  const granted = await withAdmin('/v1/admin/elevation', {
    method: 'POST',
    body: JSON.stringify({
      mode: 'break_glass', reason: 'Walkthrough break-glass elevation',
      approver: 'ai_ops', minutes: 5,
    }),
  });
  assert.equal(granted.status, 201, JSON.stringify(granted.body));
  assert.equal(granted.body.break_glass, true);
  const me = await withAdmin('/v1/auth/me');
  assert.equal(me.body.staff.approverDistinct, true);
  return { withoutApproverStatus: blocked.status, distinctApprover: me.body.staff.approverDistinct };
});

await verify('break-glass is followed by a time-boxed JIT session and clean end', async () => {
  const jit = await withAdmin('/v1/admin/elevation', {
    method: 'POST',
    body: JSON.stringify({ mode: 'jit', reason: 'Walkthrough temporary elevation after break glass', minutes: 5 }),
  });
  assert.equal(jit.status, 201, JSON.stringify(jit.body));
  assert.equal(jit.body.break_glass, false);
  const ended = await withAdmin('/v1/admin/session/end', { method: 'POST' });
  assert.equal(ended.status, 200);
  return { jitBreakGlass: jit.body.break_glass, endStatus: ended.status };
});

if (errors.length || Object.values(checks).some((value) => value !== true)) {
  console.error(`Local Admin walkthrough failed: ${errors.length || 1} finding(s).`);
  for (const error of errors.length ? errors : ['one or more walkthrough checks did not pass']) console.error(`  - ${error}`);
  process.exit(1);
}

const result = {
  version: 1,
  status: 'local-prototype-admin-control-walkthrough',
  prototypeMode: true,
  publicLaunch: false,
  verdict: 'NO-GO',
  executedOn: new Date().toISOString(),
  runtimeProfile,
  scope: 'Loopback prototype API with the generated local seeded admin identity and a fresh local shopper identity.',
  targetLabel: 'loopback prototype Admin API (host only)',
  identity: { adminAccount: 'generated local seeded admin', shopperAccount: 'fresh local test identity', secretsLogged: false },
  checks,
  details,
  unclosedGaps: [
    'Production IdP-backed, phishing-resistant hardware MFA enrolment is not attached.',
    'External immutable audit sink, WORM schedule and alert routing are not configured.',
    'No production break-glass drill or post-incident review is attached.',
  ],
  resultRef: null,
  productionEvidenceRef: null,
  note: 'Prototype-only local control walkthrough. Not production MFA proof, not an immutable audit sink test, not a breach or break-glass drill, not compliance sign-off and not launch approval. NO-GO remains unchanged.',
};
mkdirSync(dirname(RESULT_PATH), { recursive: true });
const text = `${JSON.stringify(result, null, 2)}\n`;
writeFileSync(RESULT_PATH, text);
if (!readFileSync(RESULT_PATH, 'utf8').includes('"verdict": "NO-GO"')) {
  console.error('Local Admin walkthrough failed: evidence file did not retain the NO-GO verdict.');
  process.exit(1);
}
console.log(`Local Admin walkthrough passed: ${Object.keys(checks).length} prototype control checks, no credentials recorded.`);
console.log('Production IdP/MFA, external audit retention, alerting and launch approval remain absent; verdict remains NO-GO.');
