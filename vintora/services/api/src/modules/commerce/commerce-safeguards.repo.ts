import type { CommerceSafeguardsOutcome } from '@vintora/shared';
import { withTenant } from '../../db/tenant.js';

/** Append-only evidence for each simulated safeguard decision at checkout. */
export async function recordSafeguardDecisions(input: {
  tenantId: string;
  userId: string;
  correlationId: string;
  outcome: CommerceSafeguardsOutcome;
}): Promise<void> {
  await withTenant(async (client) => {
    for (const decision of input.outcome.decisions) {
      await client.query(
        `INSERT INTO commerce_safeguard_decisions
           (tenant_id, user_id, correlation_id, control_id, result, evidence_ref,
            decision, reason_code, reason, decision_json, occurred_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11::timestamptz)`,
        [
          input.tenantId,
          input.userId,
          input.correlationId,
          decision.id,
          decision.result,
          decision.evidenceRef,
          input.outcome.allowed ? 'allowed' : 'denied',
          input.outcome.reasonCode,
          input.outcome.reasons.join('; '),
          JSON.stringify({
            accepted: decision.accepted,
            controlReasonCode: decision.reasonCode ?? null,
            prototypeMode: true,
          }),
          input.outcome.evaluatedAt,
        ],
      );
    }
  }, input.tenantId, input.userId);
}
