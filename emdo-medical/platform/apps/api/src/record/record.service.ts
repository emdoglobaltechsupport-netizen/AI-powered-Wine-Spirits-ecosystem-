import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { validateFhirResource, assertNoAutomatedSignature } from '@emdo/shared';
import { DatabaseService } from '../database/database.service';
import { CryptoService } from '../common/crypto/crypto.service';
import { AuditService } from '../common/audit/audit.service';
import { ConsentService } from '../consent/consent.service';
import { RequestContext } from '../common/auth/request-context';
import { CreateRecordDto, CorrectRecordDto } from './dto/record.dto';

export interface RecordRow {
  id: string;
  tenant_id: string;
  patient_id: string;
  resource_type: string;
  resource_id: string;
  version: number;
  ciphertext: Buffer;
  iv: Buffer;
  auth_tag: Buffer;
  integrity_hash: string;
  author_id: string;
  previous_id: string | null;
  is_current: boolean;
  created_at: Date;
}

const PERMITTED_ROLES = ['patient', 'caregiver'];

@Injectable()
export class RecordService {
  constructor(
    private readonly db: DatabaseService,
    private readonly crypto: CryptoService,
    private readonly audit: AuditService,
    private readonly consents: ConsentService,
  ) {}

  private assertRole(ctx: RequestContext): void {
    if (ctx.roles.includes('clinician') || ctx.roles.includes('pharmacist') || ctx.roles.includes('lab_professional')) {
      throw new Error('CLINICIAN_VERIFICATION_NOT_AVAILABLE');
    }
    if (!ctx.roles.some((role) => PERMITTED_ROLES.includes(role))) throw new Error('FORBIDDEN');
  }

  private validate(resource: Record<string, unknown>): void {
    const shape = validateFhirResource(resource);
    if (!shape.valid) throw new Error(`INVALID_FHIR_RESOURCE: ${shape.errors.join('; ')}`);
    const authorship = assertNoAutomatedSignature(resource);
    if (!authorship.valid) throw new Error(`INVALID_FHIR_RESOURCE: ${authorship.errors.join('; ')}`);
  }

  async create(ctx: RequestContext, dto: CreateRecordDto): Promise<{ id: string; version: number }> {
    this.assertRole(ctx);
    this.validate(dto.resource);
    const subject = dto.resource['subject'] as { reference: string };
    if (subject.reference !== `Patient/${ctx.userId}`) throw new Error('SUBJECT_MISMATCH');

    const id = randomUUID();
    const resourceId = String(dto.resource['id']);
    const serialised = JSON.stringify(dto.resource);
    const encrypted = this.crypto.encrypt(serialised, ctx.tenantId);

    await this.db.withTenant(ctx.tenantId, {
      userId: ctx.userId, countryCode: ctx.countryCode,
    }, async (client) => {
      await client.query(
        `INSERT INTO clinical_records
           (id, tenant_id, patient_id, resource_type, resource_id, version,
            ciphertext, iv, auth_tag, integrity_hash, author_id)
         VALUES ($1,$2,$3,$4,$5,1,$6,$7,$8,$9,$10)`,
        [
          id, ctx.tenantId, ctx.userId, dto.resource['resourceType'], resourceId,
          encrypted.ciphertext, encrypted.iv, encrypted.authTag,
          this.crypto.integrityHash(serialised), ctx.userId,
        ],
      );
    });

    await this.audit.record({
      tenantId: ctx.tenantId, actorId: ctx.userId, actorRole: ctx.roles[0] ?? 'patient',
      action: 'RECORD_CREATED', objectType: 'record', objectId: id,
      purpose: 'care', decision: 'applied',
      metadata: { resourceType: String(dto.resource['resourceType']), resourceId },
    });
    return { id, version: 1 };
  }

  async list(ctx: RequestContext, patientId?: string, resourceType?: string): Promise<unknown[]> {
    this.assertRole(ctx);
    const target = patientId ?? ctx.userId;

    const result = await this.db.query<RecordRow>(
      `SELECT id, tenant_id, patient_id, resource_type, resource_id, version, ciphertext, iv,
              auth_tag, integrity_hash, author_id, previous_id, is_current, created_at
         FROM clinical_records
        WHERE patient_id = $1 AND is_current = true
          AND ($2::text IS NULL OR resource_type = $2)
        ORDER BY created_at DESC LIMIT 200`,
      [target, resourceType ?? null],
      { tenantId: ctx.tenantId, userId: ctx.userId, countryCode: ctx.countryCode },
    );

    const visible: unknown[] = [];
    for (const row of result.rows) {
      if (row.tenant_id !== ctx.tenantId) {
        if (!(await this.consents.hasActiveGrant(row.tenant_id, ctx.userId, row.resource_type))) {
          await this.audit.record({
            tenantId: row.tenant_id, actorId: ctx.userId, actorRole: ctx.roles[0],
            action: 'RECORD_READ_DENIED', objectType: 'record', objectId: row.id,
            decision: 'denied', metadata: { resourceType: row.resource_type },
          });
          continue;
        }
      }
      visible.push(this.decrypt(row));
    }
    return visible;
  }

