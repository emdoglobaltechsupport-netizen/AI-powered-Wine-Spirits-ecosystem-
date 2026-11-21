#!/usr/bin/env node
/**
 * Machine-check AI-generated marketing release controls:
 * - draft-only deny-by-default register and high-risk gates;
 * - human approval, audience/claim deny lists, alcohol validation and budget
 *   blocking in the shared evaluator;
 * - immutable campaign audit and simulated-only state in storage/API;
 * - honest documentation of live-release evidence gaps.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(ROOT, path), 'utf8');
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

const requiredFiles = [
  'config/marketing-release-policy.json',
  'config/high-risk-features.json',
  'packages/shared/src/marketing-controls.ts',
  'packages/shared/src/marketing-controls.test.ts',
  'packages/db/migrations/0017_privacy_marketing_controls.sql',
  'services/api/src/modules/admin/marketing-controls.repo.ts',
  'services/api/src/modules/admin/marketing-controls.routes.ts',
  'MARKETING_RELEASE_CONTROLS.md',
];
for (const file of requiredFiles) {
  check(existsSync(join(ROOT, file)), `Missing required marketing control file: ${file}`);
}

const policy = JSON.parse(read('config/marketing-release-policy.json'));
check(policy.status === 'prototype-draft-only-deny-by-default', 'Marketing policy must remain draft-only deny-by-default');
check(policy.releaseEnabled === false, 'Live marketing release must be disabled');
check(policy.humanApprovalRequired === true, 'Human approval must be required');
check(policy.distinctApproverRequired === true, 'Distinct approver must be required');
check(policy.reasonMinLength >= 8, 'Approval reason must be specific');
check(policy.defaultOutcome === 'draft', 'Default campaign outcome must be draft');
check((policy.audienceRestrictions?.allowedGeographies ?? ['x']).length === 0, 'No live geography may be authorised');
for (const id of ['UNVERIFIED', 'SANCTIONED', 'BLOCKED_BY_COUNSEL']) {
  check(policy.audienceRestrictions?.deniedGeographies?.includes(id), `Geography ${id} must be denied`);
}
for (const id of ['underage', 'age_unknown', 'health_adjacent', 'recovery_seeking', 'sensitive_category']) {
  check(policy.audienceRestrictions?.deniedAudienceSegments?.includes(id), `Audience segment ${id} must be denied`);
}
check(policy.audienceRestrictions?.noMinorTargeting === true, 'Minor targeting must be denied');
for (const pattern of ['health', 'medical', 'safe drinking', 'guaranteed', 'investment return', 'cure']) {
  check(policy.claimControls?.deniedClaimPatterns?.includes(pattern), `Claim pattern ${pattern} must be denied`);
}
check(policy.claimControls?.alcoholAdvertisingValidationRequired === true, 'Alcohol advertising validation must be required');
check(policy.claimControls?.localCounselApprovalRequired === true, 'Local counsel approval must be required');
check(policy.budgetControls?.maxIncreasePercent === 0, 'Budget increases must be blocked');
check(policy.budgetControls?.revenueCap === 0.08, 'Advertising cap must remain 8% of revenue');
check(policy.budgetControls?.noAutonomousSpend === true, 'Autonomous spend must be denied');
for (const field of ['campaignId', 'createdBy', 'promptHash', 'evidenceRefs', 'modelOrAdapter', 'reviewedAt', 'version']) {
  check(policy.provenance?.requiredFields?.includes(field), `Provenance must include ${field}`);
}
check(policy.provenance?.immutable === true, 'Campaign provenance must be immutable');
check(policy.releaseControls?.pauseAllowed === true, 'Pause control must be required');
check(policy.releaseControls?.rollbackAllowed === true, 'Rollback control must be required');
check(policy.releaseControls?.alertOnUnusualSpend === true, 'Unusual spend alerting must be required');
check(policy.audit?.appendOnly === true, 'Marketing audit must be append-only');
check(policy.audit?.recordDenials === true, 'Marketing audit must record denials');
check((policy.evidenceGaps ?? []).length >= 4, 'Marketing evidence gaps must be explicit');

const highRisk = JSON.parse(read('config/high-risk-features.json'));
for (const id of ['ai-marketing-human-release', 'ad-spend-marketing-automation']) {
  const feature = highRisk.features?.find((item) => item.id === id);
  check(Boolean(feature), `High-risk register must include ${id}`);
  if (feature) {
    check(feature.status === 'blocked', `${id} must be blocked`);
    check(feature.legalSignoff === null && feature.complianceSignoff === null, `${id} must be unsigned`);
    check(feature.activationGates?.every((gate) => gate.satisfied === false && !gate.evidenceRef),
      `All ${id} activation gates must be unsatisfied`);
  }
}

const shared = read('packages/shared/src/marketing-controls.ts');
for (const text of [
  "export const MARKETING_RELEASE_ENABLED = false",
  "export const MARKETING_REVENUE_CAP = 0.08",
  "export const MARKETING_MAX_INCREASE_PERCENT = 0",
  "export function evaluateMarketingRelease",
  "'restricted_geography'",
  "'restricted_audience'",
  "'denied_claim'",
  "'alcohol_validation_required'",
  "'approval_required'",
  "'budget_increase_blocked'",
  "'release_disabled'",
]) check(shared.includes(text), `Shared marketing evaluator must contain ${text}`);
for (const field of policy.audit.requiredFields) {
  check(shared.includes(field), `Shared audit record is missing ${field}`);
}
for (const pattern of policy.claimControls.deniedClaimPatterns) {
  check(shared.includes(`'${pattern}'`), `Shared deny list is missing claim pattern ${pattern}`);
}

const tests = read('packages/shared/src/marketing-controls.test.ts');
for (const text of ['provenance', 'restricted', 'release is blocked', 'distinct', 'budget', 'alert']) {
  check(tests.toLowerCase().includes(text), `Marketing tests must cover ${text}`);
}

const migration = read('packages/db/migrations/0017_privacy_marketing_controls.sql');
check(migration.includes('CREATE TABLE IF NOT EXISTS marketing_release_audit'), 'Migration must create marketing_release_audit');
check(migration.includes('CREATE TABLE IF NOT EXISTS marketing_campaign_controls'), 'Migration must create marketing_campaign_controls');
check(migration.includes('marketing_release_audit is append-only'), 'Marketing audit must be append-only in storage');
check(migration.includes("('draft','paused','rolled_back')"), 'Storage must not permit a live campaign state');
check(migration.includes('requested_increase_pct = 0'), 'Storage must reject budget increases');
check(migration.includes('FORCE ROW LEVEL SECURITY'), 'Marketing tables must close the owner RLS bypass');
check(!/GRANT\s+BYPASSRLS/i.test(migration), 'Marketing migration must not grant BYPASSRLS');

const repo = read('services/api/src/modules/admin/marketing-controls.repo.ts');
for (const text of ['INSERT INTO marketing_release_audit', 'INSERT INTO marketing_campaign_controls', 'resolveApprover']) {
  check(repo.includes(text), `Marketing repository must contain ${text}`);
}
const routes = read('services/api/src/modules/admin/marketing-controls.routes.ts');
for (const text of ['/marketing/controls', '/marketing/audit', '/marketing/campaigns/evaluate', 'evaluateMarketingRelease', 'liveEffects: false', 'requireRole']) {
  check(routes.includes(text), `Marketing routes must expose ${text}`);
}
check(!/\bfetch\(|axios\.|content\.publish|campaign\.spend|email\.send/.test(routes), 'Marketing routes must not expose live execution tools');

const controlsDoc = read('MARKETING_RELEASE_CONTROLS.md');
for (const text of ['Mandatory approval gateway', 'Audience and claim deny lists', 'Budget and spend controls', 'Provenance, audit and rollback', 'Verification and evidence gaps']) {
  check(controlsDoc.includes(text), `Marketing controls doc must cover ${text}`);
}
const moduleDoc = read('23-ai-marketing-automation-module.md');
check(moduleDoc.includes('MARKETING_RELEASE_CONTROLS.md'), 'Marketing module doc must reference the control-plane evidence');
const readme = read('README.md');
check(readme.includes('MARKETING_RELEASE_CONTROLS.md'), 'README must explain marketing release controls');
check(readme.toLowerCase().includes('human approval'), 'README must explain human approval');
check(readme.toLowerCase().includes('deny lists'), 'README must explain deny lists');

if (failures.length) {
  console.error(`Marketing release policy check FAILED: ${failures.length} problem(s).`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log(
  `Marketing release policy check passed: draft-only evaluator, ${policy.audienceRestrictions.deniedAudienceSegments.length} `
  + 'denied audience segments, immutable audit, paused/rolled-back simulation and blocked release/budget increase.',
);
