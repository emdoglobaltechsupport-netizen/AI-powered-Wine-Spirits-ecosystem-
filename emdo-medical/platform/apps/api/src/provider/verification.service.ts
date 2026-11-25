import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ProviderVerificationStatus } from '@emdo/shared';
import { DatabaseService } from '../database/database.service';
import { CountryProfileService } from '../config/country-profile.service';
import { CryptoService } from '../common/crypto/crypto.service';
import { AuditService } from '../common/audit/audit.service';
import { RequestContext } from '../common/auth/request-context';
import {
  AddCredentialDto,
  CreateProviderProfileDto,
  DecideApprovalDto,
  TransitionProviderDto,
} from './dto/provider.dto';
import {
  assertVerificationSource,
  assertVerificationTransition,
} from './verification-rules';

const FRESH_AUTH_WINDOW_SECONDS = 15 * 60;

export interface ProviderRow {
  id: string;
  user_id: string;
  tenant_id: string;
  country_code: string;
  professional_name: string;
  specialty: string;
  languages: string[];
  city: string | null;
  telehealth_enabled: boolean;
  consultation_fee: string | null;
  currency: string | null;
  licence_hash: string;
  licence_jurisdiction: string;
  licence_expires_at: Date | null;
  verification_status: ProviderVerificationStatus;
  verification_source: string | null;
  verified_at: Date | null;
  verified_by: string | null;
  created_at: Date;
}

export interface ApprovalRow {
  id: string;
  country_code: string;
  entity_type: string;
  entity_id: string;
  action: string;
  target_status: string | null;
  reason: string;
  evidence_ref: string | null;
  requested_by: string;
  requested_role: string;
  approver_id: string | null;
  approver_role: string | null;
  decision: 'pending' | 'approved' | 'rejected';
  decided_at: Date | null;
  consumed_at: Date | null;
  created_at: Date;
}

export interface VerificationEventRow {
  id: number;
  provider_id: string;
  from_status: string;
  to_status: string;
  actor_id: string | null;
  reason: string | null;
  evidence_ref: string | null;
  created_at: Date;
}

/** Credentialing and human approval workflow. No external registry is called. */
@Injectable()
export class VerificationService {
  constructor(
    private readonly db: DatabaseService,
    private readonly profiles: CountryProfileService,
    private readonly crypto: CryptoService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
  ) {}

  async createProfile(ctx: RequestContext, dto: CreateProviderProfileDto): Promise<{ id: string; status: ProviderVerificationStatus }> {
    this.assertClinician(ctx);
    this.profiles.assertUsable(ctx.countryCode);
    if (dto.languages.length === 0) throw new Error('INVALID_PROVIDER_PROFILE');

    const existing = await this.db.query<{ id: string }>(
      'SELECT id FROM provider_profiles WHERE user_id = $1',
      [ctx.userId],
      { isSystem: true },
    );
    if (existing.rowCount) throw new Error('PROVIDER_PROFILE_EXISTS');

    const expiresAt = dto.licenceExpiresAt ? new Date(dto.licenceExpiresAt) : null;
    if (expiresAt && expiresAt.getTime() <= Date.now()) throw new Error('INVALID_LICENCE_EXPIRY');

    const id = randomUUID();
    const licenceHash = this.crypto.hashIdentifier(`${dto.licenceJurisdiction}:${dto.licenceNumber}`);

    await this.db.withContext({ isSystem: true }, async (client) => {
      await client.query(
        `INSERT INTO provider_profiles
           (id, user_id, tenant_id, country_code, professional_name, specialty, languages,
            city, telehealth_enabled, consultation_fee, currency, licence_hash,
            licence_jurisdiction, licence_expires_at, verification_status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'unverified')`,
        [
          id, ctx.userId, ctx.tenantId, ctx.countryCode, dto.professionalName, dto.specialty,
          dto.languages, dto.city ?? null, dto.telehealthEnabled ?? false,
          dto.consultationFee ?? null, dto.currency ?? null, licenceHash,
          dto.licenceJurisdiction, expiresAt,
        ],
      );
      await client.query(
        `INSERT INTO provider_credentials
           (id, provider_id, credential_type, source_type, reference_hash, jurisdiction, expires_at)
         VALUES ($1,$2,'licence','manual',$3,$4,$5)`,
        [randomUUID(), id, licenceHash, dto.licenceJurisdiction, expiresAt],
      );
      if (dto.credentialReference) {
        await client.query(
          `INSERT INTO provider_credentials
             (id, provider_id, credential_type, source_type, reference_hash, jurisdiction)
           VALUES ($1,$2,'qualification','document',$3,$4)`,
          [randomUUID(), id, this.crypto.hashIdentifier(dto.credentialReference), dto.licenceJurisdiction],
        );
      }
      await client.query(
        `INSERT INTO verification_events (provider_id, from_status, to_status, actor_id, reason)
         VALUES ($1,'unverified','submitted',$2,'Provider submission')`,
        [id, ctx.userId],
      );
      await client.query(
        `UPDATE provider_profiles SET verification_status = 'submitted', updated_at = now() WHERE id = $1`,
        [id],
      );
    });

    await this.audit.record({
      tenantId: ctx.tenantId, actorId: ctx.userId, actorRole: 'clinician',
      action: 'PROVIDER_SUBMITTED', objectType: 'provider', objectId: id,
      decision: 'applied', metadata: { countryCode: ctx.countryCode },
    });
    return { id, status: 'submitted' };
  }

