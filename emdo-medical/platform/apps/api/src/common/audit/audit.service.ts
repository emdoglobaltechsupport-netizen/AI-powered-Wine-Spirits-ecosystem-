import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { sanitizeAuditMetadata } from './audit-sanitizer';

export interface AuditEntry {
  tenantId?: string;
  actorId?: string;
  actorRole?: string;
  action: string;
  objectType?: string;
  objectId?: string;
  purpose?: string;
  decision: 'allowed' | 'denied' | 'applied' | 'rejected' | 'revoked';
  metadata?: unknown;
}

@Injectable()
export class AuditService {
  constructor(private readonly db: DatabaseService) {}

  async record(entry: AuditEntry): Promise<void> {
    await this.db.query(
      `INSERT INTO audit_events
         (tenant_id, actor_id, actor_role, action, object_type, object_id, purpose, decision, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        entry.tenantId ?? null,
        entry.actorId ?? null,
        entry.actorRole ?? null,
        entry.action,
        entry.objectType ?? null,
        entry.objectId ?? null,
        entry.purpose ?? null,
        entry.decision,
        JSON.stringify(sanitizeAuditMetadata(entry.metadata ?? {})),
      ],
      { isSystem: true },
    );
  }

  async list(tenantId: string | undefined, limit: number, maxLimit: number): Promise<unknown[]> {
    const safeLimit = Math.min(Math.max(1, limit), maxLimit);
    const result = await this.db.query(
      `SELECT id, tenant_id, actor_id, action, object_type, object_id, purpose, decision, metadata, created_at
         FROM audit_events
        WHERE ($1::uuid IS NULL OR tenant_id = $1::uuid)
        ORDER BY created_at DESC LIMIT $2`,
      [tenantId ?? null, safeLimit],
      { isSystem: true },
    );
    return result.rows;
  }
}
