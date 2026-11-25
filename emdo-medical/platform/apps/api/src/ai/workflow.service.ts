import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { AI_LABELS } from '@emdo/shared';
import { DatabaseService } from '../database/database.service';
import { RequestContext } from '../common/auth/request-context';
import { getAgent } from './agent-registry';
import { AiAuditService } from './ai-audit.service';
import { AiPermissionService } from './permission.service';
import { resolvePrompt } from './prompt-registry';
import { CreateAiWorkflowDto, DecideAiApprovalDto } from './dto/ai.dto';

interface ApprovalRow {
  id: string;
  country_code: string;
  entity_type: string;
  entity_id: string;
  action: string;
  decision: 'pending' | 'approved' | 'rejected';
  consumed_at: Date | null;
  requested_by: string;
  reason: string;
}

const FRESH_AUTH_WINDOW_SECONDS = 15 * 60;
const MODEL = 'emdo-offline-policy-gateway';
const MODEL_VERSION = '0.1.0';

/** Human approval workflows. No approved action executes autonomously. */
@Injectable()
export class AiWorkflowService {
  constructor(
    private readonly db: DatabaseService,
    private readonly permissions: AiPermissionService,
    private readonly audit: AiAuditService,
  ) {}

  async create(ctx: RequestContext, dto: CreateAiWorkflowDto): Promise<{ approvalId: string; status: string; executed: false }> {
    this.assertFreshAuth(ctx);
    const agent = getAgent(dto.agentId);
    this.permissions.authorise(agent, dto.capability, ctx, dto.patientId);
    resolvePrompt(dto.agentId, dto.capability, dto.language ?? 'en');

    if (dto.action !== 'AI_DRAFT_REVIEW' || dto.capability !== 'draft_documentation_outline') {
      throw new Error('AI_WORKFLOW_NOT_AVAILABLE');
    }

    const approvalId = randomUUID();
    await this.db.query(
      `INSERT INTO approval_requests
         (id, country_code, entity_type, entity_id, action, target_status,
          reason, evidence_ref, requested_by, requested_role)
       VALUES ($1::uuid,$2::text,'ai_action',$3::uuid,$4::text,'approved',$5::text,NULL,$6::uuid,$7::text)`,
      [
        approvalId, ctx.countryCode, randomUUID(), dto.action,
        dto.reasonCode, ctx.userId, ctx.roles[0] ?? 'clinician',
      ],
      { isSystem: true },
    );

    await this.audit.event({
      tenantId: ctx.tenantId, actorId: ctx.userId, actorRole: ctx.roles[0] ?? 'clinician',
      action: 'AI_WORKFLOW_REQUESTED', objectType: 'approval', objectId: approvalId,
      purpose: 'human_approval', decision: 'applied',
      metadata: { agentId: dto.agentId, capability: dto.capability, approvalId, reasonCode: dto.reasonCode },
    });
    await this.audit.interaction({
      ctx, agentId: dto.agentId, capability: dto.capability,
      promptVersion: resolvePrompt(dto.agentId, dto.capability).version,
      model: MODEL, modelVersion: MODEL_VERSION,
      dataDomain: agent.dataDomain, outcome: 'approval_requested', decision: 'applied',
      label: agent.label, sourceCount: 0, approvalId,
    });

    return { approvalId, status: 'pending', executed: false };
  }

  async decide(
    ctx: RequestContext,
    approvalId: string,
    dto: DecideAiApprovalDto,
  ): Promise<{ approvalId: string; decision: string; executed: false; note: string }> {
    this.assertFreshAuth(ctx);
    if (!ctx.isPlatform && !ctx.roles.some((role) => role === 'clinician' || role === 'compliance_officer')) {
      throw new Error('AI_APPROVER_NOT_ALLOWED');
    }

    const result = await this.db.query<ApprovalRow>(
      `SELECT id, country_code, entity_type, entity_id, action, decision, consumed_at, requested_by, reason
         FROM approval_requests WHERE id = $1::uuid`,
      [approvalId],
      { isSystem: true },
    );
    const approval = result.rows[0];
    if (!approval || approval.entity_type !== 'ai_action') throw new Error('AI_APPROVAL_NOT_FOUND');
    if (approval.country_code !== ctx.countryCode) throw new Error('COUNTRY_MISMATCH');
    if (!['AI_DRAFT_REVIEW', 'AI_WORKFLOW_EXECUTION'].includes(approval.action)) {
      throw new Error('INVALID_AI_ACTION');
    }
    if (approval.decision !== 'pending' || approval.consumed_at) throw new Error('AI_APPROVAL_ALREADY_DECIDED');
    if (approval.requested_by === ctx.userId) throw new Error('APPROVAL_SAME_ACTOR_NOT_ALLOWED');

    await this.db.query(
      `UPDATE approval_requests
          SET decision = $2::text, approver_id = $3::uuid, approver_role = $4::text,
              decided_at = now(), consumed_at = now()
        WHERE id = $1::uuid AND decision = 'pending' AND consumed_at IS NULL`,
      [approvalId, dto.decision, ctx.userId, ctx.roles[0] ?? 'compliance_officer'],
      { isSystem: true },
    );

    await this.audit.event({
      tenantId: ctx.tenantId, actorId: ctx.userId, actorRole: ctx.roles[0] ?? 'compliance_officer',
      action: 'AI_APPROVAL_DECIDED', objectType: 'approval', objectId: approvalId,
      purpose: 'human_approval', decision: dto.decision === 'approved' ? 'applied' : 'rejected',
      metadata: { approvalId, reasonCode: dto.reasonCode, outcome: dto.decision },
    });
    await this.audit.interaction({
      ctx, agentId: 'doctor_documentation', capability: 'human_approval',
      promptVersion: 'n/a', model: MODEL, modelVersion: MODEL_VERSION,
      dataDomain: 'phi', outcome: 'answered',
      decision: dto.decision === 'approved' ? 'applied' : 'rejected',
      label: AI_LABELS.operational, sourceCount: 0, approvalId,
    });

    return {
      approvalId,
      decision: dto.decision,
      executed: false,
      note: 'HUMAN_APPROVAL_RECORDED_NO_AUTONOMOUS_ACTION',
    };
  }

  private assertFreshAuth(ctx: RequestContext): void {
    if (ctx.authTime + FRESH_AUTH_WINDOW_SECONDS < Math.floor(Date.now() / 1000)) {
      throw new Error('FRESH_AUTH_REQUIRED');
    }
  }
}
