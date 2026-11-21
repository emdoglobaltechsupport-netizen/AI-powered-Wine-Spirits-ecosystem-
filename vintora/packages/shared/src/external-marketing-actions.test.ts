import assert from 'node:assert/strict';
import test from 'node:test';
import {
  evaluateExternalMarketingAction,
  EXTERNAL_MARKETING_AUDIT_FIELDS,
  MARKETING_SANDBOX_CHANNELS,
  type ExternalMarketingActionRequest,
} from './external-marketing-actions.js';

function request(overrides: Partial<ExternalMarketingActionRequest> = {}): ExternalMarketingActionRequest {
  return {
    correlationId: 'ext-mkt-test-001',
    tenantId: 'tenant-a',
    actorUserId: 'seller@vintora.local',
    campaignId: 'cmp-test-001',
    action: 'preview',
    channel: 'sandbox',
    claims: ['Single-estate Rioja with verified provenance'],
    audienceSegments: ['age_verified_adults'],
    preview: {
      renderedVariantId: 'variant-1',
      audienceVerified: true,
      verifiedFields: ['age_gate', 'jurisdiction', 'consent_state', 'segment_exclusions'],
    },
    ...overrides,
  };
}

const approval = {
  approverUserId: 'growth_ops@vintora.local',
  actorUserId: 'seller@vintora.local',
  reason: 'Reviewed rendered variant, audience and sandbox spend envelope',
  recordedAt: new Date().toISOString(),
  promptHash: 'sha256:prompt',
  modelVersion: 'deterministic-studio-v1',
  payloadHash: 'sha256:payload',
};

test('sandbox preview is advisory and never causes an external effect', () => {
  const result = evaluateExternalMarketingAction(request());
  assert.equal(result.code, 'allowed_sandbox_draft');
  assert.equal(result.externalEffects, false);
  assert.equal(result.advisoryOnly, true);
  assert.deepEqual([...MARKETING_SANDBOX_CHANNELS], ['sandbox', 'prototype_local']);
});

test('live and paid channels are blocked', () => {
  for (const channel of ['live', 'ad_platform', 'email_send', 'social_publish', 'paid_social']) {
    assert.equal(evaluateExternalMarketingAction(request({ channel })).code, 'blocked_channel');
  }
});

test('approval requires recorded approver, prompt, model and payload', () => {
  const missing = evaluateExternalMarketingAction(request({ action: 'approval', approval: null }));
  assert.equal(missing.code, 'approval_required');
  const self = evaluateExternalMarketingAction(request({
    action: 'approval',
    approval: { ...approval, approverUserId: 'seller@vintora.local' },
  }));
  assert.equal(self.code, 'self_approval_denied');
  const approved = evaluateExternalMarketingAction(request({
    action: 'approval',
    approval,
    budget: { ownerUserId: 'finance@vintora.local', limitUsd: 0, requestedUsd: 0 },
  }));
  assert.equal(approved.code, 'legal_approval_required');
});

test('preview, budget owner and legal approval gate regulated claims', () => {
  const noPreview = evaluateExternalMarketingAction(request({
    action: 'approval',
    approval,
    preview: null,
    budget: { ownerUserId: 'finance@vintora.local', limitUsd: 0, requestedUsd: 0 },
  }));
  assert.equal(noPreview.code, 'preview_required');
  const noBudget = evaluateExternalMarketingAction(request({ action: 'approval', approval }));
  assert.equal(noBudget.code, 'budget_owner_required');
  const approved = evaluateExternalMarketingAction(request({
    action: 'approval',
    approval,
    budget: { ownerUserId: 'finance@vintora.local', limitUsd: 0, requestedUsd: 0 },
    legalApproval: {
      reviewer: 'counsel@vintora.local',
      jurisdiction: 'GB',
      claimSetHash: 'sha256:claims',
      approvedAt: new Date().toISOString(),
    },
  }));
  assert.equal(approved.code, 'allowed_sandbox_draft');
});

test('emergency kill switch records a reason and raises an alert', () => {
  const missing = evaluateExternalMarketingAction(request({ action: 'kill_switch' }));
  assert.equal(missing.code, 'kill_switch_reason_required');
  const killed = evaluateExternalMarketingAction(request({
    action: 'kill_switch',
    killSwitch: { activated: true, reason: 'Suspected mis-targeted sandbox audience', scope: 'sandbox_campaign' },
  }));
  assert.equal(killed.code, 'allowed_kill_switch');
  assert.equal(killed.requiresAlert, true);
  for (const field of EXTERNAL_MARKETING_AUDIT_FIELDS) assert.ok(field.length > 0);
});
