import {
  AGENT_AUDIT_FIELDS,
  AGENT_EXECUTION_ENABLED,
  AGENT_TOOL_REGISTRY,
  DENIED_AGENT_TOOLS,
  type AgentToolDecision,
} from '@vintora/shared';
import { TENANT_ID, tenantQuery, withTenant } from '../../db/tenant.js';

export { TENANT_ID };

interface KillSwitchRow {
  engaged: boolean;
  reason: string;
  slo_seconds: number;
  updated_at: Date;
}

export async function controls() {
  const rows = await tenantQuery<KillSwitchRow>(
    'SELECT engaged, reason, slo_seconds, updated_at FROM agent_kill_switch WHERE tenant_id = $1',
    [TENANT_ID],
  );
  const state = rows[0];
  return {
    workspace: 'ADM-19',
    defaultMode: 'advisory',
    executionEnabled: AGENT_EXECUTION_ENABLED,
    autonomousModeAllowed: false,
    killSwitch: {
      independent: true,
      engaged: state?.engaged ?? true,
      reason: state?.reason ?? 'Prototype default: agent execution disabled',
      sloSeconds: state?.slo_seconds ?? 60,
      drillCompleted: false,
      resetAllowed: false,
      updatedAt: state?.updated_at ?? null,
    },
    toolAllowlist: AGENT_TOOL_REGISTRY,
    deniedTools: DENIED_AGENT_TOOLS,
    auditFields: AGENT_AUDIT_FIELDS,
    note: 'Advisory evaluation only. No live agent worker, external tool or autonomous execution exists.',
  };
}

export async function audit(limit = 100) {
  return tenantQuery(
    `SELECT id, correlation_id, request_id, actor_user_id, agent_id, tool_id, intent,
            mode, tier, decision, reason_code, reason, decision_json, occurred_at
     FROM agent_decision_audit WHERE tenant_id = $1
     ORDER BY occurred_at DESC, id DESC LIMIT $2`,
    [TENANT_ID, Math.min(Math.max(limit, 1), 200)],
  );
}

export async function recordDecision(
  decision: AgentToolDecision,
  actorUserId: string,
  requestId: string | undefined,
): Promise<void> {
  const field = (name: string): string => String(decision.audit[name] ?? '');
  await tenantQuery(
    `INSERT INTO agent_decision_audit
       (tenant_id, correlation_id, request_id, actor_user_id, agent_id, tool_id,
        intent, mode, tier, decision, reason_code, reason, decision_json, occurred_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
    [
      TENANT_ID,
      field('correlationId'),
      requestId ?? null,
      actorUserId,
      field('agentId'),
      field('toolId'),
      field('intent'),
      field('mode'),
      decision.toolTier ?? null,
      field('decision'),
      field('reasonCode'),
      field('reason'),
      JSON.stringify(decision.audit),
      field('occurredAt') || new Date().toISOString(),
    ],
    TENANT_ID,
    actorUserId,
  );
}

const APPROVER_EMAILS: Readonly<Record<string, string>> = Object.freeze({
  ai_ops: 'ai_ops@vintora.local',
  auditor: 'auditor@vintora.local',
});

/** Human-only safe stop. The storage trigger rejects any reset/disengage. */
export async function engageKillSwitch(input: {
  correlationId: string;
  reason: string;
  approverCode: string;
  actorUserId: string;
  requestId: string | undefined;
}) {
  const approverEmail = APPROVER_EMAILS[input.approverCode];
  if (!approverEmail) throw new Error('Unknown kill-switch approver');
  return withTenant(async (client) => {
    const approverRows = await client.query<{ id: string }>(
      'SELECT id FROM users WHERE email = $1 AND status = $2', [approverEmail, 'active'],
    );
    const approverId = approverRows.rows[0]?.id;
    if (!approverId) throw new Error('Kill-switch approver account is not available');
    if (approverId === input.actorUserId) throw new Error('Requester cannot approve their own kill-switch action');

    const updated = await client.query<KillSwitchRow>(
      `UPDATE agent_kill_switch
       SET engaged = true, reason = $1, actor_user_id = $2, approver_user_id = $3, updated_at = now()
       WHERE tenant_id = $4 AND engaged = true RETURNING engaged, reason, slo_seconds, updated_at`,
      [input.reason, input.actorUserId, approverId, TENANT_ID],
    );
    const occurredAt = new Date().toISOString();
    await client.query(
      `INSERT INTO agent_decision_audit
         (tenant_id, correlation_id, request_id, actor_user_id, agent_id, tool_id,
          intent, mode, tier, decision, reason_code, reason, decision_json, occurred_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      [
        TENANT_ID, input.correlationId, input.requestId ?? null, input.actorUserId,
        'ADM-19', 'agent.kill-switch', 'execute', 'advisory', 'T4', 'denied',
        'agent_kill_switch_engaged', `${input.reason} · approver ${input.approverCode}`,
        JSON.stringify({
          correlationId: input.correlationId,
          tenantId: TENANT_ID,
          actorUserId: input.actorUserId,
          agentId: 'ADM-19',
          toolId: 'agent.kill-switch',
          intent: 'execute',
          mode: 'advisory',
          tier: 'T4',
          decision: 'denied',
          reasonCode: 'agent_kill_switch_engaged',
          reason: `${input.reason} · approver ${input.approverCode}`,
          occurredAt,
        }),
        occurredAt,
      ],
    );
    return updated.rows[0] ?? { engaged: true, reason: input.reason, slo_seconds: 60, updated_at: new Date() };
  }, TENANT_ID, input.actorUserId);
}