  async read(ctx: RequestContext, id: string): Promise<unknown> {
    this.assertRole(ctx);
    const result = await this.db.query<RecordRow>(
      `SELECT id, tenant_id, patient_id, resource_type, resource_id, version, ciphertext, iv,
              auth_tag, integrity_hash, author_id, previous_id, is_current, created_at
         FROM clinical_records WHERE id = $1`,
      [id],
      { tenantId: ctx.tenantId, userId: ctx.userId, countryCode: ctx.countryCode },
    );
    const row = result.rows[0];
    if (!row) {
      await this.audit.record({
        tenantId: ctx.tenantId, actorId: ctx.userId, action: 'RECORD_READ_DENIED',
        objectType: 'record', objectId: id, decision: 'denied',
      });
      throw new Error('RECORD_NOT_FOUND');
    }

    if (row.tenant_id !== ctx.tenantId) {
      const allowed = await this.consents.hasActiveGrant(row.tenant_id, ctx.userId, row.resource_type);
      if (!allowed) {
        await this.audit.record({
          tenantId: row.tenant_id, actorId: ctx.userId, actorRole: ctx.roles[0],
          action: 'RECORD_READ_DENIED', objectType: 'record', objectId: id,
          decision: 'denied', metadata: { resourceType: row.resource_type },
        });
        throw new Error('CONSENT_REQUIRED');
      }
    }

    const record = this.decrypt(row);
    await this.audit.record({
      tenantId: row.tenant_id, actorId: ctx.userId, actorRole: ctx.roles[0],
      action: 'RECORD_READ', objectType: 'record', objectId: id,
      purpose: ctx.tenantId === row.tenant_id ? 'self' : 'consent',
      decision: 'allowed', metadata: { resourceType: row.resource_type },
    });
    return record;
  }

  async correct(ctx: RequestContext, id: string, dto: CorrectRecordDto): Promise<{ id: string; version: number }> {
    this.assertRole(ctx);
    this.validate(dto.resource);

    const existing = await this.db.query<RecordRow>(
      `SELECT id, tenant_id, resource_type, resource_id, version, is_current
         FROM clinical_records WHERE id = $1`,
      [id],
      { tenantId: ctx.tenantId, userId: ctx.userId, countryCode: ctx.countryCode },
    );
    const row = existing.rows[0];
    if (!row || row.tenant_id !== ctx.tenantId) throw new Error('RECORD_NOT_FOUND');
    if (!row.is_current) throw new Error('RECORD_NOT_CURRENT');

    const serialised = JSON.stringify(dto.resource);
    const encrypted = this.crypto.encrypt(serialised, ctx.tenantId);
    const newId = randomUUID();

    await this.db.withTenant(ctx.tenantId, { userId: ctx.userId, countryCode: ctx.countryCode }, async (client) => {
      await client.query('UPDATE clinical_records SET is_current = false WHERE id = $1', [id]);
      await client.query(
        `INSERT INTO clinical_records
           (id, tenant_id, patient_id, resource_type, resource_id, version,
            ciphertext, iv, auth_tag, integrity_hash, author_id, previous_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [
          newId, ctx.tenantId, ctx.userId, row.resource_type, row.resource_id, row.version + 1,
          encrypted.ciphertext, encrypted.iv, encrypted.authTag,
          this.crypto.integrityHash(serialised), ctx.userId, id,
        ],
      );
    });

    await this.audit.record({
      tenantId: ctx.tenantId, actorId: ctx.userId, actorRole: ctx.roles[0] ?? 'patient',
      action: 'RECORD_CORRECTED', objectType: 'record', objectId: newId,
      decision: 'applied', metadata: { resourceType: row.resource_type, version: row.version + 1, reason: dto.reason },
    });
    return { id: newId, version: row.version + 1 };
  }

  async versions(ctx: RequestContext, id: string): Promise<unknown[]> {
    this.assertRole(ctx);
    const source = await this.db.query<{ resource_id: string; tenant_id: string; resource_type: string }>(
      'SELECT resource_id, tenant_id, resource_type FROM clinical_records WHERE id = $1',
      [id],
      { tenantId: ctx.tenantId, userId: ctx.userId, countryCode: ctx.countryCode },
    );
    const row = source.rows[0];
    if (!row) throw new Error('RECORD_NOT_FOUND');
    if (row.tenant_id !== ctx.tenantId && !(await this.consents.hasActiveGrant(row.tenant_id, ctx.userId, row.resource_type))) {
      throw new Error('CONSENT_REQUIRED');
    }

    const result = await this.db.query<RecordRow>(
      `SELECT id, tenant_id, resource_type, resource_id, version, ciphertext, iv, auth_tag,
              integrity_hash, author_id, previous_id, is_current, created_at
         FROM clinical_records WHERE resource_id = $1 AND tenant_id = $2 ORDER BY version`,
      [row.resource_id, row.tenant_id],
      { tenantId: ctx.tenantId, userId: ctx.userId, countryCode: ctx.countryCode },
    );
    return result.rows.map((item) => this.decrypt(item));
  }

  private decrypt(row: RecordRow): unknown {
    const json = this.crypto.decrypt(
      { ciphertext: row.ciphertext, iv: row.iv, authTag: row.auth_tag },
      row.tenant_id,
    );
    if (this.crypto.integrityHash(json) !== row.integrity_hash) throw new Error('RECORD_INTEGRITY_FAILURE');
    return JSON.parse(json) as unknown;
  }
}
