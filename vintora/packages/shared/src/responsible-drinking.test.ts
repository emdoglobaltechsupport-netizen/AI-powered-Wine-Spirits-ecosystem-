import assert from 'node:assert/strict';
import test from 'node:test';
import {
  detectHarmSignals,
  evaluateResponsibleDrinking,
  MAX_BOTTLES_24H,
  RESPONSIBLE_DRINKING_SUPPORT_NOTICE,
  type ResponsibleDrinkingRequest,
} from './responsible-drinking.js';

function request(overrides: Partial<ResponsibleDrinkingRequest> = {}): ResponsibleDrinkingRequest {
  return {
    correlationId: 'rd-test-001',
    surface: 'recommendation',
    ageGateState: 'checkout_only',
    suggestionCount: 2,
    supportNotice: RESPONSIBLE_DRINKING_SUPPORT_NOTICE,
    ...overrides,
  };
}

test('normal recommendation stays within limits and carries a support notice', () => {
  const result = evaluateResponsibleDrinking(request());
  assert.equal(result.code, 'allowed_with_support_notice');
  assert.equal(result.supportNotice, RESPONSIBLE_DRINKING_SUPPORT_NOTICE);
  assert.equal(result.advisoryOnly, true);
});

test('harmful-use language and protected audiences are blocked', () => {
  const signal = evaluateResponsibleDrinking(request({ harmSignals: ['binge'] }));
  assert.equal(signal.code, 'harmful_use_signal');
  assert.equal(signal.requiresHumanReview, true);
  assert.deepEqual(detectHarmSignals('help me get drunk tonight'), ['get drunk']);
  const segment = evaluateResponsibleDrinking(request({
    surface: 'marketing',
    audienceSegments: ['self_excluded'],
  }));
  assert.equal(segment.code, 'minor_targeting_denied');
});

test('recommendation, purchase and frequency caps are enforced', () => {
  const suggestions = evaluateResponsibleDrinking(request({ suggestionCount: 4 }));
  assert.equal(suggestions.code, 'recommendation_limit_exceeded');
  const purchase = evaluateResponsibleDrinking(request({
    surface: 'checkout', quantity: 4, priorBottles24h: MAX_BOTTLES_24H - 2,
  }));
  assert.equal(purchase.code, 'purchase_limit_exceeded');
  const frequency = evaluateResponsibleDrinking(request({ promoEmailsThisWeek: 4 }));
  assert.equal(frequency.code, 'frequency_limit_exceeded');
});

test('age evidence expiry and unknown gate state fail closed', () => {
  const unknown = evaluateResponsibleDrinking(request({ ageGateState: 'unknown' }));
  assert.equal(unknown.code, 'age_gate_required');
  const expired = evaluateResponsibleDrinking(request({ ageEvidenceHours: 721 }));
  assert.equal(expired.code, 'age_evidence_expired');
  const trigger = evaluateResponsibleDrinking(request({ reverificationTrigger: 'country_changed' }));
  assert.equal(trigger.code, 'age_evidence_expired');
  const noNotice = evaluateResponsibleDrinking(request({ supportNotice: null }));
  assert.equal(noNotice.code, 'support_notice_required');
});
