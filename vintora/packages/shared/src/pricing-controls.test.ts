import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PRICING_AUDIT_FIELDS,
  PRICING_CONSTRAINTS,
  PRICING_PERMITTED_VARIABLES,
  PRICING_PROHIBITED_VARIABLES,
  evaluatePricingProposal,
  type PricingProposal,
} from './pricing-controls.js';

const proposal: PricingProposal = {
  correlationId: 'corr-1',
  sku: 'sku-1001',
  actorUserId: 'pricing-analyst',
  currentPriceUsd: 100,
  proposedPriceUsd: 105,
  unitCostUsd: 80,
  variables: ['verified_unit_cost', 'published_list_price'],
  explanation: {
    ruleVersion: 'pricing-rules-v1',
    inputs: ['verified_unit_cost', 'published_list_price'],
    marginBeforePct: 20,
    marginAfterPct: (25 / 105) * 100,
    changePct: 5,
    reasons: ['Verified cost increase'],
    evidenceRefs: ['cost-sheet-2026-11'],
  },
  disparityEvidence: {
    geographicReviewed: true,
    demographicReviewed: true,
    protectedProxyScanCompleted: true,
    evidenceRef: 'disparity-review-2026-11',
  },
};

test('pricing taxonomy is explicit and fail-closed', () => {
  assert.equal(PRICING_PERMITTED_VARIABLES.length, 7);
  assert.equal(PRICING_PROHIBITED_VARIABLES.length, 9);
  assert.equal(PRICING_CONSTRAINTS.minimumGrossMarginPct, 12);
  assert.equal(PRICING_AUDIT_FIELDS.length, 12);
});

test('a bounded, explained proposal is a recommendation only', () => {
  const decision = evaluatePricingProposal(proposal);
  assert.equal(decision.code, 'allowed_recommendation');
  assert.equal(decision.executionAuthorized, false);
  assert.equal(decision.requiresHumanApproval, true);
});

test('personalized pricing and automated application are denied', () => {
  assert.equal(evaluatePricingProposal({ ...proposal, personalized: true }).code, 'personalized_pricing_denied');
  assert.equal(evaluatePricingProposal({ ...proposal, applyRequested: true }).code, 'apply_execution_denied');
});

test('protected-class, demographic and unlicensed competitor inputs are denied', () => {
  assert.equal(evaluatePricingProposal({ ...proposal, variables: ['inferred_demographic_segment'] }).code, 'prohibited_variable');
  assert.equal(evaluatePricingProposal({ ...proposal, variables: ['unknown_signal'] }).code, 'prohibited_variable');
  assert.equal(evaluatePricingProposal({ ...proposal, competitorDataSource: 'rival-site', competitorDataLicensed: false }).code, 'unlicensed_competitor_data');
});

test('margin and change bands are enforced', () => {
  assert.equal(evaluatePricingProposal({ ...proposal, proposedPriceUsd: 115 }).code, 'outside_change_band');
  assert.equal(evaluatePricingProposal({ ...proposal, currentPriceUsd: 105, unitCostUsd: 95 }).code, 'below_margin_floor');
});

test('missing explanation or disparity evidence fails closed', () => {
  assert.equal(evaluatePricingProposal({ ...proposal, explanation: { ...proposal.explanation, ruleVersion: 'unknown' } }).code, 'missing_explanation');
  assert.equal(evaluatePricingProposal({ ...proposal, disparityEvidence: null }).code, 'disparity_evidence_required');
});

test('approval must be distinct, reasoned and unexpired', () => {
  const approval = { approverUserId: 'cfo', actorUserId: 'pricing-analyst', reason: 'Approved margin review' };
  assert.equal(evaluatePricingProposal({ ...proposal, humanApproval: approval }).code, 'allowed_recommendation');
  assert.equal(evaluatePricingProposal({ ...proposal, humanApproval: { ...approval, approverUserId: 'pricing-analyst' } }).code, 'self_approval_denied');
  assert.equal(evaluatePricingProposal({ ...proposal, humanApproval: { ...approval, reason: 'ok' } }).code, 'approval_reason_required');
  assert.equal(evaluatePricingProposal({ ...proposal, humanApproval: { ...approval, expiresAt: '2020-01-01' } }).code, 'approval_expired');
});
