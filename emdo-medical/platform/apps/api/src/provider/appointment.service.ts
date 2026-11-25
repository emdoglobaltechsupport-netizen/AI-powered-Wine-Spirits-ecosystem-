import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CountryProfileService } from '../config/country-profile.service';
import { AuditService } from '../common/audit/audit.service';
import { RequestContext } from '../common/auth/request-context';
import { BookAppointmentDto, CreateSlotDto } from './dto/provider.dto';
import { VerificationService } from './verification.service';

interface SlotRow {
  id: string;
  provider_id: string;
  starts_at: Date;
  ends_at: Date;
  status: string;
}

export interface AppointmentRow {
  id: string;
  patient_user_id: string;
  provider_id: string;
  provider_user_id: string;
  channel: string;
  status: string;
  starts_at: Date;
  ends_at: Date;
  created_at: Date;
}

/** Availability and booking. The appointment record carries no patient reason/free text. */
@Injectable()
export class AppointmentService {
  constructor(
    private readonly db: DatabaseService,
    private readonly profiles: CountryProfileService,
    private readonly audit: AuditService,
    private readonly verification: VerificationService,
  ) {}

  async createSlot(ctx: RequestContext, dto: CreateSlotDto): Promise<{ id: string; startsAt: Date; endsAt: Date }> {
    if (!ctx.roles.includes('clinician')) throw new Error('FORBIDDEN');
    this.profiles.assertUsable(ctx.countryCode);

    const own = await this.db.query<{ id: string }>(
      'SELECT id FROM provider_profiles WHERE user_id = $1',
      [ctx.userId],
      { isSystem: true },
    );
    const providerId = own.rows[0]?.id;
    if (!providerId) throw new Error('PROVIDER_NOT_FOUND');
    const provider = await this.verification.assertVerifiedForCountry(providerId, ctx.countryCode);

    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())
      || endsAt.getTime() <= startsAt.getTime() || startsAt.getTime() <= Date.now()) {
      throw new Error('INVALID_SLOT_WINDOW');
    }

    const id = randomUUID();
    await this.db.query(
      `INSERT INTO provider_slots (id, provider_id, starts_at, ends_at)
       VALUES ($1,$2,$3,$4)`,
      [id, provider.id, startsAt, endsAt],
      { isSystem: true },
    );
    await this.audit.record({
      tenantId: ctx.tenantId, actorId: ctx.userId, actorRole: 'clinician',
      action: 'PROVIDER_SLOT_CREATED', objectType: 'slot', objectId: id,
      decision: 'applied', metadata: { providerId },
    });
    return { id, startsAt, endsAt };
  }

  async book(ctx: RequestContext, dto: BookAppointmentDto): Promise<{ id: string; status: string; startsAt: Date }> {
    this.assertPatient(ctx);
    this.profiles.assertUsable(ctx.countryCode);
    const provider = await this.verification.assertVerifiedForCountry(dto.providerId, ctx.countryCode);

    const slotResult = await this.db.query<SlotRow>(
      'SELECT id, provider_id, starts_at, ends_at, status FROM provider_slots WHERE id = $1',
      [dto.slotId],
      { isSystem: true },
    );
    const slot = slotResult.rows[0];
    if (!slot) throw new Error('SLOT_NOT_FOUND');
    if (slot.provider_id !== provider.id) throw new Error('SLOT_PROVIDER_MISMATCH');
    if (slot.status !== 'available') throw new Error('SLOT_NOT_AVAILABLE');
    if (slot.starts_at.getTime() <= Date.now()) throw new Error('SLOT_EXPIRED');
    if (dto.channel === 'telehealth' && !provider.telehealth_enabled) throw new Error('TELEHEALTH_NOT_ENABLED');

    const id = randomUUID();
    await this.db.withContext({ isSystem: true }, async (client) => {
      const claimed = await client.query(
        `UPDATE provider_slots SET status = 'booked' WHERE id = $1 AND status = 'available'`,
        [slot.id],
      );
      if (claimed.rowCount !== 1) throw new Error('SLOT_NOT_AVAILABLE');
      await client.query(
        `INSERT INTO appointments
           (id, patient_tenant_id, patient_user_id, provider_id, provider_tenant_id, slot_id, channel)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [id, ctx.tenantId, ctx.userId, provider.id, provider.tenant_id, slot.id, dto.channel],
      );
    });

    await this.audit.record({
      tenantId: ctx.tenantId, actorId: ctx.userId, actorRole: ctx.roles[0] ?? 'patient',
      action: 'APPOINTMENT_BOOKED', objectType: 'appointment', objectId: id,
      purpose: 'consultation', decision: 'applied',
      metadata: { providerId: provider.id, slotId: slot.id, channel: dto.channel },
    });
    return { id, status: 'confirmed', startsAt: slot.starts_at };
  }

  async list(ctx: RequestContext): Promise<AppointmentRow[]> {
    const isPatient = ctx.roles.some((role) => role === 'patient' || role === 'caregiver');
    const isClinician = ctx.roles.includes('clinician');
    if (!isPatient && !isClinician) throw new Error('FORBIDDEN');

    let providerId: string | null = null;
    if (isClinician) {
      const own = await this.db.query<{ id: string }>(
        'SELECT id FROM provider_profiles WHERE user_id = $1',
        [ctx.userId],
        { isSystem: true },
      );
      providerId = own.rows[0]?.id ?? null;
      if (!providerId) return [];
    }

    const result = await this.db.query<AppointmentRow>(
      `SELECT a.id, a.patient_user_id, a.provider_id, a.channel, a.status,
              p.user_id AS provider_user_id, s.starts_at, s.ends_at, a.created_at
         FROM appointments a
         JOIN provider_profiles p ON p.id = a.provider_id
         JOIN provider_slots s ON s.id = a.slot_id
        WHERE ($1::uuid IS NULL OR a.patient_user_id = $1)
          AND ($2::uuid IS NULL OR a.provider_id = $2)
        ORDER BY s.starts_at DESC LIMIT 200`,
      [isPatient ? ctx.userId : null, providerId],
      { isSystem: true },
    );
    return result.rows;
  }

  async cancel(ctx: RequestContext, id: string): Promise<{ id: string; status: string }> {
    const result = await this.db.query<AppointmentRow>(
      `SELECT a.id, a.patient_user_id, a.provider_id, a.channel, a.status,
              p.user_id AS provider_user_id, s.starts_at, s.ends_at, a.created_at
         FROM appointments a
         JOIN provider_profiles p ON p.id = a.provider_id
         JOIN provider_slots s ON s.id = a.slot_id
        WHERE a.id = $1`,
      [id],
      { isSystem: true },
    );
    const appointment = result.rows[0];
    if (!appointment) throw new Error('APPOINTMENT_NOT_FOUND');
    const isOwner = appointment.patient_user_id === ctx.userId || appointment.provider_user_id === ctx.userId;
    if (!isOwner) throw new Error('APPOINTMENT_NOT_OWNED');
    if (appointment.status === 'cancelled') throw new Error('APPOINTMENT_ALREADY_CANCELLED');
    if (appointment.status === 'completed') throw new Error('APPOINTMENT_NOT_CANCELLABLE');

    await this.db.withContext({ isSystem: true }, async (client) => {
      await client.query(
        `UPDATE appointments SET status = 'cancelled', updated_at = now() WHERE id = $1`,
        [id],
      );
      await client.query(
        `UPDATE provider_slots SET status = 'available'
          WHERE id IN (SELECT slot_id FROM appointments WHERE id = $1) AND status = 'booked'`,
        [id],
      );
    });

    await this.audit.record({
      tenantId: ctx.tenantId, actorId: ctx.userId, actorRole: ctx.roles[0] ?? 'patient',
      action: 'APPOINTMENT_CANCELLED', objectType: 'appointment', objectId: id,
      decision: 'revoked', metadata: { providerId: appointment.provider_id },
    });
    return { id, status: 'cancelled' };
  }

  private assertPatient(ctx: RequestContext): void {
    if (!ctx.roles.some((role) => role === 'patient' || role === 'caregiver')) throw new Error('FORBIDDEN');
  }
}
