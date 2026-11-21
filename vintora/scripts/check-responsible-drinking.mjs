#!/usr/bin/env node
/**
 * Responsible-drinking gate. Verifies concrete prototype limits, harmful-use
 * screening, protected-audience denial, support notices, age re-verification,
 * audit fields and policy-review gaps across config, shared code, API and UI.
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
  'config/responsible-drinking-policy.json',
  'packages/shared/src/responsible-drinking.ts',
  'packages/shared/src/responsible-drinking.test.ts',
  'services/api/src/sommelier.ts',
  'apps/prototype/src/ai-safety.js',
  'RESPONSIBLE_DRINKING_CONTROLS.md',
];
for (const file of requiredFiles) check(existsSync(join(ROOT, file)), `Missing responsible-drinking file: ${file}`);

const policy = JSON.parse(read('config/responsible-drinking-policy.json'));
check(policy.policyVersion === 'v1', 'responsible-drinking policyVersion must be v1');
check(policy.prototypeMode === true && policy.publicLaunch === false, 'responsible-drinking controls must remain prototype/no-launch');
check(policy.recommendationControls?.maxSuggestionsPerAnswer === 3, 'recommendation suggestion cap must be three');
check(policy.recommendationControls?.maxBottlesPerSuggestionSet === 6, 'suggestion-set bottle cap must be six');
check(policy.recommendationControls?.blockWhenHarmSignalDetected === true, 'harmful-use signals must block recommendations');
check(policy.recommendationControls?.noHealthClaims === true, 'health claims must be prohibited');
check(policy.recommendationControls?.noMinorTargeting === true, 'minor targeting must be prohibited');
const velocity = policy.purchaseVelocityControls ?? {};
check(velocity.maxBottlesPerOrder === 6, 'order bottle cap must be six');
check(velocity.maxBottles24h === 12, '24-hour bottle cap must be twelve');
check(velocity.maxBottles7d === 24, '7-day bottle cap must be twenty-four');
check(velocity.maxPromoEmailsPerWeek === 3, 'weekly promotional email cap must be three');
check(velocity.maxPromoPushesPerDay === 2, 'daily promotional push cap must be two');
check(velocity.enforcedAtPrototypeCheckout === true, 'prototype checkout must enforce velocity limits');
check(velocity.enforcedLive === false, 'no live velocity enforcement may be claimed');
check(velocity.humanReviewOnThreshold === true, 'threshold crossings require human review');
const targeting = policy.targetingControls ?? {};
for (const segment of ['underage', 'age_unknown', 'harmful_use_inferred', 'self_excluded', 'recovery_seeking', 'health_adjacent']) {
  check(targeting.deniedAudienceSegments?.includes(segment), `${segment} must be denied in targeting`);
}
check(targeting.noRetargetingFromConsumptionEvents === true, 'consumption events must never feed retargeting');
check(targeting.suppressionListPropagationHours === 24, 'suppression propagation target must be 24 hours');
check(targeting.suppressionPropagationCompleted === false, 'suppression propagation must not be claimed complete');
const ageGate = policy.ageGate ?? {};
check(ageGate.requiredBeforeCheckout === true, 'age gate must be required before checkout');
check(ageGate.maxAgeEvidenceHours === 720, 'age evidence must expire after 720 hours');
for (const trigger of ['evidence_expired', 'country_changed', 'document_mismatch', 'age_threshold_changed', 'supervisor_override']) {
  check(ageGate.reverificationTriggers?.includes(trigger), `re-verification trigger ${trigger} is missing`);
}
check(policy.warnings?.showSupportNoticeWhenHarmSignalsDetected === true, 'support notice must appear on harm signals');
check(policy.warnings?.showResponsibleLineInMarketingDraft === true, 'marketing drafts must carry the responsible line');
check(policy.audit?.appendOnly === true, 'responsible-drinking audit must be append-only');
check(policy.audit?.requiredFields?.length === 8, 'eight responsible-drinking audit fields are required');
check(policy.policyReview?.required === true, 'cross-functional policy review must be required');
for (const role of ['Compliance Lead', 'Addiction/Health Adviser', 'Product Lead']) {
  check(policy.policyReview?.reviewRoles?.includes(role), `policy review role ${role} is required`);
}
for (const key of ['minorsReviewRequired', 'addictionReviewRequired', 'healthSensitiveContextReviewRequired']) {
  check(policy.policyReview?.[key] === true, `${key} must be required`);
}
check(policy.policyReview?.reviewCompleted === false, 'no completed policy review may be claimed');
check(policy.policyReview?.evidenceRef === null, 'no policy-review evidence may be attached');
check((policy.evidenceGaps ?? []).length >= 4, 'responsible-drinking evidence gaps must be explicit');

const shared = read('packages/shared/src/responsible-drinking.ts');
for (const text of [
  "import { RESPONSIBLE_DRINKING_NOTICE } from './ai-safety.js'",
  'export const MAX_SUGGESTIONS_PER_ANSWER = 3',
  'export const MAX_BOTTLES_PER_SUGGESTION_SET = 6',
  'export const MAX_BOTTLES_PER_ORDER = 6',
  'export const MAX_BOTTLES_24H = 12',
  'export const MAX_BOTTLES_7D = 24',
  'export const MAX_PROMO_EMAILS_PER_WEEK = 3',
  'export const MAX_PROMO_PUSHES_PER_DAY = 2',
  'export const MAX_AGE_EVIDENCE_HOURS = 720',
  'export function detectHarmSignals',
  'export function evaluateResponsibleDrinking',
  "'age_gate_required'",
  "'age_evidence_expired'",
  "'harmful_use_signal'",
  "'minor_targeting_denied'",
  "'recommendation_limit_exceeded'",
  "'purchase_limit_exceeded'",
  "'frequency_limit_exceeded'",
  "'support_notice_required'",
]) requireText(shared, text, 'responsible-drinking.ts');
requireText(shared, policy.warnings.supportNotice, 'responsible-drinking.ts');
for (const pattern of policy.recommendationControls.harmSignalPatterns) requireText(shared, `'${pattern}'`, 'responsible-drinking.ts');
for (const segment of policy.targetingControls.deniedAudienceSegments) requireText(shared, `'${segment}'`, 'responsible-drinking.ts');
for (const trigger of policy.ageGate.reverificationTriggers) requireText(shared, `'${trigger}'`, 'responsible-drinking.ts');

const tests = read('packages/shared/src/responsible-drinking.test.ts');
for (const text of ['limits', 'harmful-use', 'audiences', 'expiry', 'support notice']) {
  check(tests.toLowerCase().includes(text), `responsible-drinking tests must cover ${text}`);
}
const sommelier = read('services/api/src/sommelier.ts');
for (const text of [
  'detectHarmSignals(query)',
  'evaluateResponsibleDrinking(',
  "surface: 'recommendation'",
  'supportNotice: RESPONSIBLE_DRINKING_SUPPORT_NOTICE',
  '!responsible.allowed',
  'responsibleDrinkingCode:',
]) requireText(sommelier, text, 'sommelier.ts');
check(!/fetch\(|axios\.|model\.complete/i.test(sommelier), 'Sommelier must remain deterministic');

const browser = read('apps/prototype/src/ai-safety.js');
requireText(browser, 'export var RESPONSIBLE_DRINKING_SUPPORT_NOTICE', 'ai-safety.js');
requireText(browser, policy.warnings.supportNotice, 'ai-safety.js');
requireText(browser, 'result.supportNotice = RESPONSIBLE_DRINKING_SUPPORT_NOTICE', 'ai-safety.js');

const aiPolicy = JSON.parse(read('config/ai-safety-policy.json'));
check(aiPolicy.responsibleDrinkingNotice === policy.warnings.notice, 'AI policy and responsible-drinking notices must match');
const marketingPolicy = JSON.parse(read('config/marketing-external-actions.json'));
for (const segment of policy.targetingControls.deniedAudienceSegments) {
  check(marketingPolicy.preview?.deniedSegments?.includes(segment), `marketing preview must also deny ${segment}`);
}

const highRisk = JSON.parse(read('config/high-risk-features.json'));
const feature = highRisk.features?.find((item) => item.id === 'responsible-drinking-velocity-controls');
check(Boolean(feature), 'high-risk register must include responsible-drinking-velocity-controls');
if (feature) {
  check(feature.status === 'blocked' && feature.legalSignoff === null && feature.complianceSignoff === null, 'velocity controls must be blocked and unsigned');
  check(feature.activationGates?.length === 6 && feature.activationGates.every((gate) => gate.satisfied === false && !gate.evidenceRef), 'all responsible-drinking gates must be unsatisfied');
}

const doc = read('RESPONSIBLE_DRINKING_CONTROLS.md');
for (const heading of ['Purchase and recommendation limits', 'Prohibited targeting and support resources', 'Age gating and re-verification', 'Audit and policy review', 'Verification']) {
  requireText(doc, heading, 'RESPONSIBLE_DRINKING_CONTROLS.md');
}
requireText(read('README.md'), '[`RESPONSIBLE_DRINKING_CONTROLS.md`](./RESPONSIBLE_DRINKING_CONTROLS.md)', 'README.md');

if (errors.length) {
  console.error(`Responsible drinking check failed: ${errors.length} finding(s).`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}
console.log(`Responsible drinking check passed: ${policy.recommendationControls.harmSignalPatterns.length} harm signals, ${policy.targetingControls.deniedAudienceSegments.length} denied segments, ${policy.ageGate.reverificationTriggers.length} re-verification triggers.`);
console.log('Prototype limits, support notices and protected-audience denials are enforced in shared guards.');
console.log('This gate is not a clinical review, legal opinion or launch clearance.');
