import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { DatabaseService } from '../src/database/database.service';
import { CountryProfileService } from '../src/config/country-profile.service';
import { IdentityService } from '../src/identity/identity.service';

describe('EMDO Care: verification, directory and appointments (e2e, real PostgreSQL)', () => {
  let app: INestApplication;
  let http: ReturnType<INestApplication['getHttpServer']>;
  let identities: IdentityService;

  const suffix = randomUUID().slice(0, 8);
  const email = (name: string) => `${name}-${suffix}@emdo.invalid`;
  const password = 'ValidTestPassword2026!';

  let reviewerOneToken: string;
  let reviewerTwoToken: string;
  let adminToken: string;

  beforeAll(async () => {
    const { AppModule } = await import('../src/app.module');
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();

    const db = moduleRef.get(DatabaseService);
    identities = moduleRef.get(IdentityService);
    await db.runMigrations(join(__dirname, '..', 'src', 'database', 'migrations'));
    await moduleRef.get(CountryProfileService).upsert('SANDBOX', 'Sandbox', 'sandbox', {
      clinicalUse: false,
      verificationSources: [{ kind: 'manual', enabled: true, authoritative: false, tested: false }],
    });
    await db.query(
      `TRUNCATE audit_events, appointments, provider_slots, verification_events,
        provider_credentials, approval_requests, provider_profiles, consent_grants,
        clinical_records, refresh_tokens, user_roles, users RESTART IDENTITY CASCADE`,
      [],
      { isSystem: true },
    );
    http = app.getHttpServer();

    await identities.createStaff({
      identifier: email('admin'), password, countryCode: 'SANDBOX', roles: ['platform_admin'],
    });
    await identities.createStaff({
      identifier: email('reviewer-one'), password, countryCode: 'SANDBOX', roles: ['compliance_officer'],
    });
    await identities.createStaff({
      identifier: email('reviewer-two'), password, countryCode: 'SANDBOX', roles: ['compliance_officer'],
    });
    adminToken = await login('admin');
    reviewerOneToken = await login('reviewer-one');
    reviewerTwoToken = await login('reviewer-two');
  });

  afterAll(async () => {
    await app?.close();
  });

  async function login(name: string): Promise<string> {
    const response = await request(http)
      .post('/v1/identity/login')
      .send({ identifier: email(name), password })
      .expect(200);
    return (response.body as { accessToken: string }).accessToken;
  }

  async function registerPatient(name: string): Promise<{ userId: string; tenantId: string; token: string }> {
    const created = await request(http)
      .post('/v1/identity/register')
      .send({ identifierType: 'email', identifier: email(name), password, countryCode: 'SANDBOX' })
      .expect(201);
    const patient = created.body as { userId: string; tenantId: string };
    return { ...patient, token: await login(name) };
  }

  async function submitProvider(name: string): Promise<{ providerId: string; clinicianId: string; clinicianToken: string }> {
    const staff = await identities.createStaff({
      identifier: email(name), password, countryCode: 'SANDBOX', roles: ['clinician'],
    });
    const clinicianToken = await login(name);
    const response = await request(http)
      .post('/v1/providers/me')
      .set('Authorization', `Bearer ${clinicianToken}`)
      .send({
        professionalName: `Dr ${name}`,
        specialty: 'General Practice',
        languages: ['English'],
        city: 'Test City',
        telehealthEnabled: true,
        consultationFee: 0,
        currency: 'TEST',
        licenceNumber: `LIC-${suffix}-${name}`,
        licenceJurisdiction: 'SANDBOX',
        credentialReference: `manual-reference-${name}`,
      })
      .expect(201);
    return { providerId: (response.body as { id: string }).id, clinicianId: staff.userId, clinicianToken };
  }

  async function approveProvider(providerId: string): Promise<string> {
    const review = await request(http)
      .post(`/v1/providers/${providerId}/review`)
      .set('Authorization', `Bearer ${reviewerOneToken}`)
      .send({
        toStatus: 'under_review',
        reason: 'Manual sandbox credential review',
        evidenceRef: `evidence-${providerId}`,
      })
      .expect(200);
    const approvalId = (review.body as { approvalId: string }).approvalId;
    expect(approvalId).toBeTruthy();

    await request(http)
      .post(`/v1/approvals/${approvalId}/decision`)
      .set('Authorization', `Bearer ${reviewerOneToken}`)
      .send({ decision: 'approved', reason: 'Self-approval attempt', evidenceRef: `evidence-${providerId}` })
      .expect(403)
      .expect((res) => expect(res.body.error.code).toBe('APPROVAL_SAME_ACTOR_NOT_ALLOWED'));

    await request(http)
      .post(`/v1/approvals/${approvalId}/decision`)
      .set('Authorization', `Bearer ${reviewerTwoToken}`)
      .send({ decision: 'approved', reason: 'Second reviewer approval', evidenceRef: `evidence-${providerId}` })
      .expect(200);
    return approvalId;
  }

  it('hides unverified providers and only verifies through a named second approver', async () => {
    const patient = await registerPatient('care-patient');
    const submitted = await submitProvider('provider-a');

    await request(http)
      .get('/v1/providers/review-queue')
      .set('Authorization', `Bearer ${patient.token}`)
      .expect(403);

    const before = await request(http)
      .get('/v1/providers')
      .set('Authorization', `Bearer ${patient.token}`)
      .expect(200);
    expect((before.body as Array<{ id: string }>).some((item) => item.id === submitted.providerId)).toBe(false);

    await request(http)
      .get(`/v1/providers/${submitted.providerId}/slots`)
      .set('Authorization', `Bearer ${patient.token}`)
      .expect(403)
      .expect((res) => expect(res.body.error.code).toBe('PROVIDER_NOT_VERIFIED'));

    await request(http)
      .post('/v1/appointments/slots')
      .set('Authorization', `Bearer ${submitted.clinicianToken}`)
      .send({ startsAt: new Date(Date.now() + 3600000).toISOString(), endsAt: new Date(Date.now() + 7200000).toISOString() })
      .expect(403)
      .expect((res) => expect(res.body.error.code).toBe('PROVIDER_NOT_VERIFIED'));

    const queue = await request(http)
      .get('/v1/providers/review-queue')
      .set('Authorization', `Bearer ${reviewerOneToken}`)
      .expect(200);
    expect((queue.body as Array<{ id: string }>).some((item) => item.id === submitted.providerId)).toBe(true);

    await approveProvider(submitted.providerId);

    const after = await request(http)
      .get('/v1/providers?specialty=General&telehealth=true')
      .set('Authorization', `Bearer ${patient.token}`)
      .expect(200);
    expect((after.body as Array<{ id: string; verificationStatus?: string }>).some(
      (item) => item.id === submitted.providerId,
    )).toBe(true);

    const events = await request(http)
      .get(`/v1/providers/${submitted.providerId}/events`)
      .set('Authorization', `Bearer ${reviewerTwoToken}`)
      .expect(200);
    expect((events.body as Array<{ to_status: string }>).map((event) => event.to_status)).toEqual(
      expect.arrayContaining(['submitted', 'under_review', 'verified']),
    );
  });

  it('books and cancels an appointment without exposing records to a verified provider', async () => {
    const patient = await registerPatient('care-booker');
    const secondPatient = await registerPatient('care-second');
    const provider = await submitProvider('provider-b');
    await approveProvider(provider.providerId);

    const startsAt = new Date(Date.now() + 3600000).toISOString();
    const endsAt = new Date(Date.now() + 7200000).toISOString();
    const slotResponse = await request(http)
      .post('/v1/appointments/slots')
      .set('Authorization', `Bearer ${provider.clinicianToken}`)
      .send({ startsAt, endsAt })
      .expect(201);
    const slotId = (slotResponse.body as { id: string }).id;

    const booked = await request(http)
      .post('/v1/appointments')
      .set('Authorization', `Bearer ${patient.token}`)
      .send({ providerId: provider.providerId, slotId, channel: 'telehealth' })
      .expect(201);
    const appointmentId = (booked.body as { id: string }).id;

    await request(http)
      .post('/v1/appointments')
      .set('Authorization', `Bearer ${secondPatient.token}`)
      .send({ providerId: provider.providerId, slotId, channel: 'telehealth' })
      .expect(409)
      .expect((res) => expect(res.body.error.code).toBe('SLOT_NOT_AVAILABLE'));

    const patientList = await request(http)
      .get('/v1/appointments')
      .set('Authorization', `Bearer ${patient.token}`)
      .expect(200);
    expect((patientList.body as Array<{ id: string }>).some((item) => item.id === appointmentId)).toBe(true);

    const clinicianList = await request(http)
      .get('/v1/appointments')
      .set('Authorization', `Bearer ${provider.clinicianToken}`)
      .expect(200);
    expect((clinicianList.body as Array<{ id: string }>).some((item) => item.id === appointmentId)).toBe(true);

    const record = await request(http)
      .post('/v1/records')
      .set('Authorization', `Bearer ${patient.token}`)
      .send({
        resource: {
          resourceType: 'Observation',
          id: `care-obs-${suffix}`,
          meta: { versionId: '1' },
          subject: { reference: `Patient/${patient.userId}` },
          status: 'final',
          code: { text: 'heart rate' },
          valueQuantity: { value: 72, unit: '/min' },
        },
      })
      .expect(201);
    const recordId = (record.body as { id: string }).id;

    await request(http)
      .get(`/v1/records/${recordId}`)
      .set('Authorization', `Bearer ${provider.clinicianToken}`)
      .expect(403)
      .expect((res) => expect(res.body.error.code).toBe('CLINICIAN_VERIFICATION_NOT_AVAILABLE'));

    await request(http)
      .post(`/v1/appointments/${appointmentId}/cancel`)
      .set('Authorization', `Bearer ${patient.token}`)
      .expect(200);

    const released = await request(http)
      .get(`/v1/providers/${provider.providerId}/slots`)
      .set('Authorization', `Bearer ${patient.token}`)
      .expect(200);
    expect((released.body as Array<{ id: string }>).some((item) => item.id === slotId)).toBe(true);

    const audit = await request(http)
      .get(`/v1/audit/events?tenantId=${patient.tenantId}&limit=50`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const actions = (audit.body as Array<{ action: string }>).map((event) => event.action);
    expect(actions).toEqual(expect.arrayContaining(['APPOINTMENT_BOOKED', 'APPOINTMENT_CANCELLED']));
    // The approval decision belongs to the reviewer's tenant, not the patient's.
    expect(actions).not.toContain('PROVIDER_APPROVED');

    const allAudit = await request(http)
      .get('/v1/audit/events?limit=200')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const allAuditRows = allAudit.body as Array<{ action: string; actor_id: string | null }>;
    expect(allAuditRows.map((event) => event.action)).toEqual(expect.arrayContaining(['PROVIDER_APPROVED']));
    expect(allAuditRows.filter((event) => event.action === 'RECORD_READ'
      && event.actor_id === provider.clinicianId)).toHaveLength(0);
  });
});
