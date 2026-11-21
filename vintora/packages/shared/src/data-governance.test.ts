import assert from 'node:assert/strict';
import test from 'node:test';
import {
  evaluateDataGovernanceUse,
  DATA_GOVERNANCE_AUDIT_FIELDS,
  DATA_LIFECYCLE,
  type DataGovernanceRequest,
} from './data-governance.js';
import { PRIVACY_POLICY_VERSION, type ConsentMap } from './privacy-controls.js';

function consent(): ConsentMap {
  return {
    recommendations: {
      purpose: 'recommendations',
      state: 'opt_in',
      policyVersion: PRIVACY_POLICY_VERSION,
      recordedAt: new Date().toISOString(),
    },
  };
}

function request(overrides: Partial<DataGovernanceRequest> = {}): DataGovernanceRequest {
  return {
    correlationId: 'dg-test-001',
    tenantId: 'tenant-a',
    actorUserId: 'user-a',
    purpose: 'recommendations',
    dataCategory: 'taste_profile',
    lawfulBasis: 'consent',
    consents: consent(),
    noticeVersion: PRIVACY_POLICY_VERSION,
    ...overrides,
  };
}

test('registered lawful basis and consent permit advisory use', () => {
  const result = evaluateDataGovernanceUse(request());
  assert.equal(result.code, 'allowed_advisory');
  assert.equal(result.allowed, true);
  assert.equal(result.advisoryOnly, true);
  assert.equal(result.audit.action, 'data_governance_use');
});

test('cross-border transfer and cross-domain joins fail closed', () => {
  const transfer = evaluateDataGovernanceUse(request({
    crossBorder: { targetRegion: 'US', mechanism: 'SCC', transferImpactAssessmentRef: 'tia-1' },
  }));
  assert.equal(transfer.code, 'cross_border_transfer_disabled');
  const join = evaluateDataGovernanceUse(request({
    purpose: 'marketing',
    dataCategory: 'marketing_audience',
    lawfulBasis: 'consent',
    consents: { marketing: consent().recommendations! },
    crossDomainJoin: true,
  }));
  assert.equal(join.code, 'cross_domain_join_denied');
});

test('identity domain and lawful-basis mismatches are denied', () => {
  const domain = evaluateDataGovernanceUse(request({ identityDomain: 'regulated' }));
  assert.equal(domain.code, 'identity_domain_mismatch');
  const basis = evaluateDataGovernanceUse(request({ lawfulBasis: 'legitimate_interests' }));
  assert.equal(basis.code, 'lawful_basis_mismatch');
});

test('internal audit purposes and missing consent remain blocked', () => {
  const audit = evaluateDataGovernanceUse(request({
    purpose: 'ai_safety_audit',
    dataCategory: 'ai_interaction_log',
    lawfulBasis: 'legitimate_interests',
  }));
  assert.equal(audit.code, 'internal_purpose_blocked');
  const noConsent = evaluateDataGovernanceUse(request({ consents: {} }));
  assert.equal(noConsent.code, 'consent_denied');
  assert.equal(DATA_LIFECYCLE.enforced, false);
  for (const field of DATA_GOVERNANCE_AUDIT_FIELDS) assert.ok(field.length > 0);
});
