import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { AiDataDomain, AiLabel, AiOutcome } from '@emdo/shared';
import { DatabaseService } from '../database/database.service';
import { AuditService, type AuditEntry } from '../common/audit/audit.service';
import { RequestContext } from '../common/auth/request-context';

export interface RecordInteractionInput {
  ctx: RequestContext;
  agentId: string;
  capability: string;
  promptVersion: string;
  model: string;
  modelVersion: string;
  dataDomain: AiDataDomain;
  outcome: AiOutcome;
  decision: 'allowed' | 'denied' | 'applied' | 'rejected' | 'revoked';
  label: AiLabel;
  sourceCount: number;
  approvalId?: string | null;
  escalationId?: string | null;
}

/** Writes AI telemetry and PHI-safe audit events through one boundary. */
@Injectable()
export class AiAuditService {
  constructor(
    private readonly db: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  async interaction(input: RecordInteractionInput): Promise<string> {
    const id = randomUUID();
    await this.db.query(
      `INSERT INTO ai_interactions
         (id, tenant_id, country_code, actor_id, actor_role, agent_id, capability,
          prompt_version, model, model_version, data_domain, outcome, decision,
          label, source_count, approval_id, escalation_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
      [
        id, input.ctx.tenantId, input.ctx.countryCode, input.ctx.userId,
        input.ctx.roles[0] ?? 'patient', input.agentId, input.capability,
        input.promptVersion, input.model, input.modelVersion, input.dataDomain,
        input.outcome, input.decision, input.label, input.sourceCount,
        input.approvalId ?? null, input.escalationId ?? null,
      ],
      { isSystem: true },
    );

    await this.audit.record({
      tenantId: input.ctx.tenantId,
      actorId: input.ctx.userId,
      actorRole: input.ctx.roles[0] ?? 'patient',
      action: 'AI_INTERACTION',
      objectType: 'ai_agent',
      objectId: input.agentId,
      purpose: 'ai_assistance',
      decision: input.decision,
      metadata: {
        agentId: input.agentId,
        capability: input.capability,
        promptVersion: input.promptVersion,
        model: input.model,
        modelVersion: input.modelVersion,
        outcome: input.outcome,
        label: input.label,
        sourceCount: input.sourceCount,
        interactionId: id,
      },
    });
    return id;
  }

  async event(entry: AuditEntry): Promise<void> {
    await this.audit.record(entry);
  }
}
