#!/usr/bin/env node
/**
 * Commerce safeguard gate. Verifies that checkout controls are machine-readable,
 * enforced at the API boundary, append-only and explicitly prototype-only.
 */
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => readFileSync(join(ROOT, relativePath), 'utf8');
const policy = JSON.parse(read('config/commerce-safeguards.json'));

const shared = read('packages/shared/src/commerce-safeguards.ts');
const checkout = read('services/api/src/modules/checkout/checkout.routes.ts');
const routes = read('services/api/src/modules/commerce/commerce-safeguards.routes.ts');
const app = read('services/api/src/app.ts');
const migration = read('packages/db/migrations/0018_commerce_safeguards.sql');
const smoke = read('services/api/scripts/smoke.mjs');
const docs = read('COMMERCE_SAFEGUARDS.md');

const errors = [];
const requireText = (haystack, needle, label) => {
  if (!haystack.includes(needle)) errors.push(`${label} must contain ${JSON.stringify(needle)}`);
};

if (policy.policyVersion !== 'v1') errors.push('commerce-safeguards.policyVersion must be v1');
if (policy.prototypeMode !== true) errors.push('commerce-safeguards.prototypeMode must be true');
if (policy.publicLaunch !== false) errors.push('commerce-safeguards.publicLaunch must be false');
if (policy.enforcement !== 'fail-closed') errors.push('commerce-safeguards.enforcement must be fail-closed');
if (policy.defaultOutcome !== 'denied') errors.push('commerce-safeguards.defaultOutcome must be denied');
if (policy.maxEvidenceAgeMinutes !== 15) errors.push('maxEvidenceAgeMinutes must be 15');
if (policy.maxAgeEvidenceHours !== 720) errors.push('maxAgeEvidenceHours must be 720');
if (policy.evidencePrefix !== 'simulated:') errors.push('evidencePrefix must be simulated:');
if (!Array.isArray(policy.controls) || policy.controls.length !== 5) {
  errors.push('commerce safeguards must register exactly five required controls');
} else {
  const ids = policy.controls.map((control) => control.id).join(',');
  if (ids !== 'age,kyc,aml,sanctions,payment') errors.push('controls must be age,kyc,aml,sanctions,payment');
  if (!policy.controls.every((control) => control.required === true)) errors.push('all five controls must be required');
}
if (!policy.allowedResultCodes.includes('simulated_clear')) errors.push('prototype result simulated_clear must be allowed');
if (!policy.deniedResultCodes.includes('sanctions_hit')) errors.push('sanctions_hit must be denied');
if (!policy.simulationNote.includes('not an official')) errors.push('simulation note must deny official-list status');

requireText(shared, "export const COMMERCE_PUBLIC_LAUNCH = false", 'commerce-safeguards.ts');
requireText(shared, "export const COMMERCE_MAX_EVIDENCE_AGE_MINUTES = 15", 'commerce-safeguards.ts');
requireText(shared, "export const COMMERCE_MAX_AGE_EVIDENCE_HOURS = 720", 'commerce-safeguards.ts');
requireText(shared, "COMMERCE_ALLOWED_RESULT_CODES.includes(decision.result)", 'commerce-safeguards.ts');
requireText(shared, "missing_age_evidence", 'commerce-safeguards.ts');
requireText(checkout, 'safeguardJurisdiction(req)', 'checkout.routes.ts');
requireText(checkout, 'ageVerifiedAt: req.auth!.ageVerifiedAt', 'checkout.routes.ts');
requireText(routes, "commerce/safeguards/evaluate", 'commerce-safeguards.routes.ts');
requireText(app, 'commerceSafeguardsRouter', 'app.ts');
requireText(read('services/api/src/modules/commerce/payment-adapter.ts'), 'interface PaymentAuthorizationAdapter', 'payment-adapter.ts');
requireText(read('services/api/src/modules/commerce/payment-adapter.ts'), "name === simulatedPaymentAdapter.name", 'payment-adapter.ts');
requireText(migration, 'commerce_safeguard_decisions is append-only', '0018_commerce_safeguards.sql');
requireText(migration, 'AS RESTRICTIVE', '0018_commerce_safeguards.sql');
requireText(smoke, 'commerce safeguards expose a fail-closed prototype control plane', 'smoke.mjs');
requireText(smoke, 'commerce safeguards are enforced before checkout quote and order', 'smoke.mjs');
requireText(smoke, 'denied safeguard jurisdiction cannot reach checkout', 'smoke.mjs');
requireText(docs, 'simulated', 'COMMERCE_SAFEGUARDS.md');

if (errors.length) {
  console.error(`Commerce safeguard check failed: ${errors.length} finding(s).`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log('Commerce safeguard check passed: five controls enforce fail-closed prototype decisions with append-only evidence.');
