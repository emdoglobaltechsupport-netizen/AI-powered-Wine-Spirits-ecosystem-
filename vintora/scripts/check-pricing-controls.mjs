#!/usr/bin/env node
/**
 * Dynamic-pricing fairness gate.
 *
 * Confirms that pricing remains a bounded recommendation engine with explicit
 * permitted/excluded variables, hard constraints, human approval, explainability,
 * audit fields, counsel placeholders and disparity-test blockers. It is a
 * configuration/parity check, not a legal opinion or an empirical fairness test.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(ROOT, path), 'utf8');
const policy = JSON.parse(read('config/pricing-controls.json'));
const highRisk = JSON.parse(read('config/high-risk-features.json'));
const errors = [];
const fail = (message) => errors.push(message);
const requireText = (haystack, needle, label) => {
  if (!haystack.includes(needle)) fail(`${label} must contain ${JSON.stringify(needle)}`);
};
const equalJson = (a, b) => JSON.stringify(a) === JSON.stringify(b);

for (const field of ['autonomousPricingEnabled', 'personalizedPricingEnabled', 'liveCompetitorDataEnabled', 'applyExecutionEnabled', 'failClosed']) {
  const expected = ['failClosed'].includes(field);
  if (policy[field] !== expected) fail(`pricing-controls.${field} must be ${expected}`);
}
if (policy.status !== 'prototype-recommendation-only-deny-by-default') fail('pricing status must be recommendation-only deny-by-default');

if (policy.permittedVariables?.length !== 7 || policy.prohibitedVariables?.length !== 9) {
  fail('pricing variable registers must contain 7 permitted and 9 prohibited entries');
}
for (const variable of ['protected_class_or_proxy', 'inferred_demographic_segment', 'postcode_or_neighbourhood_willingness_to_pay', 'unlicensed_competitor_price']) {
  if (!policy.prohibitedVariables?.includes(variable)) fail(`${variable} must be a prohibited pricing variable`);
}
const expectedConstraints = {
  minimumGrossMarginPct: 12,
  maximumIncreasePct: 10,
  maximumDiscountPct: 15,
  minimumDaysBetweenPublicChanges: 30,
  maximumChangesPerSkuPerQuarter: 2,
  sameSkuSamePublishedPrice: true,
  noHiddenFees: true,
  publicEffectiveDateRequired: true,
};
if (!equalJson(policy.hardConstraints, expectedConstraints)) fail('pricing hard constraints have drifted');
if (policy.humanApproval?.requiredForAnyPublishedChange !== true || policy.humanApproval?.distinctApproverRequired !== true || policy.humanApproval?.selfApprovalDenied !== true || policy.humanApproval?.reasonMinLength !== 8) {
  fail('published pricing changes require distinct, reasoned human approval');
}
if (policy.competitorData?.licensedSourceRequired !== true || policy.competitorData?.allowScraping !== false || policy.competitorData?.allowIndividualCompetitorTargeting !== false || policy.competitorData?.noPriceSignallingOrCoordination !== true) {
  fail('competitor pricing data must be licensed, aggregated and non-coordinative');
}
if (policy.explainability?.appendOnlyAudit !== true || policy.explainability?.requiredFields?.length !== 7) {
  fail('pricing explainability requires seven fields and an append-only audit');
}
if (policy.auditFields?.length !== 12 || !policy.auditFields.includes('explanationHash')) {
  fail('pricing audit fields must include explanationHash and match the register');
}
for (const review of policy.legalReviews ?? []) {
  if (review.status !== 'not_obtained' || review.evidenceRef !== null || review.owner !== null) {
    fail(`${review.id}: pricing legal review must be unassigned and unevidenced`);
  }
}
if (policy.disparityTesting?.publishBlockedUntilReview !== true || policy.disparityTesting?.evidenceRef !== null || policy.disparityTesting?.reviewer !== null || policy.disparityTesting?.reviewedAt !== null) {
  fail('publication must remain blocked pending unevidenced disparity review');
}

const shared = read('packages/shared/src/pricing-controls.ts');
const doc = read('PRICING_CONTROLS.md');
const pricingDesign = read('19-ai-pricing-engine.md');
const readme = read('README.md');
for (const [label, source] of [['pricing-controls.ts', shared], ['PRICING_CONTROLS.md', doc]]) {
  for (const variable of policy.permittedVariables) requireText(source, variable, label);
  for (const variable of policy.prohibitedVariables.slice(0, 4)) requireText(source, variable, label);
}
requireText(shared, 'export const PRICING_APPLY_EXECUTION_ENABLED = false', 'pricing-controls.ts');
requireText(shared, 'export const PRICING_PERSONALIZATION_ENABLED = false', 'pricing-controls.ts');
requireText(shared, 'export function evaluatePricingProposal', 'pricing-controls.ts');
requireText(shared, "executionAuthorized: false", 'pricing-controls.ts');
requireText(shared, "minimumGrossMarginPct: 12", 'pricing-controls.ts');
requireText(shared, "maximumIncreasePct: 10", 'pricing-controls.ts');
requireText(shared, "maximumDiscountPct: 15", 'pricing-controls.ts');
for (const field of policy.auditFields) requireText(shared, `'${field}'`, 'pricing-controls.ts');
for (const field of policy.explainability.requiredFields) requireText(shared, `readonly ${field}:`, 'pricing-controls.ts');

const feature = highRisk.features.find((record) => record.id === 'pricing-promotions');
if (!feature || feature.status !== 'blocked' || feature.legalSignoff !== null || feature.complianceSignoff !== null) {
  fail('pricing-promotions must remain blocked and unsigned');
}
requireText(pricingDesign, 'recommendation', '19-ai-pricing-engine.md');
requireText(pricingDesign, 'seller approval', '19-ai-pricing-engine.md');
requireText(pricingDesign, 'audit', '19-ai-pricing-engine.md');
requireText(readme, '[`PRICING_CONTROLS.md`](./PRICING_CONTROLS.md)', 'README.md');
requireText(doc, 'No competition-law or consumer-pricing counsel opinion is attached', 'PRICING_CONTROLS.md');
requireText(doc, 'No measured geographic or demographic disparity result is attached', 'PRICING_CONTROLS.md');

for (const ref of policy.codeBoundaryRefs) {
  if (!existsSync(join(ROOT, ref))) fail(`missing pricing control reference: ${ref}`);
}
if (existsSync(join(ROOT, 'services/api/src/pricing'))) fail('no live pricing automation service may exist in the prototype');

if (errors.length) {
  console.error(`Pricing control check failed: ${errors.length} finding(s).`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}
console.log(`Pricing control check passed: ${policy.permittedVariables.length} permitted inputs, ${policy.prohibitedVariables.length} exclusions, ${Object.keys(policy.hardConstraints).length} hard constraints, human approval required.`);
console.log('Recommendation engine only; no personalized, automated or competitor-coordinated pricing is permitted.');
console.log('This gate does not prove competition-law compliance or grant launch clearance.');
