#!/usr/bin/env node
/**
 * Machine-check AI personalization privacy controls:
 * - purpose map, data inventory, sensitive-data denials and retention schedule;
 * - deny-by-default evaluator consent/purpose/isolation enforcement;
 * - append-only decision audit and subject-scoped RLS;
 * - authenticated consent/export/deletion API;
 * - blocked high-risk gate and honest documentation.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(ROOT, path), 'utf8');
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

const requiredFiles = [
  'config/privacy-consent-policy.json',
  'config/high-risk-features.json',
  'packages/shared/src/privacy-controls.ts',
  'packages/shared/src/privacy-controls.test.ts',
  'packages/db/migrations/0017_privacy_marketing_controls.sql',
  'services/api/src/modules/privacy/privacy-controls.repo.ts',
  'services/api/src/modules/privacy/privacy-controls.routes.ts',
  'PRIVACY_AI_CONTROLS.md',
];
for (const file of requiredFiles) {
  check(existsSync(join(ROOT, file)), `Missing required privacy control file: ${file}`);
}

const policy = JSON.parse(read('config/privacy-consent-policy.json'));
check(policy.status === 'prototype-deny-by-default', 'Privacy policy must remain deny-by-default');
check(policy.profilingEnabled === false, 'Prototype profiling must be disabled');
check(policy.optInRequired === true, 'Optional purposes require opt-in');
check(policy.defaultState === 'off', 'Privacy-preserving default must be off');
check(policy.privacyByDefault === true, 'Privacy-by-default must be enabled');
check(policy.purposeSeparation === true, 'Recommendation, marketing and experimentation data must be separate');
check(policy.lawfulBasisRequired === true, 'A lawful basis must be required');

const purposes = Array.isArray(policy.purposes) ? policy.purposes : [];
check(purposes.length === 4, `Expected 4 purposes, found ${purposes.length}`);
const purposeIds = purposes.map((purpose) => purpose.id);
for (const id of ['recommendations', 'closed_loop_personalization', 'marketing', 'experimentation']) {
  check(purposeIds.includes(id), `Missing privacy purpose ${id}`);
}
const purposeById = new Map(purposes.map((purpose) => [purpose.id, purpose]));
for (const purpose of purposes) {
  check(purpose.defaultState === 'off', `${purpose.id}: default state must be off`);
  check(purpose.requiresOptIn === true, `${purpose.id}: opt-in must be required`);
  check(Array.isArray(purpose.allowedData) && purpose.allowedData.length > 0, `${purpose.id}: allowedData is required`);
  check(Number.isInteger(purpose.retentionDays) && purpose.retentionDays > 0, `${purpose.id}: retentionDays is required`);
  for (const category of purpose.allowedData) {
    check(!purpose.deniedData?.includes(category), `${purpose.id}: ${category} is both allowed and denied`);
  }
}
const closedLoop = purposeById.get('closed_loop_personalization');
check(closedLoop?.requiresDpia === true, 'Closed-loop personalization requires a DPIA');
check(
  ['consumption_events', 'health_adjacent', 'precise_location', 'age_documents', 'biometric']
    .every((category) => purposeById.get('recommendations')?.deniedData.includes(category)),
  'Recommendations must deny sensitive and health-adjacent categories',
);
check(
  !purposeById.get('marketing')?.allowedData.includes('taste_profile') &&
  !purposeById.get('marketing')?.allowedData.includes('purchase_history'),
  'Marketing must not reuse taste or purchase profiling data',
);

const inventory = Array.isArray(policy.dataInventory) ? policy.dataInventory : [];
check(inventory.length >= 11, `Expected at least 11 inventory records, found ${inventory.length}`);
const inventoryIds = new Set(inventory.map((item) => item.id));
for (const id of purposeIds.flatMap((id) => [...(purposeById.get(id)?.allowedData ?? [])])) {
  check(inventoryIds.has(id), `Inventory is missing category ${id}`);
}
for (const id of ['health_adjacent', 'precise_location', 'biometric', 'age_documents', 'consumption_events']) {
  check(policy.sensitiveDataRules?.neverUseForProfiling?.includes(id), `${id} must never be used for profiling`);
}
check(policy.sensitiveDataRules?.noHealthClaims === true, 'No health claims may be made');
check(policy.rights?.export === 'simulated-demo-export', 'Export must remain explicitly simulated');
check(policy.rights?.deletion === 'human-reviewed-request', 'Deletion must require human review');
check(policy.rights?.verifyRequester === true, 'Requester verification must be required');
check(policy.retention?.enforced === false, 'No production retention job may be claimed');
check(policy.retention?.deletionQueueRequired === true, 'A deletion queue must still be required');
check(policy.audit?.appendOnly === true, 'Privacy audit must be append-only');
check(policy.audit?.recordDenials === true, 'Privacy audit must record denials');
check(policy.dpia?.requiredForClosedLoopPersonalization === true, 'DPIA must gate closed-loop personalization');
check(policy.dpia?.completed === false, 'No completed DPIA may be claimed');
check(policy.dpia?.evidenceRef === null, 'DPIA evidence must not exist');
check((policy.evidenceGaps ?? []).length >= 4, 'Privacy evidence gaps must be explicit');

const highRisk = JSON.parse(read('config/high-risk-features.json'));
const feature = highRisk.features?.find((item) => item.id === 'ai-personalization-consent');
check(Boolean(feature), 'High-risk register must include ai-personalization-consent');
if (feature) {
  check(feature.status === 'blocked', 'AI personalization consent must be blocked');
  check(feature.legalSignoff === null && feature.complianceSignoff === null, 'AI personalization consent must be unsigned');
  check(feature.activationGates?.length === 8, 'AI personalization consent must have 8 activation gates');
  check(feature.activationGates?.every((gate) => gate.satisfied === false && !gate.evidenceRef),
    'All AI personalization activation gates must be unsatisfied');
}

const shared = read('packages/shared/src/privacy-controls.ts');
for (const text of [
  "export const PERSONALIZATION_ENABLED = false",
  "export const CLOSED_LOOP_PERSONALIZATION_ENABLED = false",
  "export const DPIA_COMPLETED = false",
  "export const RETENTION_ENFORCED = false",
  "export const SENSITIVE_DATA_CATEGORIES",
  "export function evaluatePersonalDataUse",
  "'sensitive_data_denied'",
  "'closed_loop_disabled'",
  "'purpose_not_allowed'",
  "'consent_required'",
  "'consent_withdrawn'",
  "'retention_expired'",
]) check(shared.includes(text), `Shared privacy evaluator must contain ${text}`);
for (const id of purposeIds) check(shared.includes(`'${id}'`), `Shared evaluator is missing purpose ${id}`);
for (const field of policy.audit.requiredFields) {
  check(shared.includes(field), `Shared audit record is missing ${field}`);
}

const tests = read('packages/shared/src/privacy-controls.test.ts');
for (const text of ['opt-in', 'purpose separation', 'sensitive', 'withdrawal', 'closed-loop', 'retention']) {
  check(tests.toLowerCase().includes(text), `Privacy tests must cover ${text}`);
}

const migration = read('packages/db/migrations/0017_privacy_marketing_controls.sql');
check(migration.includes('CREATE TABLE IF NOT EXISTS privacy_consents'), 'Migration must create privacy_consents');
check(migration.includes('CREATE TABLE IF NOT EXISTS privacy_decision_audit'), 'Migration must create privacy_decision_audit');
check(migration.includes('CREATE TABLE IF NOT EXISTS privacy_requests'), 'Migration must create privacy_requests');
check(migration.includes('privacy_decision_audit is append-only'), 'Privacy audit must be append-only in storage');
check(migration.includes('subject_isolation'), 'Privacy tables must enforce subject-scoped RLS');
check(migration.includes('AS RESTRICTIVE'), 'Subject isolation must be restrictive so tenant AND subject both apply');
check(migration.includes('FORCE ROW LEVEL SECURITY'), 'Privacy tables must close the owner RLS bypass');
check(!/GRANT\s+BYPASSRLS/i.test(migration), 'Privacy migration must not grant BYPASSRLS');

const repo = read('services/api/src/modules/privacy/privacy-controls.repo.ts');
for (const text of [
  'INSERT INTO privacy_decision_audit',
  'FROM privacy_consents',
  'INSERT INTO privacy_requests',
  'simulated-export',
  'review-required',
]) check(repo.includes(text), `Privacy repository must contain ${text}`);
const routes = read('services/api/src/modules/privacy/privacy-controls.routes.ts');
for (const text of ['/controls', '/consents', '/data-use/evaluate', '/export', '/deletion-request', '/audit', 'requireUser']) {
  check(routes.includes(text), `Privacy routes must expose ${text}`);
}
check(!routes.includes('console.log'), 'Privacy routes must not log subject data');

const controlsDoc = read('PRIVACY_AI_CONTROLS.md');
for (const text of ['Data inventory', 'Granular consent', 'Transparent data controls', 'Retention and DPIA', 'DPIA has been completed']) {
  check(controlsDoc.toLowerCase().includes(text.toLowerCase()), `Privacy controls doc must cover ${text}`);
}
const privacyDoc = read('PRIVACY_ACCESSIBILITY_INCLUSIVITY.md');
check(privacyDoc.includes('PRIVACY_AI_CONTROLS.md'), 'Privacy requirements doc must reference the control-plane evidence');
const readme = read('README.md');
check(readme.includes('PRIVACY_AI_CONTROLS.md'), 'README must explain privacy controls');
check(readme.toLowerCase().includes('consent'), 'README must explain consent');
check(readme.toLowerCase().includes('data minimization'), 'README must explain data minimization');

if (failures.length) {
  console.error(`Privacy consent policy check FAILED: ${failures.length} problem(s).`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log(
  `Privacy consent policy check passed: ${purposes.length} purposes, ${inventory.length} inventory categories, `
  + 'deny-by-default profiling, append-only audit and simulated DSAR controls.',
);
