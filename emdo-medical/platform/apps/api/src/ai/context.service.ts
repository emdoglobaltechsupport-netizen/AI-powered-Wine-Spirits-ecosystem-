import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { RequestContext } from '../common/auth/request-context';
import { ConsentService } from '../consent/consent.service';
import type { AgentDefinition } from './agent-registry';
import type { GatewayContext, AiSourceReference } from './model-gateway';
import { AiPermissionService } from './permission.service';

interface RecordMetaRow {
  id: string;
  tenant_id: string;
  resource_type: string;
  version: number;
  country_code?: string;
}

const EMPTY_CONTEXT: GatewayContext = { recordCount: 0, resourceTypes: [], sources: [] };

/**
 * Retrieves only record metadata and source references — never clinical
 * content — and only through the agent's declared data boundary.
 */
@Injectable()
export class AiContextService {
  constructor(
    private readonly db: DatabaseService,
    private readonly consents: ConsentService,
    private readonly permissions: AiPermissionService,
  ) {}

  async retrieve(
    ctx: RequestContext,
    agent: AgentDefinition,
    capability: string,
    patientId?: string,
    resourceType?: string,
  ): Promise<GatewayContext> {
    this.permissions.assertContextAllowed(agent, capability);
    if (capability === 'explain_authorised_record') {
      return this.ownRecords(ctx, agent, patientId as string, resourceType);
    }
    if (capability === 'draft_documentation_outline') {
      return this.consentedRecords(ctx, agent, patientId as string, resourceType);
    }
    return EMPTY_CONTEXT;
  }

  private async ownRecords(
    ctx: RequestContext,
    agent: AgentDefinition,
    patientId: string,
    resourceType?: string,
  ): Promise<GatewayContext> {
    const limit = Math.min(agent.maxContextRecords, 20);
    const result = await this.db.query<RecordMetaRow>(
      `SELECT id, tenant_id, resource_type, version
         FROM clinical_records
        WHERE patient_id = $1::uuid AND tenant_id = $2::uuid AND is_current = true
          AND ($3::text IS NULL OR resource_type = $3)
        ORDER BY created_at DESC LIMIT $4::int`,
      [patientId, ctx.tenantId, resourceType ?? null, limit],
      { tenantId: ctx.tenantId, userId: ctx.userId, countryCode: ctx.countryCode },
    );
    return this.toContext(result.rows);
  }

  private async consentedRecords(
    ctx: RequestContext,
    agent: AgentDefinition,
    patientId: string,
    resourceType?: string,
  ): Promise<GatewayContext> {
    const limit = Math.min(agent.maxContextRecords, 20);
    const result = await this.db.query<RecordMetaRow>(
      `SELECT cr.id, cr.tenant_id, cr.resource_type, cr.version, u.country_code
         FROM clinical_records cr
         JOIN users u ON u.id = cr.patient_id
        WHERE cr.patient_id = $1::uuid AND cr.is_current = true
          AND ($2::text IS NULL OR cr.resource_type = $2)
        ORDER BY cr.created_at DESC LIMIT $3::int`,
      [patientId, resourceType ?? null, limit],
      { isSystem: true },
    );

    const allowed: RecordMetaRow[] = [];
    for (const row of result.rows) {
      if (row.country_code !== ctx.countryCode) throw new Error('COUNTRY_MISMATCH');
      if (await this.consents.hasActiveGrant(row.tenant_id, ctx.userId, row.resource_type)) {
        allowed.push(row);
      }
    }
    if (result.rows.length > 0 && allowed.length === 0) throw new Error('AI_CONSENT_REQUIRED');
    return this.toContext(allowed);
  }

  private toContext(rows: readonly RecordMetaRow[]): GatewayContext {
    const sources: AiSourceReference[] = rows.map((row) => ({
      kind: 'clinical_record',
      id: row.id,
      version: row.version,
      resourceType: row.resource_type,
    }));
    return {
      recordCount: sources.length,
      resourceTypes: [...new Set(sources.map((source) => source.resourceType))],
      sources,
    };
  }
}
