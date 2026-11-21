import assert from 'node:assert/strict';
import test from 'node:test';
import {
  evaluateMarketingRelease,
  MARKETING_AUDIT_FIELDS,
  MARKETING_REVENUE_CAP,
  type CampaignProvenance,
  type MarketingApproval,
  type MarketingReleaseRequest,
} from './marketing-controls.js';

const provenance: CampaignProvenance = {
  campaignId: 'cmp-test-001',
  createdBy: 'seller@vintora.local',
  promptHash: 'sha256:test',
  evidenceRefs: ['fact-packet:v1'],
  modelOrAdapter: 'deterministic-studio-adapter',
  reviewedAt: new Date().toISOString(),
  version: 'v1',
};

const approval: MarketingApproval = {
  approverUserId: 'growth_ops@vintora.local',
  distinct: true,
  reason: 'Reviewed alcohol advertising rules and audience scope',
};

function request(overrides: Partial<MarketingReleaseRequest> = {}): MarketingReleaseRequest {
  return {
    correlationId: 'marketing-test-001',
    tenantId: 'tenant-a',
    actorUserId: 'seller@vintora.local',
    campaignId: 'cmp-test-001',
    action: 'draft',
    geography: 'GB',
    audienceSegments: ['age_verified_adults'],
    claims: ['Single-estate Rioja with verified provenance'],
    evidenceRefs: ['fact-packet:v1'],
    provenance,
    ...overrides,
  };
}

test('draft-only defaults and complete provenance', () => {
  const incomplete = evaluateMarketingRelease(request({ provenance: null }));
  assert.equal(incomplete.allowed, false);
  assert.equal(incomplete.code, 'provenance_incomplete');
  const draft = evaluateMarketingRelease(request());
  assert.equal(draft.allowed, true);
  assert.equal(draft.code, 'allowed_draft');
  assert.equal(draft.outcome, 'draft');
  assert.equal(draft.advisoryOnly, true);
  assert.equal(MARKETING_REVENUE_CAP, 0.08);
});

test('restricted geographies, age groups and prohibited claims are denied', () => {
  assert.equal(evaluateMarketingRelease(request({ geography: 'UNVERIFIED' })).code, 'restricted_geography');
  assert.equal(evaluateMarketingRelease(request({ audienceSegments: ['underage'] })).code, 'restricted_audience');
  assert.equal(evaluateMarketingRelease(request({ claims: ['safe drinking claim'] })).code, 'denied_claim');
  assert.equal(evaluateMarketingRelease(request({ claims: ['award winning'], evidenceRefs: [] })).code, 'evidence_required');
});

test('release is blocked even with approval and alcohol validation', () => {
  const result = evaluateMarketingRelease(request({
    action: 'release',
    approval,
    alcoholValidation: { completed: true, passed: true, reviewer: 'counsel@vintora.local', jurisdiction: 'GB' },
  }));
  assert.equal(result.allowed, false);
  assert.equal(result.code, 'release_disabled');
  const unvalidated = evaluateMarketingRelease(request({ action: 'release', approval }));
  assert.equal(unvalidated.code, 'alcohol_validation_required');
});

test('pause and rollback require a distinct human with a reason', () => {
  const pause = evaluateMarketingRelease(request({ action: 'pause', approval }));
  assert.equal(pause.allowed, true);
  assert.equal(pause.code, 'allowed_pause');
  const selfApproved = evaluateMarketingRelease(request({
    action: 'pause',
    approval: { ...approval, approverUserId: 'seller@vintora.local' },
  }));
  assert.equal(selfApproved.code, 'self_approval_denied');
  const unreasoned = evaluateMarketingRelease(request({
    action: 'rollback',
    approval: { ...approval, reason: 'short' },
  }));
  assert.equal(unreasoned.code, 'approval_required');
});

test('budget increases are blocked and unusual movement raises an alert', () => {
  const increase = evaluateMarketingRelease(request({ action: 'budget_increase', approval, budgetIncreasePercent: 5 }));
  assert.equal(increase.allowed, false);
  assert.equal(increase.code, 'budget_increase_blocked');
  const anomalous = evaluateMarketingRelease(request({
    action: 'pause',
    approval,
    observedSpendVariancePct: 25,
  }));
  assert.equal(anomalous.requiresAlert, true);
  for (const field of MARKETING_AUDIT_FIELDS) assert.ok(field.length > 0);
});