  async resubmit(ctx: RequestContext, providerId: string): Promise<{ id: string; status: ProviderVerificationStatus }> {
    this.assertClinician(ctx);
    const provider = await this.getProvider(providerId);
    if (provider.user_id !== ctx.userId) throw new Error('PROVIDER_OWNER_ONLY');
    this.assertProviderCountry(provider, ctx.countryCode);
    assertVerificationTransition(provider.verification_status, 'submitted');

    await this.db.withContext({ isSystem: true }, async (client) => {
      await client.query(
        `UPDATE provider_profiles SET verification_status = 'submitted',
           verification_source = NULL, verified_at = NULL, verified_by = NULL, updated_at = now()
         WHERE id = $1`,
        [providerId],
      );
      await client.query(
        `INSERT INTO verification_events (provider_id, from_status, to_status, actor_id, reason)
         VALUES ($1,$2,'submitted',$3,'Resubmission after review outcome')`,
        [providerId, provider.verification_status, ctx.userId],
      );
    });

    await this.audit.record({
      tenantId: ctx.tenantId, actorId: ctx.userId, actorRole: 'clinician',
      action: 'PROVIDER_RESUBMITTED', objectType: 'provider', objectId: providerId,
      decision: 'applied',
    });
    return { id: providerId, status: 'submitted' };
  }

  async resubmitOwn(ctx: RequestContext): Promise<{ id: string; status: ProviderVerificationStatus }> {
    const provider = await this.getByUserId(ctx.userId);
    return this.resubmit(ctx, provider.id);
  }

