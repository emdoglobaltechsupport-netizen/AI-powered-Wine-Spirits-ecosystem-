import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { AuditService } from '../common/audit/audit.service';
import { RequestContext } from '../common/auth/request-context';
import { CreateConsentDto } from './dto/consent.dto';

export interface ConsentRow {
  id: string;
  patient_tenant_id: string;
  patient_user_id: string;
  grantee_user_id: string;
  purpose: string;
  scope: Record<string, unknown>;
  expires_at: Date;
  revoked_at: Date | null;
}

const MAX_GRANT_DAYS = 365;
const FRESH_AUTH_WINDOW_SECONDS = 15 * 60;

@Injectable()
export class ConsentService {
  constructor(
    private readonly db: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  async create(ctx: RequestContext, dto: CreateConsentDto): Promise<{ id: string; expiresAt: Date }> {
    if (ctx.authTime + FRESH_AUTH_WINDOW_SECONDS < Math.floor(Date.now() / 1000)) {
      throw new Error('FRESH_AUTH_REQUIRED');
    }
    if (dto.granteeUserId === ctx.userId) throw new Error('SELF_GRANT_NOT_ALLOWED');

    const grantee = await this.db.query<{ id: string }>(
      'SELECT id FROM users WHERE id = $1 AND status = $2',
      [dto.granteeUserId, 'active'],
      { isSystem: true },
    );
    if (!grantee.rowCount) throw new Error('GRANTEE_NOT_FOUND');

    const expiresAt = new Date(dto.expiresAt);
    const maxExpiry = new Date(Date.now() + MAX_GRANT_DAYS * 86400000);
    if (expiresAt.getTime() <= Date.now() || expiresAt.getTime() > maxExpiry.getTime()) {
      throw new Error('INVALID_GRANT_EXPIRY');
    }

    const id = randomUUID();
    const scope = { resourceTypes: dto.scope?.resourceTypes ?? [] };
    await this.db.query(
      `INSERT INTO consent_grants
         (id, patient_tenant_id, patient_user_id, grantee_user_id, purpose, scope, expires_at, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [id, ctx.tenantId, ctx.userId, dto.granteeUserId, dto.purpose, JSON.stringify(scope), expiresAt, ctx.userId],
      { tenantId: ctx.tenantId, userId: ctx.userId, countryCode: ctx.countryCode },
    );

    await this.audit.record({
      tenantId: ctx.tenantId, actorId: ctx.userId, actorRole: ctx.roles[0] ?? 'patient',
      action: 'CONSENT_GRANTED', objectType: 'consent', objectId: id, purpose: dto.purpose,
      decision: 'applied', metadata: { grantId: id, countryCode: ctx.countryCode },
    });
    return { id, expiresAt };
  }

  async list(ctx: RequestContext): Promise<ConsentRow[]> {
    const result = await this.db.query<ConsentRow>(
      `SELECT id, patient_tenant_id, patient_user_id, grantee_user_id, purpose, scope,
              expires_at, revoked_at
         FROM consent_grants
        WHERE patient_tenant_id = $1 OR grantee_user_id = $2
        ORDER BY created_at DESC LIMIT 200`,
      [ctx.tenantId, ctx.userId],
      { tenantId: ctx.tenantId, userId: ctx.userId, countryCode: ctx.countryCode },
    );
    return result.rows;
  }

  async revoke(ctx: RequestContext, id: string): Promise<void> {
    const result = await this.db.query<ConsentRow>(
      'SELECT id, patient_tenant_id FROM consent_grants WHERE id = $1 AND revoked_at IS NULL',
      [id],
      { isSystem: true },
    );
    const grant = result.rows[0];
    if (!grant) throw new Error('GRANT_NOT_FOUND');
    if (grant.patient_tenant_id !== ctx.tenantId && !ctx.isPlatform) throw new Error('FORBIDDEN');

    await this.db.query('UPDATE consent_grants SET revoked_at = now() WHERE id = $1', [id], { isSystem: true });
    await this.audit.record({
      tenantId: ctx.tenantId, actorId: ctx.userId, actorRole: ctx.roles[0] ?? 'patient',
      action: 'CONSENT_REVOKED', objectType: 'consent', objectId: id,
      decision: 'revoked', metadata: { grantId: id },
    });
  }

  /** Returns true only for an active, in-scope grant. Never grants by role alone. */
  async hasActiveGrant(
    patientTenantId: string,
    granteeUserId: string,
    resourceType: string,
  ): Promise<boolean> {
    const result = await this.db.query<{ scope: Record<string, unknown> }>(
      `SELECT scope FROM consent_grants
        WHERE patient_tenant_id = $1 AND grantee_user_id = $2
          AND revoked_at IS NULL AND expires_at > now()`,
      [patientTenantId, granteeUserId],
      { isSystem: true },
    );
    for (const row of result.rows) {
      const allowed = row.scope['resourceTypes'];
      if (!Array.isArray(allowed) || allowed.length === 0) return true;
      if (allowed.includes(resourceType)) return true;
    }
    return false;
  }
}
