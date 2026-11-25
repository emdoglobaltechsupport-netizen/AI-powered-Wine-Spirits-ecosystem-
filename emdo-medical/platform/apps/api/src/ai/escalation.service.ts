import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { AI_LABELS } from '@emdo/shared';
import { DatabaseService } from '../database/database.service';
import { RequestContext } from '../common/auth/request-context';
import { getAgent } from './agent-registry';
import { AiAuditService } from './ai-audit.service';
import { AiPermissionService } from './permission.service';
import { CreateEscalationDto, ResolveEscalationDto } from './dto/ai.dto';

export interface EscalationRow {
  id: string;
  tenant_id: string;
  country_code: string;
  created_by: string;
  agent_id: string;
  reason_code: string;
  assigned_role: string;
  status: 'open' | 'in_progress' | 'resolved';
}

const MODEL = 'emdo-offline-policy-gateway';
const MODEL_VERSION = '0.1.0';

/** Explicit handoff to a named human role. No AI decision is final. */
@Injectable()
export class AiEscalationService {
  constructor(
    private readonly db: DatabaseService,
    private readonly permissions: AiPermissionService,
    private readonly audit: AiAuditService,
  ) {}

  async create(ctx: RequestContext, dto: CreateEscalationDto): Promise<{ id: string; status: string; assignedRole: string }> {
    const agent = getAgent(dto.agentId);
    this.permissions.authorise(agent, 'escalate_to_human', ctx);

    const id = randomUUID();
    await this.db.query(
      `INSERT INTO ai_escalations
         (id, tenant_id, country_code, created_by, agent_id, reason_code, assigned_role)
       VALUES ($1::uuid,$2::uuid,$3::text,$4::uuid,$5::text,$6::text,$7::text)`,
      [
        id, ctx.tenantId, ctx.countryCode, ctx.userId,
        dto.agentId, dto.reasonCode, dto.assignedRole,
      ],
      { isSystem: true },
    );

    await this.audit.event({
      tenantId: ctx.tenantId, actorId: ctx.userId, actorRole: ctx.roles[0] ?? 'patient',
      action: 'AI_ESCALATION_CREATED', objectType: 'escalation', objectId: id,
      purpose: 'human_handoff', decision: 'applied',
      metadata: { agentId: dto.agentId, reasonCode: dto.reasonCode, assignedRole: dto.assignedRole },
    });
    await this.audit.interaction({
      ctx, agentId: dto.agentId, capability: 'escalate_to_human',
      promptVersion: 'n/a', model: MODEL, modelVersion: MODEL_VERSION,
      dataDomain: agent.dataDomain, outcome: 'escalated', decision: 'applied',
      label: agent.label, sourceCount: 0, escalationId: id,
    });

    return { id, status: 'open', assignedRole: dto.assignedRole };
  }

  async list(ctx: RequestContext): Promise<EscalationRow[]> {
    const result = await this.db.query<EscalationRow>(
      `SELECT id, tenant_id, country_code, created_by, agent_id, reason_code, assigned_role, status
         FROM ai_escalations
        WHERE country_code = $1::text
          AND ($2::uuid IS NULL OR tenant_id = $2::uuid OR created_by = $3::uuid
               OR assigned_role = ANY($4::text[]))
        ORDER BY created_at DESC LIMIT 200`,
      [
        ctx.countryCode,
        ctx.isPlatform ? null : ctx.tenantId,
        ctx.userId,
        ctx.roles,
      ],
      { isSystem: true },
    );
    return result.rows;
  }

  async resolve(ctx: RequestContext, id: string, dto: ResolveEscalationDto): Promise<{ id: string; status: string }> {
    const result = await this.db.query<EscalationRow>(
      `SELECT id, tenant_id, country_code, created_by, agent_id, reason_code, assigned_role, status
         FROM ai_escalations WHERE id = $1::uuid`,
      [id],
      { isSystem: true },
    );
    const escalation = result.rows[0];
    if (!escalation) throw new Error('AI_ESCALATION_NOT_FOUND');
    if (escalation.country_code !== ctx.countryCode) throw new Error('COUNTRY_MISMATCH');
    if (!ctx.isPlatform && !ctx.roles.includes(escalation.assigned_role as never)) {
      throw new Error('AI_ESCALATION_NOT_OWNED');
    }
    if (escalation.status === 'resolved') throw new Error('AI_ESCALATION_ALREADY_RESOLVED');

    await this.db.query(
      `UPDATE ai_escalations
          SET status = 'resolved', outcome_code = $2::text, resolved_by = $3::uuid,
              resolved_at = now(), updated_at = now()
        WHERE id = $1::uuid`,
      [id, dto.outcomeCode, ctx.userId],
      { isSystem: true },
    );

    await this.audit.event({
      tenantId: ctx.tenantId, actorId: ctx.userId, actorRole: ctx.roles[0] ?? 'support',
      action: 'AI_ESCALATION_RESOLVED', objectType: 'escalation', objectId: id,
      purpose: 'human_handoff', decision: 'applied',
      metadata: { escalationId: id, outcome: dto.outcomeCode, reasonCode: escalation.reason_code },
    });
    await this.audit.interaction({
      ctx, agentId: escalation.agent_id, capability: 'escalate_to_human',
      promptVersion: 'n/a', model: MODEL, modelVersion: MODEL_VERSION,
      dataDomain: 'phi', outcome: 'answered', decision: 'applied',
      label: AI_LABELS.operational, sourceCount: 0, escalationId: id,
    });

    return { id, status: 'resolved' };
  }
}
