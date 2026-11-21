#!/usr/bin/env node
/**
 * Data-governance gate. Verifies the personal-data inventory, lawful-basis
 * register, identity separation, lifecycle workflows, retention schedule,
 * cross-border block, evaluator, API surface, tests and documentation.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(ROOT, path), 'utf8');
const errors = [];
const check = (condition, message) => { if (!condition) errors.push(message); };
const requireText = (haystack, needle, label) => {
  if (!haystack.includes(needle)) errors.push(`${label} must contain ${JSON.stringify(needle)}`);
};

const requiredFiles = [
  'config/data-governance-policy.json',
  'packages/shared/src/data-governance.ts',
  'packages/shared/src/data-governance.test.ts',
  'services/api/src/modules/privacy/privacy-controls.routes.ts',
  'services/api/src/modules/privacy/privacy-controls.repo.ts',
  'DATA_GOVERNANCE.md',
];
for (const file of requiredFiles) check(existsSync(join(ROOT, file)), `Missing data-governance file: ${file}`);

const policy = JSON.parse(read('config/data-governance-policy.json'));
check(policy.policyVersion === 'v1', 'data-governance.policyVersion must be v1');
check(policy.prototypeMode === true && policy.publicLaunch === false, 'data governance must remain prototype/no-launch');
check(policy.profilingEnabled === false, 'prototype profiling must stay disabled');
check(policy.crossBorderTransfersEnabled === false, 'cross-border transfers must stay disabled');
check(policy.lawfulBasisStatus === 'design_target_evidence_missing', 'lawful bases must be marked as unevidenced design targets');

const ids = policy.identitySeparation ?? {};
check(ids.crossDomainJoinAllowed === false, 'analytics and regulated identity domains must not be joined');
check(ids.rawIdentityDocumentsInAnalytics === false, 'raw identity documents must never enter analytics');
check(ids.analyticsIdentityCategory === 'analytics_identity', 'analytics identity category is missing');
check(ids.regulatedIdentityCategory === 'regulated_identity', 'regulated identity category is missing');
check(ids.ageTokenOnlyInMarketing === true, 'marketing must use an age token only');

const inventory = policy.dataInventory ?? [];
check(inventory.length === 18, `expected 18 inventory categories, found ${inventory.length}`);
const inventoryIds = new Set(inventory.map((item) => item.id));
check(inventoryIds.size === inventory.length, 'inventory ids must be unique');
for (const id of [
  'taste_profile', 'catalogue_interactions', 'purchase_history', 'age_documents',
  'analytics_identity', 'regulated_identity', 'kyc_log', 'custody_record',
  'transaction_record', 'ai_interaction_log', 'marketing_audience',
]) check(inventoryIds.has(id), `inventory is missing ${id}`);
for (const item of inventory) {
  check(Boolean(item.sensitivity && item.systemOfRecord && item.identityDomain), `${item.id}: sensitivity, system and domain are required`);
  check(Number.isInteger(item.retentionDays) && item.retentionDays >= 0, `${item.id}: retentionDays is required`);
  check(Array.isArray(item.purposes), `${item.id}: purposes array is required`);
}
for (const restricted of ['health_adjacent', 'precise_location', 'biometric', 'consumption_events']) {
  check(inventory.find((item) => item.id === restricted)?.purposes.length === 0, `${restricted} must have no approved purpose`);
}

const register = policy.lawfulBasisRegister ?? [];
check(register.length >= 15, `expected at least 15 lawful-basis records, found ${register.length}`);
for (const item of register) {
  check(['consent', 'contract', 'legal_obligation', 'legitimate_interests'].includes(item.lawfulBasis), `${item.id}: lawful basis must be registered`);
  check(item.status === 'design_target', `${item.id}: lawful basis must be a design target`);
  check(Boolean(item.ownerRole), `${item.id}: owner role is required`);
  check(item.evidenceRef === null, `${item.id}: no lawful-basis evidence may be attached`);
  check(inventoryIds.has(item.dataCategory), `${item.id}: data category must be in the inventory`);
}

const workflows = policy.lifecycleWorkflows ?? {};
for (const name of ['export', 'deletion', 'optOut', 'revocation']) {
  check(Boolean(workflows[name]?.steps?.length && workflows[name].implemented), `${name} workflow must have steps and an implemented boundary`);
}
check(workflows.export?.confirmation === 'EXPORT_MY_DATA', 'export must require EXPORT_MY_DATA');
check(workflows.deletion?.confirmation === 'DELETE_MY_DATA', 'deletion must require DELETE_MY_DATA');
check(workflows.revocation?.propagationWindowHours === 24, 'revocation propagation target must be 24 hours');
check(workflows.revocation?.propagationCompleted === false, 'revocation propagation must not be claimed complete');

const retention = policy.retentionSchedule ?? {};
check(retention.aiLogDays === 90, 'AI logs require a 90-day target');
check(retention.transactionRecordDays === 2555, 'transaction records require a 2,555-day target');
check(retention.kycLogDays === 2190, 'KYC logs require a 2,190-day target');
check(retention.custodyRecordDays === 3650, 'custody records require a 3,650-day target');
check(retention.marketingAudienceDays === 180, 'marketing audiences require a 180-day target');
check(retention.enforced === false, 'no retention job may be claimed');

const transfer = policy.crossBorderTransfer ?? {};
check(transfer.enabled === false, 'cross-border transfer must be disabled');
check((transfer.allowedRegions ?? []).length === 0, 'no transfer region may be allowed');
check((transfer.approvedMechanisms ?? []).length === 0, 'no transfer mechanism may be approved');
check(transfer.transferImpactAssessmentCompleted === false, 'no TIA may be claimed complete');
check((transfer.subprocessors ?? []).length === 0, 'no subprocessor may be approved');
check(transfer.evidenceRef === null, 'no transfer evidence may be attached');
check(policy.audit?.appendOnly === true && policy.audit.requiredFields?.length === 10, 'data-governance audit fields are required');
check((policy.evidenceGaps ?? []).length >= 5, 'data-governance evidence gaps must be explicit');

const shared = read('packages/shared/src/data-governance.ts');
for (const text of [
  "export const CROSS_BORDER_TRANSFERS_ENABLED = false",
  "export const CROSS_DOMAIN_JOIN_ALLOWED = false",
  "export const DATA_RETENTION_ENFORCED = false",
  "export const WITHDRAWAL_PROPAGATION_COMPLETED = false",
  "export function evaluateDataGovernanceUse",
  "'cross_border_transfer_disabled'",
  "'cross_domain_join_denied'",
  "'identity_domain_mismatch'",
  "'internal_purpose_blocked'",
  "'consent_denied'",
  "'analytics_identity'",
  "'regulated_identity'",
]) requireText(shared, text, 'data-governance.ts');

const tests = read('packages/shared/src/data-governance.test.ts');
for (const text of ['lawful basis', 'cross-border', 'domain', 'internal audit']) {
  check(tests.toLowerCase().includes(text), `data-governance tests must cover ${text}`);
}
const routes = read('services/api/src/modules/privacy/privacy-controls.routes.ts');
for (const text of ['/data-governance/evaluate', 'evaluateDataGovernanceUse', 'recordGovernanceDecision', 'crossBorder']) {
  requireText(routes, text, 'privacy-controls.routes.ts');
}
const repo = read('services/api/src/modules/privacy/privacy-controls.repo.ts');
for (const text of ['dataGovernance:', 'crossBorderTransfersEnabled', 'recordGovernanceDecision', "action: 'personal_data_use'"]) {
  requireText(repo, text, 'privacy-controls.repo.ts');
}

const highRisk = JSON.parse(read('config/high-risk-features.json'));
const feature = highRisk.features?.find((item) => item.id === 'personal-data-lifecycle-governance');
check(Boolean(feature), 'high-risk register must include personal-data-lifecycle-governance');
if (feature) {
  check(feature.status === 'blocked' && feature.legalSignoff === null && feature.complianceSignoff === null, 'data-governance feature must be blocked and unsigned');
  check(feature.activationGates?.length === 5 && feature.activationGates.every((gate) => gate.satisfied === false && !gate.evidenceRef), 'all data-governance gates must be unsatisfied');
}

const doc = read('DATA_GOVERNANCE.md');
for (const heading of ['Inventory and lawful-basis register', 'Identity separation', 'Deletion, export, opt-out and revocation', 'Retention', 'Cross-border transfer safeguards', 'Verification and evidence gaps']) {
  requireText(doc, heading, 'DATA_GOVERNANCE.md');
}
const readme = read('README.md');
requireText(readme, '[`DATA_GOVERNANCE.md`](./DATA_GOVERNANCE.md)', 'README.md');

if (errors.length) {
  console.error(`Data governance check failed: ${errors.length} finding(s).`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}
console.log(`Data governance check passed: ${inventory.length} inventory categories, ${register.length} unevidenced lawful bases, 4 lifecycle workflows.`);
console.log('Analytics and regulated identities are separated; transfers, joins and internal audit use fail closed.');
console.log('This gate proves prototype metadata parity only; it is not legal review or launch clearance.');
