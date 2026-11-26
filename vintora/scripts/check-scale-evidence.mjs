#!/usr/bin/env node
/**
 * Scale-evidence honesty gate.
 *
 * Confirms that every scale figure is labelled as a target or estimate, the
 * derived workload arithmetic is internally consistent, no measured result is
 * attached and every reliability test plan remains planned. It does not run a
 * load or chaos test and does not size production infrastructure.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(ROOT, path), 'utf8');
const policy = JSON.parse(read('config/capacity-model.json'));
const errors = [];
const fail = (message) => errors.push(message);
const requireText = (haystack, needle, label) => {
  if (!haystack.includes(needle)) fail(`${label} must contain ${JSON.stringify(needle)}`);
};

if (policy.status !== 'design-target-unmeasured' || policy.prototypeMode !== true || policy.publicLaunch !== false) {
  fail('capacity status must remain design-target-unmeasured with no public launch');
}
const targets = policy.canonicalTargets ?? {};
if (targets.users2034 !== 100000000 || targets.mau2034 !== 60000000 || targets.countriesServed !== 200 ||
    targets.peakOrdersPerDay !== 1200000 || targets.edgeRequestsPerSecond !== 50000 ||
    targets.apiP95Ms !== 200 || targets.availabilityPct !== 99.99 ||
    targets.skuTarget !== '10M+ SKU target by 2034') {
  fail('canonical scale targets have drifted from _canon.md');
}
requireText(targets.source ?? '', '_canon.md', 'canonicalTargets.source');

const w = policy.workloadModel ?? {};
const avg = targets.peakOrdersPerDay / w.peakWindowSeconds;
const peak = Math.round(avg * w.peakFactor);
const reads = peak * w.readToWriteRatio;
const budget = (1 - policy.slo.platformAvailabilityPct / 100) * 525600;
if (Math.abs(w.averageOrdersPerSecond - Math.round(avg * 10) / 10) > 0.01) fail('averageOrdersPerSecond does not follow the stated derivation');
if (w.peakOrderWriteRps !== peak) fail('peakOrderWriteRps does not follow the stated derivation');
if (w.peakReadRps !== reads) fail('peakReadRps does not follow the stated ratio');
if (Math.abs(policy.slo.annualErrorBudgetMinutes - Math.round(budget * 100) / 100) > 0.01) fail('annual error budget does not match 99.99% availability');
if (w.servicesFannedOutPerOrder !== 6 || w.medianRequestBytes !== 8192 || w.p95ResponseBytes !== 65536) {
  fail('workload payload and fan-out assumptions have drifted');
}
requireText(w.method ?? '', 'arithmetic derivations from unmeasured targets', 'workloadModel.method');

const slo = policy.slo ?? {};
if (slo.apiP95Ms !== 200 || slo.apiP99Ms !== 500 || slo.measurementWindow !== '28-day rolling' ||
    slo.measurementPipelineImplemented !== false || slo.alertThresholdsDefined !== false || slo.measuredResultAttached !== false) {
  fail('SLO must remain an unmeasured policy with 28-day rolling windows');
}
requireText(slo.errorBudgetPolicy ?? '', '2x, 10x and 25x', 'slo.errorBudgetPolicy');
requireText(slo.errorBudgetPolicy ?? '', '100%', 'slo.errorBudgetPolicy');

const tp = policy.thirdPartyAvailability ?? {};
if (tp.includedInPlatformSlo !== false || tp.separateBudgetsRequired !== true || tp.separateBudgetsDefined !== false || tp.providers?.length !== 3) {
  fail('third-party availability must be excluded from the platform SLO with no separate budgets');
}

if (policy.routes?.length !== 5) fail('capacity register must declare 5 routes');
for (const route of policy.routes ?? []) {
  if (route.measuredP95Ms !== null || route.measuredP99Ms !== null) {
    fail(`${route.method} ${route.route}: measured latency must be null until a test result exists`);
  }
  if (!Number.isFinite(route.p95TargetMs) || !Number.isFinite(route.p99TargetMs)) {
    fail(`${route.method} ${route.route}: p95/p99 targets are required`);
  }
}
if (policy.testPlans?.length !== 6) fail('capacity register must declare 6 test plans');
for (const plan of policy.testPlans ?? []) {
  if (plan.status !== 'planned' || plan.evidenceRef !== null || !plan.owner) {
    fail(`${plan.id}: plan must be planned with an owner and no evidence`);
  }
}
if (policy.evidenceGaps?.length !== 5) fail('capacity register must record 5 evidence gaps');

const doc = read('CAPACITY_AND_RELIABILITY.md');
const readme = read('README.md');
const investorDoc = read('INVESTOR_DOCUMENTATION.md');
const canon = read('packages/shared/src/index.ts');
for (const heading of [
  'Workload model (targets, not measurements)',
  'SLO and error-budget policy (future measurement, not observed)',
  'p95/p99 by route (targets only)',
  'Platform versus third-party availability',
  'Load and failure test plans (planned, not run)',
  'Verification and boundaries',
]) {
  requireText(doc, `## ${heading}`, 'CAPACITY_AND_RELIABILITY.md');
}
requireText(doc, 'Every number on this page is a **design target**', 'CAPACITY_AND_RELIABILITY.md');
requireText(doc, 'No load, failure, canary or chaos result is attached', 'CAPACITY_AND_RELIABILITY.md');
requireText(doc, '52.56 minutes', 'CAPACITY_AND_RELIABILITY.md');
requireText(doc, '13,900', 'CAPACITY_AND_RELIABILITY.md');
requireText(doc, 'none attached', 'CAPACITY_AND_RELIABILITY.md');
requireText(readme, '[`CAPACITY_AND_RELIABILITY.md`](./CAPACITY_AND_RELIABILITY.md)', 'README.md');
requireText(readme, '[`INVESTOR_DOCUMENTATION.md`](./INVESTOR_DOCUMENTATION.md)', 'README.md');
requireText(investorDoc, '**Scale target (unmeasured):** 100M registered users', 'INVESTOR_DOCUMENTATION.md');
requireText(canon, 'users2034: 100_000_000', 'packages/shared/src/index.ts');
requireText(canon, 'peakOrdersPerDay: 1_200_000', 'packages/shared/src/index.ts');
requireText(canon, 'peakRequestsPerSecond: 50_000', 'packages/shared/src/index.ts');

// No new scale figure may appear without an explicit target/estimate qualifier.
const qualifiers = ['target', 'estimate', 'assumption', 'planning', 'planned', 'unmeasured', 'none attached', 'unvalidated', 'design'];
const scaleTokens = ['100M', '1.2M', '99.99', '50,000', '13,900', '52.56', '7.29', '2.28', '200 ms', '500 ms'];
for (const line of doc.split(/\r?\n/)) {
  if (!scaleTokens.some((token) => line.includes(token))) continue;
  if (!qualifiers.some((word) => line.toLowerCase().includes(word))) {
    fail(`unqualified scale figure: ${line.trim()}`);
  }
}

for (const ref of policy.codeBoundaryRefs) {
  if (!existsSync(join(ROOT, ref))) fail(`missing capacity model reference: ${ref}`);
}

// A small sequential loopback baseline may be recorded as prototype evidence,
// but it must never become a load-test, SLO or p95/p99-by-route measurement.
if (policy.localPrototypeBaselineRef !== undefined) {
  const baselinePath = policy.localPrototypeBaselineRef;
  if (!existsSync(join(ROOT, baselinePath))) {
    fail(`missing local prototype baseline evidence: ${baselinePath}`);
  } else {
    const baseline = JSON.parse(read(baselinePath));
    if (baseline.status !== 'local-prototype-load-baseline' || baseline.prototypeMode !== true ||
        baseline.publicLaunch !== false || baseline.verdict !== 'NO-GO' ||
        baseline.resultRef !== null || baseline.productionEvidenceRef !== null) {
      fail('local baseline must stay prototype-only with NO-GO and null external/production refs');
    }
    if (baseline.sample?.concurrency !== 1) {
      fail('local baseline must stay sequential (concurrency 1), not a load test');
    }
    if (baseline.targetIntegrity?.capacityModelMeasuredFieldsStillNull !== true ||
        baseline.targetIntegrity?.testPlansStillPlanned !== true ||
        baseline.targetIntegrity?.sloPipelineStillUnimplemented !== true) {
      fail('local baseline must record that capacity targets, test plans and SLO measurement remain untouched');
    }
  }
}

if (errors.length) {
  console.error(`Scale evidence check failed: ${errors.length} finding(s).`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}
console.log(`Scale evidence check passed: ${policy.routes.length} route latency targets, ${policy.testPlans.length} unrun test plans, 52.56-minute error budget.`);
console.log('All scale figures are targets or derived estimates; no measured p95/p99 or test result is attached.');
console.log('This gate does not validate capacity, run a load test or grant launch clearance.');
