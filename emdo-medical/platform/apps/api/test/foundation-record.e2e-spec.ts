import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { DatabaseService } from '../src/database/database.service';
import { CountryProfileService } from '../src/config/country-profile.service';
import { IdentityService } from '../src/identity/identity.service';

describe('Foundation + EMDO Record (e2e, real PostgreSQL)', () => {
  let app: INestApplication;
  let http: ReturnType<INestApplication['getHttpServer']>;
  let db: DatabaseService;
  let identities: IdentityService;

  const suffix = randomUUID().slice(0, 8);
  const email = (name: string) => `${name}-${suffix}@emdo.invalid`;
  const password = 'ValidTestPassword2026!';

  beforeAll(async () => {
    const { AppModule } = await import('../src/app.module');
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();

    db = moduleRef.get(DatabaseService);
    identities = moduleRef.get(IdentityService);
    await db.runMigrations(join(__dirname, '..', 'src', 'database', 'migrations'));
    await moduleRef.get(CountryProfileService).upsert('SANDBOX', 'Sandbox', 'sandbox', {});
    await db.query(
      'TRUNCATE audit_events, clinical_records, consent_grants, refresh_tokens, user_roles, users RESTART IDENTITY CASCADE',
      [],
      { isSystem: true },
    );
    await identities.createStaff({
      identifier: email('admin'), password, countryCode: 'SANDBOX', roles: ['platform_admin'],
    });
    http = app.getHttpServer();
  });

  afterAll(async () => {
    await app?.close();
  });

  async function register(name: string): Promise<{ userId: string; tenantId: string }> {
    const response = await request(http)
      .post('/v1/identity/register')
      .send({ identifierType: 'email', identifier: email(name), password, countryCode: 'SANDBOX' })
      .expect(201);
    return response.body as { userId: string; tenantId: string };
  }

  async function login(name: string): Promise<string> {
    const response = await request(http)
      .post('/v1/identity/login')
      .send({ identifier: email(name), password })
      .expect(200);
    return (response.body as { accessToken: string }).accessToken;
  }

  it('enforces ownership, consent, revocation, versioning, role gates and audit access', async () => {
    const patientA = await register('patient-a');
    const patientB = await register('patient-b');
    const tokenA = await login('patient-a');
    const tokenB = await login('patient-b');

    const resource = {
      resourceType: 'Observation',
      id: `obs-${suffix}`,
      meta: { versionId: '1' },
      subject: { reference: `Patient/${patientA.userId}` },
      status: 'final',
      code: { text: 'heart rate' },
      valueQuantity: { value: 72, unit: '/min' },
    };

    const created = await request(http)
      .post('/v1/records')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ resource })
      .expect(201);
    const recordId = (created.body as { id: string }).id;

    const own = await request(http)
      .get(`/v1/records/${recordId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect((own.body as { resourceType: string }).resourceType).toBe('Observation');

    await request(http)
      .get(`/v1/records/${recordId}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(404);

    const expiresAt = new Date(Date.now() + 3600000).toISOString();
    const grant = await request(http)
      .post('/v1/consents')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        granteeUserId: patientB.userId,
        purpose: 'second_opinion',
        scope: { resourceTypes: ['Observation'] },
        expiresAt,
      })
      .expect(201);
    const grantId = (grant.body as { id: string }).id;

    await request(http)
      .get(`/v1/records/${recordId}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200);

    await request(http)
      .delete(`/v1/consents/${grantId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    await request(http)
      .get(`/v1/records/${recordId}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(404);

    const corrected = await request(http)
      .post(`/v1/records/${recordId}/correct`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        resource: { ...resource, valueQuantity: { value: 74, unit: '/min' } },
        reason: 'Transcription correction',
      })
      .expect(201);
    expect((corrected.body as { version: number }).version).toBe(2);

    const versions = await request(http)
      .get(`/v1/records/${recordId}/versions`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect(versions.body).toHaveLength(2);

    const adminToken = await login('admin');
    await request(http)
      .post('/v1/identity/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        identifier: email('clinician'), password, countryCode: 'SANDBOX', roles: ['clinician'],
      })
      .expect(201);
    const clinicianToken = await login('clinician');

    await request(http)
      .get(`/v1/records/${recordId}`)
      .set('Authorization', `Bearer ${clinicianToken}`)
      .expect(403);

    await request(http)
      .get('/v1/audit/events')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(403);

    const audit = await request(http)
      .get('/v1/audit/events')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(Array.isArray(audit.body)).toBe(true);
    expect((audit.body as Array<{ action: string }>).some((event) => event.action === 'CONSENT_REVOKED')).toBe(true);
  });

  it('rejects an AI-authored clinical resource', async () => {
    const patient = await register('patient-c');
    const token = await login('patient-c');
    const resource = {
      resourceType: 'Observation',
      id: `obs-ai-${suffix}`,
      meta: { versionId: '1' },
      subject: { reference: `Patient/${patient.userId}` },
      status: 'final',
      code: { text: 'AI generated' },
      author: [{ reference: 'AI/model-1' }],
    };
    await request(http)
      .post('/v1/records')
      .set('Authorization', `Bearer ${token}`)
      .send({ resource })
      .expect(400);
  });
});
