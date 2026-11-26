#!/usr/bin/env node
/**
 * Local prototype latency baseline.
 *
 * Issues a small, sequential set of requests against a loopback prototype API
 * and records observed percentiles as prototype-only evidence. This is NOT a
 * load, stress, soak or canary test, NOT an SLO or p95/p99-by-route result, and
 * NOT production or hosted evidence. Capacity targets and planned test records
 * remain untouched.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const API_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ROOT = resolve(API_DIR, '..', '..');
dotenv.config({ path: join(ROOT, '.env') });

const RESULT_PATH = join(ROOT, 'evidence', 'local-load-baseline.json');
const base = process.env.API_BASE_URL ?? 'http://localhost:4000';
const runtimeProfile = String(process.env.RUNTIME_PROFILE ?? 'local').toLowerCase();
const errors = [];
const fail = (message) => errors.push(message);

if (runtimeProfile !== 'local' && runtimeProfile !== 'test') {
  console.error(`Local load baseline failed: RUNTIME_PROFILE=${runtimeProfile} is not a disposable local/test profile.`);
  process.exit(1);
}
if (String(process.env.NODE_ENV ?? '').toLowerCase() === 'production') {
  console.error('Local load baseline failed: NODE_ENV=production is not permitted for the local baseline.');
  process.exit(1);
}
let url;
try {
  url = new URL(base);
} catch {
  console.error('Local load baseline failed: API_BASE_URL is not a valid URL.');
  process.exit(1);
}
if (!['localhost', '127.0.0.1', '::1'].includes(url.hostname.toLowerCase())) {
  console.error('Local load baseline failed: API_BASE_URL must point to a loopback host; remote APIs are not permitted.');
  process.exit(1);
}
if (url.username || url.password) {
  console.error('Local load baseline failed: API_BASE_URL must not embed credentials.');
  process.exit(1);
}

const WARMUPS = 3;
const SAMPLES = 30;
const ROUTES = [
  {
    id: 'health', method: 'GET', path: '/health', designTargetRoute: null, expectedStatus: 200,
    validate: (body) => body?.status === 'ok' && body?.db?.ok === true && body?.runtimeBoundaryOk === true,
  },
  {
    id: 'products', method: 'GET', path: '/v1/products', designTargetRoute: '/v1/products', expectedStatus: 200,
    validate: (body) => Array.isArray(body?.products ?? body?.items),
  },
  {
    id: 'sommelier', method: 'POST', path: '/v1/sommelier/ask', designTargetRoute: null, expectedStatus: 200,
    body: JSON.stringify({ query: 'what works with spicy Thai food' }),
    validate: (body) => body?.simulated === true && Array.isArray(body?.citations),
  },
];

async function request(route) {
  const started = process.hrtime.bigint();
  const response = await fetch(`${base}${route.path}`, {
    method: route.method,
    headers: { 'content-type': 'application/json' },
    ...(route.body ? { body: route.body } : {}),
    signal: AbortSignal.timeout(10_000),
  });
  const text = await response.text();
  const elapsedMs = Number(process.hrtime.bigint() - started) / 1_000_000;
  let body = {};
  try { body = text ? JSON.parse(text) : {}; } catch { body = { raw: text }; }
  return { status: response.status, body, elapsedMs, rateLimited: response.status === 429 };
}

function percentile(sorted, rank) {
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(rank * sorted.length) - 1))];
}

const round = (value) => Math.round(value * 100) / 100;
const records = [];
let healthSnapshot = null;

for (const route of ROUTES) {
  const timings = [];
  const statuses = new Map();
  for (let index = 0; index < WARMUPS + SAMPLES; index += 1) {
    const result = await request(route);
    if (index < WARMUPS) continue;
    timings.push(result.elapsedMs);
    statuses.set(String(result.status), (statuses.get(String(result.status)) ?? 0) + 1);
    if (result.rateLimited) fail(`${route.id}: local rate limit returned 429 during the baseline`);
    if (result.status !== route.expectedStatus || !route.validate(result.body)) {
      fail(`${route.id}: unexpected response status ${result.status} or body shape`);
    }
    if (route.id === 'health' && !healthSnapshot) {
      healthSnapshot = {
        status: result.body.status,
        runtimeProfile: result.body.runtimeProfile,
        runtimeBoundaryOk: result.body.runtimeBoundaryOk,
        dbOk: result.body.db?.ok === true,
        embeddingMode: result.body.embedding?.mode ?? null,
      };
    }
  }
  const sorted = [...timings].sort((a, b) => a - b);
  records.push({
    id: route.id,
    method: route.method,
    path: route.path,
    designTargetRoute: route.designTargetRoute,
    samples: sorted.length,
    statusCodes: Object.fromEntries([...statuses.entries()].sort()),
    observedMs: {
      min: round(sorted[0]),
      p50: round(percentile(sorted, 0.5)),
      p95: round(percentile(sorted, 0.95)),
      p99: round(percentile(sorted, 0.99)),
      max: round(sorted[sorted.length - 1]),
    },
  });
}

if (healthSnapshot?.runtimeProfile !== runtimeProfile) {
  fail('the loopback API runtime profile does not match the local harness profile');
}

if (errors.length) {
  console.error(`Local load baseline failed: ${errors.length} finding(s).`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

const result = {
  version: 1,
  status: 'local-prototype-load-baseline',
  prototypeMode: true,
  publicLaunch: false,
  verdict: 'NO-GO',
  executedOn: new Date().toISOString(),
  runtimeProfile,
  scope: 'Loopback prototype API only; sequential anonymous requests against a disposable local database.',
  targetLabel: 'loopback prototype API (host only)',
  sample: {
    warmupsPerRoute: WARMUPS,
    measuredRequestsPerRoute: SAMPLES,
    concurrency: 1,
    totalMeasuredRequests: ROUTES.length * SAMPLES,
  },
  health: healthSnapshot,
  routes: records,
  checks: {
    loopbackOnly: true,
    healthOk: healthSnapshot?.status === 'ok' && healthSnapshot?.dbOk === true,
    runtimeBoundaryOk: healthSnapshot?.runtimeBoundaryOk === true,
    allResponsesExpected: true,
    noRateLimitDenials: true,
  },
  targetIntegrity: {
    capacityModelMeasuredFieldsStillNull: true,
    testPlansStillPlanned: true,
    sloPipelineStillUnimplemented: true,
  },
  resultRef: null,
  productionEvidenceRef: null,
  note: 'Prototype-only local latency baseline. Not a hosted load test, stress/soak/canary/chaos result, SLO or p95/p99-by-route evidence, production measurement, security audit or launch approval. All capacity figures remain targets and the verdict remains NO-GO.',
};
mkdirSync(dirname(RESULT_PATH), { recursive: true });
writeFileSync(RESULT_PATH, `${JSON.stringify(result, null, 2)}\n`);
if (!readFileSync(RESULT_PATH, 'utf8').includes('"verdict": "NO-GO"')) {
  console.error('Local load baseline failed: evidence file did not retain the NO-GO verdict.');
  process.exit(1);
}
console.log(`Local load baseline passed: ${result.sample.totalMeasuredRequests} sequential requests across ${records.length} routes, no rate-limit denials.`);
console.log('Evidence is prototype-only; capacity targets remain unmeasured and the verdict remains NO-GO.');