  async addCredential(ctx: RequestContext, providerId: string, dto: AddCredentialDto): Promise<{ id: string }> {
    this.assertClinician(ctx);
    const provider = await this.getProvider(providerId);
    if (provider.user_id !== ctx.userId) throw new Error('PROVIDER_OWNER_ONLY');
    if (!['unverified', 'submitted', 'under_review', 'rejected'].includes(provider.verification_status)) {
      throw new Error('PROVIDER_CREDENTIALS_LOCKED');
    }

    const id = randomUUID();
    const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;
    await this.db.query(
      `INSERT INTO provider_credentials
         (id, provider_id, credential_type, source_type, reference_hash, jurisdiction, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        id, providerId, dto.credentialType, dto.sourceType,
        this.crypto.hashIdentifier(dto.reference), dto.jurisdiction, expiresAt,
      ],
      { isSystem: true },
    );
    await this.audit.record({
      tenantId: ctx.tenantId, actorId: ctx.userId, actorRole: 'clinician',
      action: 'PROVIDER_CREDENTIAL_ADDED', objectType: 'provider', objectId: providerId,
      decision: 'applied', metadata: { credentialType: dto.credentialType, sourceType: dto.sourceType },
    });
    return { id };
  }

  async addOwnCredential(ctx: RequestContext, dto: AddCredentialDto): Promise<{ id: string }> {
    const provider = await this.getByUserId(ctx.userId);
    return this.addCredential(ctx, provider.id, dto);
  }

  async getOwn(ctx: RequestContext): Promise<Record<string, unknown>> {
    this.assertClinician(ctx);
    return this.publicView(await this.getByUserId(ctx.userId));
  }

  async reviewQueue(ctx: RequestContext): Promise<Array<Record<string, unknown>>> {
    this.assertReviewer(ctx);
    this.profiles.assertUsable(ctx.countryCode);
    const result = await this.db.query<ProviderRow>(
      `SELECT id, user_id, tenant_id, country_code, professional_name, specialty, languages, city,
              telehealth_enabled, consultation_fee, currency, licence_hash, licence_jurisdiction,
              licence_expires_at, verification_status, verification_source, verified_at,
              verified_by, created_at
         FROM provider_profiles
        WHERE country_code = $1 AND verification_status IN ('submitted','under_review')
        ORDER BY created_at ASC LIMIT 100`,
      [ctx.countryCode],
      { isSystem: true },
    );
    return result.rows.map((row) => this.reviewView(row));
  }

  /** Human review transition. `verified` is only reachable through decideApproval. */
  async review(ctx: RequestContext, providerId: string, dto: TransitionProviderDto): Promise<Record<string, unknown>> {
    const actorRole = this.assertReviewer(ctx);
    this.assertFreshAuth(ctx);
    this.profiles.assertUsable(ctx.countryCode);

    const provider = await this.getProvider(providerId);
    this.assertProviderCountry(provider, ctx.countryCode);
    assertVerificationTransition(provider.verification_status, dto.toStatus);
    if (dto.toStatus === 'verified' || dto.toStatus === 'submitted') throw new Error('APPROVAL_REQUIRED');
    if (dto.toStatus === 'under_review' && !dto.evidenceRef) throw new Error('EVIDENCE_REQUIRED');

    let approvalId: string | null = null;
    await this.db.withContext({ isSystem: true }, async (client) => {
      if (dto.toStatus === 'under_review') {
        const pending = await client.query<{ id: string }>(
          `SELECT id FROM approval_requests
            WHERE entity_type = 'provider' AND entity_id = $1 AND action = 'VERIFY_PROVIDER'
              AND decision = 'pending' AND consumed_at IS NULL`,
          [providerId],
        );
        if (pending.rowCount) throw new Error('APPROVAL_REQUEST_EXISTS');
        approvalId = randomUUID();
        await client.query(
          `INSERT INTO approval_requests
             (id, country_code, entity_type, entity_id, action, target_status, reason,
              evidence_ref, requested_by, requested_role)
           VALUES ($1,$2,'provider',$3,'VERIFY_PROVIDER','verified',$4,$5,$6,$7)`,
          [
            approvalId, ctx.countryCode, providerId, dto.reason,
            dto.evidenceRef ?? null, ctx.userId, actorRole,
          ],
        );
      } else if (dto.toStatus === 'rejected') {
        await client.query(
          `UPDATE approval_requests
              SET decision = 'rejected', approver_id = $2::uuid, approver_role = $3::text,
                  decided_at = now(), consumed_at = now()
            WHERE entity_type = 'provider' AND entity_id = $1 AND action = 'VERIFY_PROVIDER'
              AND decision = 'pending' AND consumed_at IS NULL`,
          [providerId, ctx.userId, actorRole],
        );
      }

      const clearsVerification = !['verified', 'suspended'].includes(dto.toStatus);
      await client.query(
        `UPDATE provider_profiles
            SET verification_status = $2,
                verification_source = CASE WHEN $3 THEN NULL ELSE verification_source END,
                verified_at = CASE WHEN $3 THEN NULL ELSE verified_at END,
                verified_by = CASE WHEN $3 THEN NULL ELSE verified_by END,
                updated_at = now()
          WHERE id = $1`,
        [providerId, dto.toStatus, clearsVerification],
      );
      await client.query(
        `INSERT INTO verification_events
           (provider_id, from_status, to_status, actor_id, reason, evidence_ref)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [
          providerId, provider.verification_status, dto.toStatus, ctx.userId,
          dto.reason, dto.evidenceRef ?? null,
        ],
      );
    });

    await this.audit.record({
      tenantId: ctx.tenantId, actorId: ctx.userId, actorRole,
      action: `PROVIDER_REVIEW_${dto.toStatus.toUpperCase()}`,
      objectType: 'provider', objectId: providerId,
      decision: dto.toStatus === 'rejected' ? 'rejected' : 'applied',
      metadata: { from: provider.verification_status, to: dto.toStatus, approvalId },
    });
    return { id: providerId, status: dto.toStatus, approvalId };
  }

  /** Named human approval. Requester and approver must be different people. */
  async decideApproval(ctx: RequestContext, approvalId: string, dto: DecideApprovalDto): Promise<Record<string, unknown>> {
    const actorRole = this.assertReviewer(ctx);
    this.assertFreshAuth(ctx);
    this.profiles.assertUsable(ctx.countryCode);

    const approvalResult = await this.db.query<ApprovalRow>(
      'SELECT * FROM approval_requests WHERE id = $1',
      [approvalId],
      { isSystem: true },
    );
    const approval = approvalResult.rows[0];
    if (!approval) throw new Error('APPROVAL_NOT_FOUND');
    if (approval.decision !== 'pending' || approval.consumed_at) throw new Error('APPROVAL_ALREADY_DECIDED');
    if (approval.requested_by === ctx.userId) throw new Error('APPROVAL_SAME_ACTOR_NOT_ALLOWED');
    if (approval.country_code !== ctx.countryCode || approval.entity_type !== 'provider'
      || approval.action !== 'VERIFY_PROVIDER') throw new Error('INVALID_APPROVAL_ACTION');
    if (dto.decision === 'approved' && !dto.evidenceRef) throw new Error('EVIDENCE_REQUIRED');

    const provider = await this.getProvider(approval.entity_id);
    assertVerificationTransition(provider.verification_status, dto.decision === 'approved' ? 'verified' : 'rejected');

    let verificationSource: string | null = null;
    if (dto.decision === 'approved') {
      const country = this.profiles.get(ctx.countryCode);
      verificationSource = assertVerificationSource(country?.config ?? {}, {
        nodeEnv: this.config.get<string>('nodeEnv') ?? 'development',
        countryStatus: country?.status ?? 'planned',
      });
    }

    await this.db.withContext({ isSystem: true }, async (client) => {
      await client.query(
        `UPDATE approval_requests
            SET decision = $2::text, approver_id = $3::uuid, approver_role = $4::text, decided_at = now(),
                consumed_at = now()
          WHERE id = $1 AND decision = 'pending' AND consumed_at IS NULL`,
        [approvalId, dto.decision, ctx.userId, actorRole],
      );
      const nextStatus = dto.decision === 'approved' ? 'verified' : 'rejected';
      await client.query(
        `UPDATE provider_profiles
            SET verification_status = $2::text, verification_source = $3::text,
                verified_at = CASE WHEN $2::text = 'verified' THEN now() ELSE NULL END,
                verified_by = CASE WHEN $2::text = 'verified' THEN $4::uuid ELSE NULL END,
                updated_at = now()
          WHERE id = $1`,
        [provider.id, nextStatus, verificationSource, ctx.userId],
      );
      await client.query(
        `INSERT INTO verification_events
           (provider_id, from_status, to_status, actor_id, reason, evidence_ref)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [
          provider.id, provider.verification_status, nextStatus, ctx.userId,
          dto.reason, dto.evidenceRef ?? null,
        ],
      );
    });

    await this.audit.record({
      tenantId: ctx.tenantId, actorId: ctx.userId, actorRole,
      action: dto.decision === 'approved' ? 'PROVIDER_APPROVED' : 'APPROVAL_REJECTED',
      objectType: 'approval', objectId: approvalId,
      decision: dto.decision === 'approved' ? 'applied' : 'rejected',
      metadata: { providerId: provider.id, decision: dto.decision },
    });
    return { approvalId, providerId: provider.id, decision: dto.decision, status: dto.decision === 'approved' ? 'verified' : 'rejected' };
  }

  async events(ctx: RequestContext, providerId: string): Promise<VerificationEventRow[]> {
    const isReviewer = ctx.isPlatform || ctx.roles.includes('compliance_officer');
    const provider = await this.getProvider(providerId);
    if (!isReviewer && provider.user_id !== ctx.userId) throw new Error('PROVIDER_OWNER_ONLY');
    if (isReviewer) this.assertProviderCountry(provider, ctx.countryCode);

    const result = await this.db.query<VerificationEventRow>(
      `SELECT id, provider_id, from_status, to_status, actor_id, reason, evidence_ref, created_at
         FROM verification_events WHERE provider_id = $1 ORDER BY created_at DESC, id DESC LIMIT 200`,
      [providerId],
      { isSystem: true },
    );
    return result.rows;
  }

  async assertVerifiedForCountry(providerId: string, countryCode: string): Promise<ProviderRow> {
    const provider = await this.getProvider(providerId);
    if (provider.verification_status !== 'verified') throw new Error('PROVIDER_NOT_VERIFIED');
    this.assertProviderCountry(provider, countryCode);
    return provider;
  }

  private assertClinician(ctx: RequestContext): void {
    if (!ctx.roles.includes('clinician')) throw new Error('FORBIDDEN');
  }

  private assertReviewer(ctx: RequestContext): string {
    if (ctx.isPlatform) return 'platform_admin';
    if (ctx.roles.includes('compliance_officer')) return 'compliance_officer';
    throw new Error('INSUFFICIENT_ROLE');
  }

  private assertFreshAuth(ctx: RequestContext): void {
    if (ctx.authTime + FRESH_AUTH_WINDOW_SECONDS < Math.floor(Date.now() / 1000)) {
      throw new Error('FRESH_AUTH_REQUIRED');
    }
  }

  private assertProviderCountry(provider: ProviderRow, countryCode: string): void {
    if (provider.country_code !== countryCode) throw new Error('COUNTRY_MISMATCH');
  }

  private async getProvider(id: string): Promise<ProviderRow> {
    const result = await this.db.query<ProviderRow>('SELECT * FROM provider_profiles WHERE id = $1', [id], { isSystem: true });
    const provider = result.rows[0];
    if (!provider) throw new Error('PROVIDER_NOT_FOUND');
    return provider;
  }

  private async getByUserId(userId: string): Promise<ProviderRow> {
    const result = await this.db.query<ProviderRow>(
      'SELECT * FROM provider_profiles WHERE user_id = $1',
      [userId],
      { isSystem: true },
    );
    const provider = result.rows[0];
    if (!provider) throw new Error('PROVIDER_NOT_FOUND');
    return provider;
  }

  private publicView(row: ProviderRow): Record<string, unknown> {
    return {
      id: row.id,
      professionalName: row.professional_name,
      specialty: row.specialty,
      languages: row.languages,
      city: row.city,
      telehealthEnabled: row.telehealth_enabled,
      consultationFee: row.consultation_fee === null ? null : Number(row.consultation_fee),
      currency: row.currency,
      countryCode: row.country_code,
      verificationStatus: row.verification_status,
      verificationSource: row.verification_source,
      verifiedAt: row.verified_at,
      licenceJurisdiction: row.licence_jurisdiction,
      licenceExpiresAt: row.licence_expires_at,
    };
  }

  private reviewView(row: ProviderRow): Record<string, unknown> {
    return {
      ...this.publicView(row),
      userId: row.user_id,
      tenantId: row.tenant_id,
      submittedAt: row.created_at,
    };
  }
}
