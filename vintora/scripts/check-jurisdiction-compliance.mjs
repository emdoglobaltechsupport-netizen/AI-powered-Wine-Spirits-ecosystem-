#!/usr/bin/env node
/**
 * Jurisdictional compliance and release-boundary gate.
 *
 * This checker is intentionally fail-closed. It proves that the prototype has
 * no active jurisdiction, no live transaction or settlement approval, no
 * counsel evidence and no licensed custody/USDC pathway. It never grants
 * launch clearance.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => readFileSync(join(ROOT, relativePath), 'utf8');
const readJson = (relativePath) => JSON.parse(read(relativePath));

const jurisdiction = readJson('config/jurisdiction-compliance.json');
const vault = readJson('config/vault-boundaries.json');
const highRisk = readJson('config/high-risk-features.json');
const licensing = readJson('config/commercial-licensing-policy.json');
const africa = readJson('packages/db/config/africa-marketplace.json');
const apiConfig = read('services/api/src/config.ts');
const paymentAdapter = read('services/api/src/modules/commerce/payment-adapter.ts');
const readme = read('README.md');
const vaultDoc = read('20-wine-investment-marketplace.md');
const errors = [];
const fail = (message) => errors.push(message);

if (jurisdiction.publicLaunch !== false) fail('jurisdiction-compliance.publicLaunch must be false');
if (jurisdiction.liveTransactionsAllowed !== false) fail('jurisdiction-compliance.liveTransactionsAllowed must be false');
if (jurisdiction.globalScope?.activeCountries !== 0 || jurisdiction.globalScope?.activeLanguages?.length || jurisdiction.globalScope?.activeCurrencies?.length) {
  fail('no country, language or currency may be active in the prototype');
}
if (jurisdiction.globalScope?.claimLabel !== 'unmeasured design target') fail('global scope totals must be labelled as unmeasured design targets');

const scopeClasses = jurisdiction.scopeClasses ?? {};
if (JSON.stringify(scopeClasses.phase1 ?? []) !== JSON.stringify(['US', 'UK', 'SG'])) fail('phase 1 scope must be the canonical US/UK/Singapore design phase');
if ((scopeClasses.planned ?? []).length !== 0) fail('planned scope must remain empty without phase-gate evidence');
if ((scopeClasses.target ?? []).length !== 14) fail('target scope must contain the 14 Africa registry markets');
const targetCodes = [...(scopeClasses.target ?? [])].sort();
const africaCodes = africa.targetMarkets.map((market) => market.code).sort();
if (JSON.stringify(targetCodes) !== JSON.stringify(africaCodes)) fail('target jurisdiction codes must match the Africa registry');

if (!Array.isArray(jurisdiction.jurisdictions) || jurisdiction.jurisdictions.length < 17) {
  fail('jurisdiction register must include canonical phase-1 and Africa target markets');
} else {
  const seen = new Set();
  for (const record of jurisdiction.jurisdictions) {
    if (seen.has(record.code)) fail(`${record.code}: duplicate jurisdiction`);
    seen.add(record.code);
    if (!['phase1', 'planned', 'target'].includes(record.scopeClass)) fail(`${record.code}: scopeClass must be phase1, planned or target`);
    if (record.activationState !== 'blocked' || record.paymentLaunchCleared !== false) fail(`${record.code}: activation and payment clearance must be blocked/false`);
    for (const field of ['licensingOwner', 'effectiveDate', 'counselReviewRef', 'taxRuleRef']) {
      if (record[field] !== null) fail(`${record.code}: ${field} must be null until evidence exists`);
    }
  }
}

if (!Array.isArray(jurisdiction.regulatedActivities) || jurisdiction.regulatedActivities.length < 6) {
  fail('regulated-activity map must cover alcohol, identity, payments, investment, privacy and customs');
} else {
  for (const activity of jurisdiction.regulatedActivities) {
    if (!Array.isArray(activity.lawReferences) || activity.lawReferences.length) fail(`${activity.id}: lawReferences must remain empty until counsel maps the law`);
    if (!/unmapped_pending/.test(activity.lawStatus ?? '')) fail(`${activity.id}: lawStatus must be unmapped_pending_*`);
    if (!['simulated', 'blueprint_only'].includes(activity.implementationMode)) fail(`${activity.id}: implementationMode must be simulated or blueprint_only`);
    if (activity.liveAllowed !== false) fail(`${activity.id}: liveAllowed must be false`);
    if (activity.counsel?.owner !== null || activity.counsel?.firm !== null || activity.counsel?.reviewRef !== null || activity.counsel?.effectiveDate !== null) {
      fail(`${activity.id}: counsel review must be unassigned and unevidenced`);
    }
    for (const field of ['enforcement', 'rejection', 'appeal', 'retention']) {
      if (typeof activity[field] !== 'string' || !activity[field].trim()) fail(`${activity.id}: ${field} workflow must be documented`);
    }
  }
}

if (!jurisdiction.launchClearance || jurisdiction.launchClearance.required !== true || jurisdiction.launchClearance.granted !== false) {
  fail('jurisdiction launch clearance must be required and not granted');
}
for (const field of ['jurisdiction', 'effectiveDate', 'legalApprover', 'complianceApprover', 'guardRemovalApprovalRef']) {
  if (jurisdiction.launchClearance?.[field] !== null) fail(`launchClearance.${field} must be null`);
}
for (const field of ['licenceEvidenceRefs', 'counselOpinionRefs']) {
  if ((jurisdiction.launchClearance?.[field] ?? ['nonempty']).length !== 0) fail(`launchClearance.${field} must be empty`);
}
if (!['enforcement', 'rejection', 'appeal', 'record_retention'].every((item) => jurisdiction.workflowRequirements?.includes(item))) {
  fail('workflowRequirements must include enforcement, rejection, appeal and record_retention');
}
for (const ref of jurisdiction.codeBoundaryRefs ?? []) {
  if (!existsSync(join(ROOT, ref))) fail(`missing code boundary reference: ${ref}`);
}

if (licensing.publicLaunch !== false || licensing.domains.some((domain) => domain.status !== 'not_obtained' || domain.evidenceRef !== null)) {
  fail('commercial licences must remain unobtained with null evidence');
}
if (highRisk.features.some((feature) => feature.status !== 'blocked' || feature.legalSignoff !== null || feature.complianceSignoff !== null)) {
  fail('all high-risk features must remain blocked and unsigned');
}
if (!apiConfig.includes('Production startup is disabled')) fail('production startup guard missing from API config');
if (!apiConfig.includes("REAL_AGE_PROVIDER_OPT_IN: z.enum(['true', 'false']).default('false')")) fail('real age provider opt-in must default false');
if (!apiConfig.includes("REAL_KYC_PROVIDER_OPT_IN: z.enum(['true', 'false']).default('false')")) fail('real KYC provider opt-in must default false');
if (!paymentAdapter.includes('simulated_clear')) fail('payment adapter must retain its simulated_clear-only path');
if (!/any other provider|non-simulated|unknown/i.test(paymentAdapter)) fail('payment adapter must fail closed for non-simulated providers');

if (vault.status !== 'non_live_blueprint' || vault.prototypeLiveOrdersAllowed !== false || vault.realUsdcSettlementAllowed !== false || vault.userFundsOrAssetsHeld !== false) {
  fail('Vault must remain a non-live blueprint with no funds, assets or real USDC settlement');
}
const vaultNotice = vault.notice ?? '';
if (![/no order/i, /wallet/i, /custody/i, /settlement/i, /not permitted|no .* permitted/i].every((pattern) => pattern.test(vaultNotice))) {
  fail('Vault notice must ban live orders, wallets, custody and settlement');
}
for (const review of vault.legalReviews ?? []) {
  if (review.status !== 'not_obtained' || review.evidenceRef !== null || review.owner !== null || review.jurisdiction !== null) {
    fail(`${review.id}: Vault legal review must be unassigned and unevidenced`);
  }
}
for (const ref of vault.codeRefs ?? []) {
  if (!existsSync(join(ROOT, ref))) fail(`missing Vault boundary reference: ${ref}`);
}
if (!/Vault is a non-live blueprint/i.test(readme)) fail('README must state that Vault is a non-live blueprint');
if (!/no real USDC settlement/i.test(vaultDoc)) fail('Vault deliverable must explicitly ban real USDC settlement in prototype environments');
for (const ref of ['apps/prototype/src/views/membership.js', 'apps/prototype/app.js']) {
  if (/Market open · USDC settlement/i.test(read(ref))) fail(`${ref} must not advertise live USDC settlement`);
}
if (!/no real orders are placed/i.test(vaultDoc)) fail('Vault deliverable must repeat thePrototype-mode warning');

if (errors.length) {
  console.error(`Jurisdiction compliance gate failed: ${errors.length} finding(s).`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}
console.log(`Jurisdiction compliance check passed: ${jurisdiction.jurisdictions.length} blocked jurisdiction records, ${jurisdiction.regulatedActivities.length} regulated activity maps, no live transactions or counsel evidence.`);
console.log('Vault remains a non-live blueprint; real USDC settlement and custody transfers are blocked.');
console.log('This gate does not grant launch clearance.');
