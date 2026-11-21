import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AI_ACTION_TIERS,
  AI_PROVENANCE_FIELDS,
  RESPONSIBLE_DRINKING_NOTICE,
  evaluateAiAction,
  validateAiResponse,
  type AIProvenance,
} from './ai-safety.js';

const provenance: AIProvenance = {
  promptId: 'test-prompt',
  promptVersion: '1.0.0',
  modelKey: 'deterministic',
  modelVersion: 'v1',
  retrievalSourceIds: ['source-1'],
  factPacketHash: 'sha256:test',
  approvalId: null,
};

test('four-tier taxonomy is explicit', () => {
  assert.deepEqual([...AI_ACTION_TIERS], ['read_only', 'recommendation', 'draft', 'execution']);
  assert.equal(AI_PROVENANCE_FIELDS.length, 7);
});

test('AI execution and external effects are always denied', () => {
  assert.equal(evaluateAiAction({ surface: 'sommelier', actionTier: 'execution' }).code, 'execution_disabled');
  assert.equal(evaluateAiAction({ surface: 'studio', actionTier: 'draft', externalEffect: true }).code, 'external_effect_disabled');
});

test('surfaces may only use their registered tier', () => {
  assert.equal(evaluateAiAction({ surface: 'sommelier', actionTier: 'recommendation' }).allowed, true);
  assert.equal(evaluateAiAction({ surface: 'studio', actionTier: 'recommendation' }).code, 'tier_mismatch');
  assert.equal(evaluateAiAction({ surface: 'marketing', actionTier: 'draft' }).allowed, true);
});

test('human approval must be distinct, reasoned and unexpired', () => {
  const base = { surface: 'pricing' as const, actionTier: 'recommendation' as const };
  assert.equal(evaluateAiAction({ ...base, humanApproval: { approverUserId: 'u1', actorUserId: 'u1', reason: 'valid reason' } }).code, 'distinct_approver_required');
  assert.equal(evaluateAiAction({ ...base, humanApproval: { approverUserId: 'u2', actorUserId: 'u1', reason: 'short' } }).code, 'approval_reason_required');
  assert.equal(evaluateAiAction({ ...base, humanApproval: { approverUserId: 'u2', actorUserId: 'u1', reason: 'valid reason', expiresAt: '2020-01-01' } }).code, 'approval_expired');
});

test('grounded, cited responsible responses are allowed', () => {
  const decision = validateAiResponse({
    surface: 'sommelier',
    text: 'Try the Riesling with spicy food.',
    citations: ['tasting panel'],
    safetyNote: RESPONSIBLE_DRINKING_NOTICE,
    provenance,
  });
  assert.equal(decision.allowed, true);
});

test('citation, safety notice and provenance omissions fail closed', () => {
  const base = {
    surface: 'sommelier' as const,
    text: 'Try this wine.',
    citations: ['tasting panel'],
    safetyNote: RESPONSIBLE_DRINKING_NOTICE,
    provenance,
  };
  assert.equal(validateAiResponse({ ...base, citations: [] }).code, 'missing_citation');
  assert.equal(validateAiResponse({ ...base, safetyNote: null }).code, 'missing_safety_notice');
  assert.equal(
    validateAiResponse({ ...base, provenance: { ...provenance, retrievalSourceIds: [] } }).code,
    'missing_provenance',
  );
});

test('prohibited health, intoxication and return claims are refused', () => {
  for (const text of ['This improves your health.', 'A guaranteed return.', 'Drink until you are drunk.']) {
    const decision = validateAiResponse({
      surface: 'sommelier',
      text,
      citations: ['tasting panel'],
      safetyNote: RESPONSIBLE_DRINKING_NOTICE,
      provenance,
    });
    assert.equal(decision.code, 'prohibited_recommendation');
  }
});
