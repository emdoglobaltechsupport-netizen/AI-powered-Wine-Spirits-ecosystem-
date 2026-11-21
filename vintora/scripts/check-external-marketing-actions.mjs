#!/usr/bin/env node
/**
 * External marketing action gate. Verifies sandbox-only channels, recorded
 * human approval, preview and audience verification, budget ownership, legal
 * approval, kill switch, append-only audit and honest documentation.
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
  'config/marketing-external-actions.json',
  'packages/shared/src/external-marketing-actions.ts',
  'packages/shared/src/external-marketing-actions.test.ts',
  'services/api/src/modules/admin/marketing-controls.routes.ts',
  'MARKETING_EXTERNAL_ACTIONS.md',
];
for (const file of requiredFiles) check(existsSync(join(ROOT, file)), `Missing external-action file: ${file}`);

const policy = JSON.parse(read('config/marketing-external-actions.json'));
check(policy.policyVersion === 'v1', 'external-action policyVersion must be v1');
check(policy.prototypeMode === true && policy.publicLaunch === false, 'external actions must remain prototype/no-launch');
check(policy.externalEffectsEnabled === false, 'external effects must stay disabled');
check(policy.sandboxOnly === true, 'non-production campaigns must be sandbox-only');
check(JSON.stringify(policy.allowedChannels) === JSON.stringify(['sandbox', 'prototype_local']), 'only sandbox channels may be allowed');
for (const channel of ['live', 'ad_platform', 'email_send', 'social_publish', 'seo_publish', 'influencer_outreach', 'paid_search', 'paid_social']) {
  check(policy.blockedChannels.includes(channel), `${channel} must be blocked`);
}
check(policy.approval?.requiredForExternalOrPaidAction === true, 'human approval must be required');
check(policy.approval?.distinctApproverRequired === true, 'a distinct approver must be required');
check(policy.approval?.selfApprovalDenied === true, 'self-approval must be denied');
check(policy.approval?.reasonMinLength === 8, 'approval reason must be specific');
for (const field of ['approverUserId', 'actorUserId', 'reason', 'recordedAt', 'promptHash', 'modelVersion', 'payloadHash']) {
  check(policy.approval?.requiredFields.includes(field), `approval must record ${field}`);
}
check(policy.preview?.renderedVariantRequired === true, 'rendered preview must be required');
check(policy.preview?.audienceVerificationRequired === true, 'audience verification must be required');
for (const field of ['age_gate', 'jurisdiction', 'consent_state', 'segment_exclusions']) {
  check(policy.preview?.verificationFields.includes(field), `preview verification must include ${field}`);
}
for (const segment of ['underage', 'age_unknown', 'harmful_use_inferred', 'self_excluded', 'recovery_seeking', 'health_adjacent']) {
  check(policy.preview?.deniedSegments.includes(segment), `${segment} must be denied`);
}
check(policy.budget?.ownerRequired === true, 'a named budget owner must be required');
check(policy.budget?.maxSandboxSpendUsd === 0 && policy.budget?.requestedSpendMustBeZero === true, 'sandbox spend must be capped at zero');
check(policy.legalApproval?.requiredForRegulatedClaims === true, 'legal approval must gate regulated claims');
for (const field of ['reviewer', 'jurisdiction', 'claimSetHash', 'approvedAt']) {
  check(policy.legalApproval?.requiredFields.includes(field), `legal approval must record ${field}`);
}
check(policy.killSwitch?.enabled === true, 'kill switch must be specified');
check(policy.killSwitch?.activationRequiresReason === true, 'kill switch requires a reason');
check(policy.killSwitch?.alertRequired === true, 'kill switch must alert');
check(policy.killSwitch?.drillCompleted === false && policy.killSwitch.evidenceRef === null, 'no kill-switch drill may be claimed');
check(policy.audit?.appendOnly === true && policy.audit.requiredFields?.length === 10, 'external-action audit fields are required');
check((policy.evidenceGaps ?? []).length >= 5, 'external-action evidence gaps must be explicit');

const shared = read('packages/shared/src/external-marketing-actions.ts');
for (const text of [
  'export const EXTERNAL_MARKETING_EFFECTS_ENABLED = false',
  'export const MARKETING_SANDBOX_ONLY = true',
  "['sandbox', 'prototype_local']",
  'export function evaluateExternalMarketingAction',
  "'blocked_channel'",
  "'approval_required'",
  "'self_approval_denied'",
  "'preview_required'",
  "'audience_verification_incomplete'",
  "'budget_owner_required'",
  "'spend_limit_exceeded'",
  "'legal_approval_required'",
  "'kill_switch_reason_required'",
]) requireText(shared, text, 'external-marketing-actions.ts');
for (const field of policy.approval.requiredFields) requireText(shared, `'${field}'`, 'external-marketing-actions.ts');

const tests = read('packages/shared/src/external-marketing-actions.test.ts');
for (const text of ['sandbox', 'blocked', 'approval', 'budget', 'legal', 'kill switch']) {
  check(tests.toLowerCase().includes(text), `external-action tests must cover ${text}`);
}
const routes = read('services/api/src/modules/admin/marketing-controls.routes.ts');
for (const text of ['/marketing/external-actions/evaluate', 'evaluateExternalMarketingAction', 'recordedAction', 'externalEffects: false']) {
  requireText(routes, text, 'marketing-controls.routes.ts');
}
const smoke = read('services/api/scripts/smoke.mjs');
requireText(smoke, "'/v1/admin/marketing/external-actions/evaluate'", 'smoke.mjs');
requireText(smoke, "'blocked_channel'", 'smoke.mjs');
requireText(smoke, "'allowed_sandbox_draft'", 'smoke.mjs');

const highRisk = JSON.parse(read('config/high-risk-features.json'));
const feature = highRisk.features?.find((item) => item.id === 'external-marketing-execution');
check(Boolean(feature), 'high-risk register must include external-marketing-execution');
if (feature) {
  check(feature.status === 'blocked' && feature.legalSignoff === null && feature.complianceSignoff === null, 'external execution must be blocked and unsigned');
  check(feature.activationGates?.length === 6 && feature.activationGates.every((gate) => gate.satisfied === false && !gate.evidenceRef), 'all external execution gates must be unsatisfied');
}

const doc = read('MARKETING_EXTERNAL_ACTIONS.md');
for (const heading of ['Sandbox-only channel cap', 'Auditable human approval', 'Preview, budget and legal approval', 'Emergency pause and kill switch', 'API and verification']) {
  requireText(doc, heading, 'MARKETING_EXTERNAL_ACTIONS.md');
}
requireText(read('README.md'), '[`MARKETING_EXTERNAL_ACTIONS.md`](./MARKETING_EXTERNAL_ACTIONS.md)', 'README.md');

if (errors.length) {
  console.error(`External marketing action check failed: ${errors.length} finding(s).`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}
console.log(`External marketing action check passed: ${policy.allowedChannels.length} sandbox channels, ${policy.blockedChannels.length} blocked channels.`);
console.log('Approval, preview, budget ownership, legal review and kill switch gates are machine-checked; external effects remain disabled.');
console.log('This gate proves prototype policy parity only; it is not a live connector or launch clearance.');
