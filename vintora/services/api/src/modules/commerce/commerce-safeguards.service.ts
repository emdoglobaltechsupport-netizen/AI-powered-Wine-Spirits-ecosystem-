import { createHash } from 'node:crypto';
import {
  COMMERCE_REQUIRED_CONTROLS,
  evaluateCommerceSafeguards,
  type CommerceSafeguardDecisionInput,
  type CommerceSafeguardsOutcome,
} from '@vintora/shared';
import { forbidden } from '../../lib/errors.js';
import { recordSafeguardDecisions } from './commerce-safeguards.repo.js';
import { paymentAdapterFor } from './payment-adapter.js';

export interface SafeguardSubject {
  readonly tenantId: string;
  readonly userId: string;
  readonly jurisdiction: string;
  readonly ageVerified: boolean;
  readonly ageVerifiedAt: Date | null;
}

function opaqueHash(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 16);
}

/**
 * Deterministic local adapter. Evidence references are opaque and labelled
 * simulated; no real provider, sanctions list or PSP is contacted.
 */
export function buildPrototypeSafeguardDecisions(
  subject: SafeguardSubject,
  correlationId: string,
  now = new Date(),
): CommerceSafeguardDecisionInput[] {
  const evaluatedAt = now.toISOString();
  const payment = paymentAdapterFor().authorize({
    tenantId: subject.tenantId,
    userId: subject.userId,
    correlationId,
    jurisdiction: subject.jurisdiction,
    evaluatedAt: now,
  });

  return COMMERCE_REQUIRED_CONTROLS.map((id) => {
    if (id === 'payment') {
      return {
        id,
        result: payment.result,
        evidenceRef: payment.evidenceRef,
        evaluatedAt: payment.evaluatedAt,
      };
    }
    let result = 'simulated_clear';
    if (id === 'age' && (!subject.ageVerified || !subject.ageVerifiedAt)) result = 'denied';
    return {
      id,
      result,
      evidenceRef: `simulated:${id}:${opaqueHash(`${subject.tenantId}:${subject.userId}:${id}`)}`,
      evaluatedAt,
    };
  });
}

export async function evaluateCheckoutSafeguards(
  subject: SafeguardSubject,
  correlationId: string,
): Promise<CommerceSafeguardsOutcome> {
  const now = new Date();
  const outcome = evaluateCommerceSafeguards({
    tenantId: subject.tenantId,
    userId: subject.userId,
    jurisdiction: subject.jurisdiction,
    ageEvidenceAt: subject.ageVerifiedAt,
    decisions: buildPrototypeSafeguardDecisions(subject, correlationId, now),
    now,
  });

  await recordSafeguardDecisions({
    tenantId: subject.tenantId,
    userId: subject.userId,
    correlationId,
    outcome,
  });

  if (!outcome.allowed) {
    throw forbidden('Checkout safeguards denied', {
      reasonCode: outcome.reasonCode,
      reasons: outcome.reasons,
      prototypeMode: true,
    });
  }
  return outcome;
}
