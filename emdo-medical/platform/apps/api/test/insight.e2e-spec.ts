import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { Role } from '@emdo/shared';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { AuditService } from '../src/common/audit/audit.service';
import { DatabaseService } from '../src/database/database.service';
import { CountryProfileService } from '../src/config/country-profile.service';
import { IdentityService } from '../src/identity/identity.service';

describe('EMDO Insight: aggregate API only (e2e, real PostgreSQL)', () => {
  let app: INestApplication;
  let http: ReturnType<INestApplication['getHttpServer']>;
  let identities: IdentityService;
  let audits: AuditService;

  const suffix = randomUUID().slice(0, 8);
  const email = (name: string) => `${name}-${suffix}@emdo.invalid`;
  const password = 'ValidTestPassword2026!';

  let superAdminToken: string;
  let countryAdminToken: string;
  let financeToken: string;
  let marketingToken: string;
  let platformAdminToken: string;
  let patient: { userId: string; tenantId: string; token: string };

  beforeAll(async () => {
    const { AppModule } = await import('../src/app.module');
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();

    const db = moduleRef.get(DatabaseService);
    identities = moduleRef.get(IdentityService);
    audits = moduleRef.get(AuditService);
    await db.runMigrations(join(__dirname, '..', 'src', 'database', 'migrations'));
    await moduleRef.get(CountryProfileService).upsert('SANDBOX', 'Sandbox', 'sandbox', {
      clinicalUse: false,
      verificationSources: [{ kind: 'manual', enabled: true, authoritative: false, tested: false }],
    });
    await db.query(
      `TRUNCATE audit_events, ai_escalations, ai_interactions, appointments, provider_slots,
        verification_events, provider_credentials, approval_requests, provider_profiles,
        consent_grants, clinical_records, refresh_tokens, user_roles, users RESTART IDENTITY CASCADE`,
      [],
      { isSystem: true },
    );
    http = app.getHttpServer();

    superAdminToken = await createStaff('insight-super', ['super_admin']);
    countryAdminToken = await createStaff('insight-country', ['country_administrator']);
    financeToken = await createStaff('insight-finance', ['finance_manager']);
    marketingToken = await createStaff('insight-marketing', ['marketing_manager']);
    platformAdminToken = await createStaff('insight-platform', ['platform_admin']);

    // Synthetic test-only registrations: enough to prove small-cell suppression
    // and unsuppressed aggregate output without seeding any production data.
    for (let i = 0; i < 12; i += 1) {
      await identities.register({
        identifierType: 'email',
        identifier: email(`insight-patient-${i}`),
        password,
        countryCode: 'SANDBOX',
      });
    }
    patient = await registerPatient('insight-record-patient');

    for (let i = 0; i < 10; i += 1) {
      await request(http)
        .post('/v1/ai/ask')
        .set('Authorization', `Bearer ${patient.token}`)
        .send({
          agentId: 'patient_assistant',
          capability: 'general_information',
          prompt: `aggregate activity ${i}`,
        })
        .expect(201);
    }
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
    const createdUser = created.body as { userId: string; tenantId: string };
    return { ...createdUser, token: await login(name) };
  }

  async function createStaff(name: string, roles: Role[]): Promise<string> {
    await identities.createStaff({
      identifier: email(name), password, countryCode: 'SANDBOX', roles,
    });
    return login(name);
  }

  it('publishes the versioned catalogue and never fabricates absent business metrics', async () => {
    const catalogue = await request(http)
      .get('/v1/insight/metrics')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .expect(200);
    const definitions = catalogue.body as Array<{ id: string; metricVersion?: string; evidenceStatus: string }>;
    expect(definitions).toHaveLength(14);
    expect(definitions.find((metric) => metric.id === 'M10-M006')?.evidenceStatus)
      .toBe('UNAVAILABLE_NO_SOURCE');

    const revenue = await request(http)
      .get('/v1/insight/metrics/M10-M006')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .expect(200);
    expect(revenue.body).toHaveLength(1);
    expect(revenue.body[0]).toMatchObject({
      metricId: 'M10-M006',
      metricVersion: '1.0.0',
      evidenceStatus: 'UNAVAILABLE_NO_SOURCE',
      sourceStatus: 'NO_SOURCE',
      value: null,
      suppressed: false,
    });
    expect(revenue.body[0].missingSource).toContain('No billing ledger');
  });

  it('suppresses small cells and returns only de-identified aggregate values', async () => {
    const patientCount = await request(http)
      .get('/v1/insight/metrics/M10-M001')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .expect(200);
    expect(patientCount.body[0]).toMatchObject({
      metricId: 'M10-M001',
      evidenceStatus: 'AVAILABLE_WITH_CAVEAT',
      suppressed: false,
    });
    expect(patientCount.body[0].value).toBeGreaterThanOrEqual(13);
    expect(JSON.stringify(patientCount.body)).not.toContain(patient.userId);

    const doctorCount = await request(http)
      .get('/v1/insight/metrics/M10-M002')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .expect(200);
    expect(doctorCount.body[0]).toMatchObject({ value: null, suppressed: true });

    const aiActivity = await request(http)
      .get('/v1/insight/metrics/M10-M011')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .expect(200);
    expect(aiActivity.body[0]).toMatchObject({
      evidenceStatus: 'AVAILABLE_TESTED',
      suppressed: false,
      dimensions: {
        agentId: 'patient_assistant',
        capability: 'general_information',
        outcome: 'answered',
      },
    });
    expect(aiActivity.body[0].value).toBeGreaterThanOrEqual(10);
    expect(JSON.stringify(aiActivity.body)).not.toContain('aggregate activity');
  });

  it('enforces role groups, country scope and the absence of employee record access', async () => {
    await request(http)
      .get('/v1/insight/metrics')
      .set('Authorization', `Bearer ${patient.token}`)
      .expect(403)
      .expect((res) => expect(res.body.error.code).toBe('INSUFFICIENT_ROLE'));

    await request(http)
      .get('/v1/insight/metrics/M10-M006')
      .set('Authorization', `Bearer ${marketingToken}`)
      .expect(403)
      .expect((res) => expect(res.body.error.code).toBe('INSIGHT_REPORT_GROUP_FORBIDDEN'));

    await request(http)
      .get('/v1/insight/metrics/M10-M001?country=KEN')
      .set('Authorization', `Bearer ${countryAdminToken}`)
      .expect(403)
      .expect((res) => expect(res.body.error.code).toBe('COUNTRY_MISMATCH'));

    const resource = {
      resourceType: 'Observation',
      id: `insight-obs-${suffix}`,
      meta: { versionId: '1' },
      subject: { reference: `Patient/${patient.userId}` },
      status: 'final',
      code: { text: 'heart rate' },
      valueQuantity: { value: 72, unit: '/min' },
    };
    const created = await request(http)
      .post('/v1/records')
      .set('Authorization', `Bearer ${patient.token}`)
      .send({ resource })
      .expect(201);
    const recordId = (created.body as { id: string }).id;

    await request(http)
      .get(`/v1/records/${recordId}`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .expect(403)
      .expect((res) => expect(res.body.error.code).toBe('FORBIDDEN'));
  });

  it('generates daily, weekly and monthly reports with evidence and PHI-safe audit', async () => {
    for (const cadence of ['daily', 'weekly', 'monthly']) {
      const response = await request(http)
        .post('/v1/insight/reports/generate')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ reportId: 'business_performance', cadence, period: '2026-11' })
        .expect(201);
      const report = response.body as {
        cadence: string;
        finalDecisionAuthority: string;
        sections: Array<{
          metricId: string;
          metricVersion: string;
          evidenceStatus: string;
          sourceStatus: string;
          values: Array<{ generatedAt: string; suppressed: boolean }>;
        }>;
      };
      expect(report.cadence).toBe(cadence);
      expect(report.finalDecisionAuthority).toBe('CEO / Super Admin');
      expect(report.sections.some((section) => section.metricId === 'M10-M003'
        && section.evidenceStatus === 'UNAVAILABLE_NO_SOURCE')).toBe(true);
      for (const section of report.sections) {
        for (const value of section.values) {
          expect(value).toHaveProperty('metricId');
          expect(value).toHaveProperty('metricVersion');
          expect(value).toHaveProperty('evidenceStatus');
          expect(value).toHaveProperty('sourceStatus');
          expect(value).toHaveProperty('generatedAt');
          expect(value).toHaveProperty('suppressed');
        }
      }
    }

    const events = await audits.list(undefined, 200, 200);
    const generated = (events as Array<{ action: string; metadata: unknown }>)
      .filter((event) => event.action === 'insight_report_generated');
    expect(generated).toHaveLength(3);
    const metadata = generated[0].metadata as Record<string, unknown>;
    expect(metadata).toMatchObject({
      reportId: 'business_performance',
      cadence: expect.any(String),
      period: '2026-11',
      countryCode: 'ALL',
    });
    expect(JSON.stringify(metadata)).not.toContain(patient.userId);
  });

  it('lets finance report access stay within the finance group', async () => {
    const catalogue = await request(http)
      .get('/v1/insight/reports')
      .set('Authorization', `Bearer ${financeToken}`)
      .expect(200);
    expect((catalogue.body as Array<{ group: string }>).every((report) => report.group === 'finance'))
      .toBe(true);

    for (const cadence of ['daily', 'weekly', 'monthly']) {
      const response = await request(http)
        .post('/v1/insight/reports/generate')
        .set('Authorization', `Bearer ${financeToken}`)
        .send({ reportId: 'revenue_profitability', cadence, period: '2026-11' })
        .expect(201);
      const sections = (response.body as { sections: Array<{ evidenceStatus: string }> }).sections;
      expect(sections).toHaveLength(4);
      expect(sections.every((section) => section.evidenceStatus === 'UNAVAILABLE_NO_SOURCE')).toBe(true);
    }

    await request(http)
      .get('/v1/audit/events')
      .set('Authorization', `Bearer ${platformAdminToken}`)
      .expect(200);
  });
});
