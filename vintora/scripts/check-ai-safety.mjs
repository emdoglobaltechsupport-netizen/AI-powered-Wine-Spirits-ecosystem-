#!/usr/bin/env node
/**
 * AI safety accountability gate.
 *
 * Verifies that the four-tier action taxonomy, risk-tiered confirmation gates,
 * grounding/citation rules, prohibited-recommendation lists, provenance fields
 * and fail-closed evaluation gates agree across config, shared code, API and UI.
 * This is a governance check, not an evaluation result and not launch approval.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(ROOT, path), 'utf8');
const policy = JSON.parse(read('config/ai-safety-policy.json'));
const highRisk = JSON.parse(read('config/high-risk-features.json'));
const errors = [];
const fail = (message) => errors.push(message);
const requireText = (haystack, needle, label) => {
  if (!haystack.includes(needle)) fail(`${label} must contain ${JSON.stringify(needle)}`);
};

const requiredFiles = [
  'config/ai-safety-policy.json',
  'packages/shared/src/ai-safety.ts',
  'packages/shared/src/ai-safety.test.ts',
  'services/api/src/sommelier.ts',
  'apps/prototype/src/ai-safety.js',
  'apps/prototype/src/views/sommelier.js',
  'apps/prototype/src/views/assistant.js',
  'AI_SAFETY_CONTROLS.md',
];
for (const file of requiredFiles) {
  if (!existsSync(join(ROOT, file))) fail(`Missing AI safety file: ${file}`);
}

if (policy.status !== 'prototype-deterministic-deny-by-default') fail('AI policy status must remain deterministic deny-by-default');
if (policy.executionEnabled !== false || policy.externalEffectsEnabled !== false || policy.failClosed !== true) {
  fail('AI execution, external effects and fail-closed flags are incorrect');
}
if (JSON.stringify(policy.actionTiers) !== JSON.stringify(['read_only', 'recommendation', 'draft', 'execution'])) {
  fail('AI action taxonomy must be read_only, recommendation, draft and execution');
}
const expectedSurfaces = {
  sommelier: 'recommendation',
  assist: 'recommendation',
  studio: 'draft',
  pricing: 'recommendation',
  marketing: 'draft',
  techops: 'draft',
};
if (JSON.stringify(policy.surfaceTiers) !== JSON.stringify(expectedSurfaces)) fail('AI surface tiers must match the canonical taxonomy map');
for (const key of ['purchase', 'marketingSpend', 'pricing', 'campaign', 'escalation']) {
  if (typeof policy.confirmationGates?.[key] !== 'string' || !policy.confirmationGates[key].trim()) {
    fail(`confirmationGates.${key} must be documented`);
  }
}
if (policy.grounding?.citeOrAbstain !== true || policy.grounding?.minimumCitationsPerAnswer !== 1 || policy.grounding?.allowUncitedHealthOrPriceClaims !== false) {
  fail('AI grounding must enforce cite-or-abstain and ban uncited health/price claims');
}
if (policy.evaluationGates?.offlineEvaluationRequired !== true || policy.evaluationGates?.humanReviewRequired !== true || policy.evaluationGates?.promptInjectionSuiteRequired !== true || policy.evaluationGates?.releaseBlocked !== true) {
  fail('offline, human-reviewed and injection evaluations must be required with release blocked');
}
if (policy.evaluationGates?.groundednessThreshold !== 0.95 || policy.evaluationGates?.factAdherenceThreshold !== 0.98 || policy.evaluationGates?.confirmationComplianceThreshold !== 1 || policy.evaluationGates?.maxSafetyViolations !== 0) {
  fail('AI evaluation thresholds have drifted');
}
for (const field of ['evidenceRef', 'reviewer', 'reviewedAt']) {
  if (policy.evaluationGates?.[field] !== null) fail(`evaluationGates.${field} must remain null until evidence exists`);
}

const shared = read('packages/shared/src/ai-safety.ts');
const browser = read('apps/prototype/src/ai-safety.js');
const api = read('services/api/src/sommelier.ts');
const sommelierUi = read('apps/prototype/src/views/sommelier.js');
const assistUi = read('apps/prototype/src/views/assistant.js');
const doc = read('AI_SAFETY_CONTROLS.md');
const readme = read('README.md');

requireText(shared, "['read_only', 'recommendation', 'draft', 'execution'] as const", 'ai-safety.ts');
requireText(shared, "export const AI_EXECUTION_ENABLED = false", 'ai-safety.ts');
requireText(shared, "export const AI_EXTERNAL_EFFECTS_ENABLED = false", 'ai-safety.ts');
requireText(shared, 'export function evaluateAiAction', 'ai-safety.ts');
requireText(shared, 'export function validateAiResponse', 'ai-safety.ts');
for (const field of policy.provenance.requiredFields) {
  requireText(shared, `readonly ${field}:`, 'ai-safety.ts');
}
requireText(shared, policy.responsibleDrinkingNotice, 'ai-safety.ts');

function quotedPatternSources(source) {
  return [...source.matchAll(/'((?:[^'\\]|\\.)*)'/g)]
    .map((match) => {
      try { return JSON.parse(`"${match[1]}"`); } catch { return null; }
    })
    .filter((value) => typeof value === 'string' && value.includes('\\b'));
}
const configPatterns = [...policy.prohibitedRecommendationPatterns].sort();
for (const [label, source] of [['ai-safety.ts', shared], ['ai-safety.js', browser]]) {
  const actual = [...new Set(quotedPatternSources(source))].sort();
  if (JSON.stringify(actual) !== JSON.stringify(configPatterns)) {
    fail(`${label} prohibited-recommendation patterns differ from config/ai-safety-policy.json`);
  }
}

requireText(api, "import { createHash } from 'node:crypto'", 'sommelier.ts');
requireText(api, 'validateAiResponse', 'sommelier.ts');
requireText(api, 'RESPONSIBLE_DRINKING_NOTICE', 'sommelier.ts');
requireText(api, "actionTier: 'recommendation'", 'sommelier.ts');
requireText(api, 'retrievalSourceIds:', 'sommelier.ts');
requireText(api, 'factPacketHash:', 'sommelier.ts');
if (/model\.complete|openai|fetch\(|axios\./i.test(api)) fail('API Sommelier must remain a deterministic adapter');

for (const [label, source] of [['sommelier.js', sommelierUi], ['assistant.js', assistUi]]) {
  requireText(source, "from '../ai-safety.js'", label);
  requireText(source, 'screenAiReply(', label);
  requireText(source, 'RECOMMENDATION_LABEL', label);
}
requireText(sommelierUi, 'RESPONSIBLE_DRINKING_NOTICE', 'sommelier.js');
requireText(assistUi, 'RESPONSIBLE_DRINKING_NOTICE', 'assistant.js');
requireText(browser, 'export function screenAiText', 'ai-safety.js');
requireText(browser, 'export function screenAiReply', 'ai-safety.js');
requireText(browser, 'AI safety policy · cite-or-abstain', 'ai-safety.js');

for (const id of ['ai-publishing', 'ai-personalization-consent', 'ai-marketing-human-release', 'ai-agent-autonomy']) {
  const feature = highRisk.features.find((record) => record.id === id);
  if (!feature || feature.status !== 'blocked' || feature.legalSignoff !== null || feature.complianceSignoff !== null) {
    fail(`${id} must remain blocked and unsigned`);
  }
}
const agentPolicy = JSON.parse(read('config/agent-autonomy-policy.json'));
const marketingPolicy = JSON.parse(read('config/marketing-release-policy.json'));
if (agentPolicy.executionEnabled !== false || marketingPolicy.releaseEnabled !== false) {
  fail('agent execution and marketing release must remain disabled');
}

requireText(readme, '[`AI_SAFETY_CONTROLS.md`](./AI_SAFETY_CONTROLS.md)', 'README.md');
requireText(doc, 'read_only', 'AI_SAFETY_CONTROLS.md');
requireText(doc, 'recommendation', 'AI_SAFETY_CONTROLS.md');
requireText(doc, 'draft', 'AI_SAFETY_CONTROLS.md');
requireText(doc, 'execution', 'AI_SAFETY_CONTROLS.md');
requireText(doc, 'No offline evaluation result is attached', 'AI_SAFETY_CONTROLS.md');

for (const ref of policy.codeBoundaryRefs) {
  if (!existsSync(join(ROOT, ref))) fail(`missing AI safety code boundary reference: ${ref}`);
}

if (errors.length) {
  console.error(`AI safety check failed: ${errors.length} finding(s).`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}
console.log(`AI safety check passed: 4 action tiers, ${Object.keys(policy.surfaceTiers).length} surfaces, ${policy.prohibitedRecommendationPatterns.length} prohibited patterns, ${policy.provenance.requiredFields.length} provenance fields.`);
console.log('Deterministic adapters only; execution, external effects and AI release remain blocked.');
console.log('This gate does not validate model quality or grant launch clearance.');
