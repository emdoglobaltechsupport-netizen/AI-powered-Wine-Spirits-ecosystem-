import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CountryProfileService } from '../config/country-profile.service';
import { AuditService } from '../common/audit/audit.service';
import { RequestContext } from '../common/auth/request-context';
import { VerificationService } from './verification.service';

interface DirectoryRow {
  id: string;
  professional_name: string;
  specialty: string;
  languages: string[];
  city: string | null;
  telehealth_enabled: boolean;
  consultation_fee: string | null;
  currency: string | null;
}

interface SlotRow {
  id: string;
  starts_at: Date;
  ends_at: Date;
}

/** Public directory surface: only verified providers, never credentials or PHI. */
@Injectable()
export class DirectoryService {
  constructor(
    private readonly db: DatabaseService,
    private readonly profiles: CountryProfileService,
    private readonly audit: AuditService,
    private readonly verification: VerificationService,
  ) {}

  async list(
    ctx: RequestContext,
    specialty?: string,
    city?: string,
    telehealth?: boolean,
  ): Promise<Array<Record<string, unknown>>> {
    this.profiles.assertUsable(ctx.countryCode);
    const result = await this.db.query<DirectoryRow>(
      `SELECT id, professional_name, specialty, languages, city, telehealth_enabled,
              consultation_fee, currency
         FROM provider_profiles
        WHERE verification_status = 'verified' AND country_code = $1
          AND ($2::text IS NULL OR specialty ILIKE '%' || $2 || '%')
          AND ($3::text IS NULL OR city ILIKE '%' || $3 || '%')
          AND ($4::boolean IS NULL OR telehealth_enabled = $4)
        ORDER BY professional_name ASC LIMIT 100`,
      [ctx.countryCode, specialty ?? null, city ?? null, telehealth ?? null],
      { isSystem: true },
    );

    await this.audit.record({
      tenantId: ctx.tenantId, actorId: ctx.userId, actorRole: ctx.roles[0] ?? 'patient',
      action: 'PROVIDER_DIRECTORY_READ', objectType: 'provider_directory',
      decision: 'allowed', metadata: { countryCode: ctx.countryCode },
    });

    return result.rows.map((row) => ({
      id: row.id,
      professionalName: row.professional_name,
      specialty: row.specialty,
      languages: row.languages,
      city: row.city,
      telehealthEnabled: row.telehealth_enabled,
      consultationFee: row.consultation_fee === null ? null : Number(row.consultation_fee),
      currency: row.currency,
    }));
  }

  async slots(ctx: RequestContext, providerId: string): Promise<Array<{ id: string; startsAt: Date; endsAt: Date }>> {
    this.profiles.assertUsable(ctx.countryCode);
    await this.verification.assertVerifiedForCountry(providerId, ctx.countryCode);
    const result = await this.db.query<SlotRow>(
      `SELECT id, starts_at, ends_at FROM provider_slots
        WHERE provider_id = $1 AND status = 'available' AND starts_at > now()
        ORDER BY starts_at ASC LIMIT 100`,
      [providerId],
      { isSystem: true },
    );
    return result.rows.map((row) => ({ id: row.id, startsAt: row.starts_at, endsAt: row.ends_at }));
  }
}
