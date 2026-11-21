import assert from 'node:assert/strict';
import test from 'node:test';
import {
  evaluatePersonalDataUse,
  PRIVACY_AUDIT_FIELDS,
  PRIVACY_POLICY_VERSION,
  PRIVACY_PURPOSES,
  type ConsentMap,
  type PersonalDataUseRequest,
} from './privacy-controls.js';

function request(overrides: Partial<PersonalDataUseRequest> = {}): PersonalDataUseRequest {
  return {
    correlationId: 'privacy-test-001',
    tenantId: 'tenant-a',
    actorUserId: 'user-a',
    purpose: 'recommendations',
    dataCategory: 'taste_profile',
    consents: {},
    noticeVersion: PRIVACY_POLICY_VERSION,
    ...overrides,
  };
}

function consent(state: 'opt_in' | 'withdraw' = 'opt_in'): ConsentMap {
  return {
    recommendations: {
      purpose: 'recommendations',
      state,
      policyVersion: PRIVACY_POLICY_VERSION,
      recordedAt: new Date().toISOString(),
      locale: 'en',
    },
  };
}

test('optional personalization is off until explicit versioned opt-in', () => {
  const denied = evaluatePersonalDataUse(request());
  assert.equal(denied.allowed, false);
  assert.equal(denied.code, 'consent_required');
  const allowed = evaluatePersonalDataUse(request({ consents: consent() }));
  assert.equal(allowed.allowed, true);
  assert.equal(allowed.code, 'allowed');
  assert.equal(allowed.advisoryOnly, true);
  assert.equal(allowed.audit.purpose, 'recommendations');
});

test('purpose separation prevents cross-purpose data reuse', () => {
  const result = evaluatePersonalDataUse(request({
    consents: consent(),
    dataCategory: 'purchase_history',
  }));
  assert.equal(result.allowed, false);
  assert.equal(result.code, 'purpose_not_allowed');
  const marketing = evaluatePersonalDataUse(request({
    purpose: 'marketing',
    dataCategory: 'taste_profile',
    consents: { marketing: consent().recommendations! },
  }));
  assert.equal(marketing.code, 'purpose_not_allowed');
  assert.equal(PRIVACY_PURPOSES.length, 4);
});

test('sensitive and health-adjacent data is never used for profiling', () => {
  for (const dataCategory of ['health_adjacent', 'precise_location', 'biometric', 'age_documents', 'consumption_events'] as const) {
    const result = evaluatePersonalDataUse(request({ dataCategory, consents: consent() }));
    assert.equal(result.allowed, false);
    assert.equal(result.code, 'sensitive_data_denied');
  }
});

test('withdrawal and stale notices stop processing immediately', () => {
  const withdrawn = evaluatePersonalDataUse(request({ consents: consent('withdraw') }));
  assert.equal(withdrawn.code, 'consent_withdrawn');
  const staleConsent = evaluatePersonalDataUse(request({
    consents: {
      recommendations: { ...consent().recommendations!, policyVersion: 'v0' },
    },
  }));
  assert.equal(staleConsent.code, 'consent_version_mismatch');
  const staleNotice = evaluatePersonalDataUse(request({ consents: consent(), noticeVersion: 'v0' }));
  assert.equal(staleNotice.code, 'consent_version_mismatch');
});

test('closed-loop profiling is disabled even with consent and test evidence', () => {
  const result = evaluatePersonalDataUse(request({
    purpose: 'closed_loop_personalization',
    dataCategory: 'purchase_history',
    consents: {
      closed_loop_personalization: {
        purpose: 'closed_loop_personalization',
        state: 'opt_in',
        policyVersion: PRIVACY_POLICY_VERSION,
        recordedAt: new Date().toISOString(),
      },
    },
  }));
  assert.equal(result.allowed, false);
  assert.equal(result.code, 'closed_loop_disabled');
});

test('retention expiry and missing context fail closed', () => {
  const expired = evaluatePersonalDataUse(request({
    consents: consent(),
    collectedAt: new Date(Date.now() - 91 * 86_400_000).toISOString(),
  }));
  assert.equal(expired.code, 'retention_expired');
  const missing = evaluatePersonalDataUse(request({ tenantId: '', consents: consent() }));
  assert.equal(missing.code, 'missing_context');
  for (const field of PRIVACY_AUDIT_FIELDS) assert.ok(field.length > 0);
});
