import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  COMMERCE_MAX_AGE_EVIDENCE_HOURS,
  COMMERCE_MAX_EVIDENCE_AGE_MINUTES,
  COMMERCE_REQUIRED_CONTROLS,
  evaluateCommerceSafeguards,
  type CommerceSafeguardDecisionInput,
} from './commerce-safeguards.js';

const NOW = new Date('2026-11-20T12:00:00.000Z');

function simulatedDecisions(overrides: Partial<Record<string, Partial<CommerceSafeguardDecisionInput>>> = {}) {
  return COMMERCE_REQUIRED_CONTROLS.map((id) => {
    const override = overrides[id] ?? {};
    return {
      id,
      result: override.result ?? 'simulated_clear',
      evidenceRef: override.evidenceRef ?? `simulated:${id}:abc123`,
      evaluatedAt: override.evaluatedAt ?? NOW,
    };
  });
}

const base = {
  tenantId: '00000000-0000-0000-0000-000000000001',
  userId: '11111111-1111-4111-8111-111111111111',
  jurisdiction: 'US',
  ageEvidenceAt: NOW,
  now: NOW,
};

test('commerce safeguards fail closed when no decisions are supplied', () => {
  const outcome = evaluateCommerceSafeguards(base);
  assert.equal(outcome.allowed, false);
  assert.equal(outcome.reasonCode, 'missing_age');
});

test('commerce safeguards require tenant, user and jurisdiction context', () => {
  const outcome = evaluateCommerceSafeguards({ ...base, tenantId: null });
  assert.equal(outcome.allowed, false);
  assert.equal(outcome.reasonCode, 'missing_context');
});

test('commerce safeguards require verified age evidence with a timestamp', () => {
  const missing = evaluateCommerceSafeguards({ ...base, ageEvidenceAt: null, decisions: simulatedDecisions() });
  assert.equal(missing.allowed, false);
  assert.equal(missing.reasonCode, 'missing_age_evidence');
  const invalid = evaluateCommerceSafeguards({ ...base, ageEvidenceAt: 'not-a-date', decisions: simulatedDecisions() });
  assert.equal(invalid.reasonCode, 'invalid_age_evidence');
});

test('stale and future age evidence are denied', () => {
  const staleAt = new Date(NOW.getTime() - (COMMERCE_MAX_AGE_EVIDENCE_HOURS + 1) * 60 * 60_000);
  const stale = evaluateCommerceSafeguards({ ...base, ageEvidenceAt: staleAt, decisions: simulatedDecisions() });
  assert.equal(stale.allowed, false);
  assert.equal(stale.reasonCode, 'stale_age_evidence');
  const futureAt = new Date(NOW.getTime() + 60_000);
  const future = evaluateCommerceSafeguards({ ...base, ageEvidenceAt: futureAt, decisions: simulatedDecisions() });
  assert.equal(future.allowed, false);
  assert.equal(future.reasonCode, 'future_age_evidence');
});

test('fresh simulated-clear decisions pass only in prototype mode', () => {
  const outcome = evaluateCommerceSafeguards({ ...base, decisions: simulatedDecisions() });
  assert.equal(outcome.allowed, true);
  assert.equal(outcome.reasonCode, 'all_controls_clear');
  assert.equal(outcome.decisions.length, 5);
});

test('denied prototype jurisdiction stops the decision', () => {
  const outcome = evaluateCommerceSafeguards({
    ...base, jurisdiction: 'UNVERIFIED', decisions: simulatedDecisions(),
  });
  assert.equal(outcome.allowed, false);
  assert.equal(outcome.reasonCode, 'denied_jurisdiction');
});

test('sanctions and other non-clear results are denied', () => {
  const outcome = evaluateCommerceSafeguards({
    ...base,
    decisions: simulatedDecisions({ sanctions: { result: 'sanctions_hit' } }),
  });
  assert.equal(outcome.allowed, false);
  assert.equal(outcome.reasonCode, 'control_sanctions_hit');
});

test('evidence references must be simulated, opaque and control-specific', () => {
  const outcome = evaluateCommerceSafeguards({
    ...base,
    decisions: simulatedDecisions({ aml: { evidenceRef: 'real:aml:abc123' } }),
  });
  assert.equal(outcome.allowed, false);
  assert.equal(outcome.reasonCode, 'invalid_evidence');
});

test('stale evidence is denied', () => {
  const stale = new Date(NOW.getTime() - (COMMERCE_MAX_EVIDENCE_AGE_MINUTES + 1) * 60_000);
  const outcome = evaluateCommerceSafeguards({
    ...base,
    decisions: simulatedDecisions({ payment: { evaluatedAt: stale } }),
  });
  assert.equal(outcome.allowed, false);
  assert.equal(outcome.reasonCode, 'stale_evidence');
});

test('future-dated evidence is denied', () => {
  const future = new Date(NOW.getTime() + 60_000);
  const outcome = evaluateCommerceSafeguards({
    ...base,
    decisions: simulatedDecisions({ age: { evaluatedAt: future } }),
  });
  assert.equal(outcome.allowed, false);
  assert.equal(outcome.reasonCode, 'future_evidence');
});
