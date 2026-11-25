import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { AI_LABELS } from '@emdo/shared';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { DatabaseService } from '../src/database/database.service';
import { CountryProfileService } from '../src/config/country-profile.service';
import { IdentityService } from '../src/identity/identity.service';

describe('EMDO Assist: offline AI foundation (e2e, real PostgreSQL)', () => {
  let app: INestApplication;
  let http: ReturnType<INestApplication['getHttpServer']>;
  let identities: IdentityService;

  const suffix = randomUUID().slice(0, 8);
  const email = (name: string) => `${name}-${suffix}@emdo.invalid`;
  const password = 'ValidTestPassword2026!';
  const promptSentinel = `PROMPT_MUST_NOT_BE_STORED_${suffix}`;

  let patient: { userId: string; tenantId: string; token: string };
  let secondPatient: { userId: string; tenantId: string; token: string };
  let clinician: { userId: string; token: string };
  let secondClinician: { userId: string; token: string };
  let support: { userId: string; token: string };
  let adminToken: string;
  let recordId: string;

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
      `TRUNCATE audit_events, ai_escalations, ai_interactions, appointments, provider_slots,
        verification_events, provider_credentials, approval_requests, provider_profiles,
        consent_grants, clinical_records, refresh_tokens, user_roles, users RESTART IDENTITY CASCADE`,
      [],
      { isSystem: true },
    );
    http = app.getHttpServer();

    patient = await registerPatient('ai-patient');
    secondPatient = await registerPatient('ai-second-patient');
    clinician = await createStaff('ai-clinician', ['clinician']);
    secondClinician = await createStaff('ai-second-clinician', ['clinician']);
    support = await createStaff('ai-support', ['support']);
    await createStaff('ai-admin', ['platform_admin']);
    adminToken = await login('ai-admin');
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

  async function createStaff(name: string, roles: Array<'clinician' | 'support' | 'platform_admin'>) {
    const staff = await identities.createStaff({
      identifier: email(name), password, countryCode: 'SANDBOX', roles,
    });
    return { userId: staff.userId, token: await login(name) };
  }

  it('registers all ten agents, exposes only reviewed prompts and blocks disabled agents', async () => {
    const agents = await request(http)
      .get('/v1/ai/agents')
      .set('Authorization', `Bearer ${patient.token}`)
      .expect(200);
    const definitions = agents.body as Array<{ id: string; state: string; dataDomain: string }>;
    expect(definitions).toHaveLength(10);
    expect(definitions.filter((agent) => agent.state === 'enabled').map((agent) => agent.id).sort()).toEqual([
      'doctor_documentation', 'patient_assistant',
    ]);
    expect(definitions.filter((agent) => agent.dataDomain === 'commercial').every((agent) => agent.state === 'disabled')).toBe(true);

    await request(http)
      .get('/v1/ai/prompts')
      .set('Authorization', `Bearer ${patient.token}`)
      .expect(403);

    const prompts = await request(http)
      .get('/v1/ai/prompts')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect((prompts.body as Array<{ reviewed: boolean }>).every((prompt) => prompt.reviewed)).toBe(true);

    await request(http)
      .post('/v1/ai/ask')
      .set('Authorization', `Bearer ${patient.token}`)
      .send({ agentId: 'marketing', capability: 'campaign_draft', prompt: promptSentinel })
      .expect(403)
      .expect((res) => expect(res.body.error.code).toBe('AI_AGENT_DISABLED'));

    await request(http)
      .post('/v1/ai/ask')
      .set('Authorization', `Bearer ${patient.token}`)
      .send({ agentId: 'doctor_documentation', capability: 'draft_documentation_outline', prompt: promptSentinel })
      .expect(403)
      .expect((res) => expect(res.body.error.code).toBe('AI_ROLE_NOT_ALLOWED'));
  });

  it('answers from record metadata only for the authenticated patient', async () => {
    const general = await request(http)
      .post('/v1/ai/ask')
      .set('Authorization', `Bearer ${patient.token}`)
      .send({ agentId: 'patient_assistant', capability: 'general_information', prompt: promptSentinel })
      .expect(201);
    const generalBody = general.body as { label: string; text: string; sources: unknown[]; outcome: string };
    expect(generalBody.label).toBe(AI_LABELS.nonClinical);
    expect(generalBody.outcome).toBe('answered');
    expect(generalBody.sources).toEqual([]);
    expect(generalBody.text).not.toContain(promptSentinel);

    const record = await request(http)
      .post('/v1/records')
      .set('Authorization', `Bearer ${patient.token}`)
      .send({
        resource: {
          resourceType: 'Observation',
          id: `ai-observation-${suffix}`,
          meta: { versionId: '1' },
          subject: { reference: `Patient/${patient.userId}` },
          status: 'final',
          code: { text: 'heart rate' },
          valueQuantity: { value: 72, unit: '/min' },
        },
      })
      .expect(201);
    recordId = (record.body as { id: string }).id;

    const explained = await request(http)
      .post('/v1/ai/ask')
      .set('Authorization', `Bearer ${patient.token}`)
      .send({
        agentId: 'patient_assistant',
        capability: 'explain_authorised_record',
        prompt: promptSentinel,
        patientId: patient.userId,
      })
      .expect(201);
    const explainedBody = explained.body as {
      label: string; text: string; sourceCount: number;
      sources: Array<{ id: string; version: number; resourceType: string }>;
    };
    expect(explainedBody.label).toBe(AI_LABELS.nonClinical);
    expect(explainedBody.sourceCount).toBeGreaterThanOrEqual(1);
    expect(explainedBody.sources.some((source) => source.id === recordId && source.resourceType === 'Observation')).toBe(true);
    expect(explainedBody.text).toContain(AI_LABELS.nonClinical);
    expect(explainedBody.text).toContain('Observation');
    expect(explainedBody.text).not.toContain('heart rate');
    expect(explainedBody.text).not.toContain(promptSentinel);

    await request(http)
      .post('/v1/ai/ask')
      .set('Authorization', `Bearer ${patient.token}`)
      .send({
        agentId: 'patient_assistant', capability: 'explain_authorised_record',
        prompt: promptSentinel, patientId: secondPatient.userId,
      })
      .expect(403)
      .expect((res) => expect(res.body.error.code).toBe('AI_PATIENT_MISMATCH'));

    const audit = await request(http)
      .get(`/v1/audit/events?tenantId=${patient.tenantId}&limit=200`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const events = audit.body as Array<{ action: string; metadata: Record<string, unknown> }>;
    const interactions = events.filter((event) => event.action === 'AI_INTERACTION');
    expect(interactions.map((event) => event.metadata['outcome'])).toEqual(expect.arrayContaining(['answered', 'blocked']));
    expect(JSON.stringify(events)).not.toContain(promptSentinel);
  });

  it('requires active consent and a named second approver for clinician drafts', async () => {
    await request(http)
      .post('/v1/ai/ask')
      .set('Authorization', `Bearer ${clinician.token}`)
      .send({
        agentId: 'doctor_documentation', capability: 'draft_documentation_outline',
        prompt: promptSentinel, patientId: patient.userId,
      })
      .expect(403)
      .expect((res) => expect(res.body.error.code).toBe('AI_CONSENT_REQUIRED'));

    await request(http)
      .post('/v1/consents')
      .set('Authorization', `Bearer ${patient.token}`)
      .send({
        granteeUserId: clinician.userId,
        purpose: 'consultation',
        scope: { resourceTypes: ['Observation'] },
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      })
      .expect(201);

    const draft = await request(http)
      .post('/v1/ai/ask')
      .set('Authorization', `Bearer ${clinician.token}`)
      .send({
        agentId: 'doctor_documentation', capability: 'draft_documentation_outline',
        prompt: promptSentinel, patientId: patient.userId,
      })
      .expect(201);
    const draftBody = draft.body as {
      label: string; text: string; sourceCount: number;
      requiresReview: boolean; humanApprovalRequired: boolean;
    };
    expect(draftBody.label).toBe(AI_LABELS.draftReview);
    expect(draftBody.sourceCount).toBeGreaterThanOrEqual(1);
    expect(draftBody.requiresReview).toBe(true);
    expect(draftBody.humanApprovalRequired).toBe(true);
    expect(draftBody.text).toContain('DRAFT DOCUMENTATION OUTLINE');
    expect(draftBody.text).not.toContain('heart rate');
    expect(draftBody.text).not.toContain(promptSentinel);

    const workflow = await request(http)
      .post('/v1/ai/workflows')
      .set('Authorization', `Bearer ${clinician.token}`)
      .send({
        agentId: 'doctor_documentation',
        capability: 'draft_documentation_outline',
        patientId: patient.userId,
        action: 'AI_DRAFT_REVIEW',
        reasonCode: 'documentation_review',
      })
      .expect(201);
    const approvalId = (workflow.body as { approvalId: string }).approvalId;
    expect(approvalId).toBeTruthy();
    expect((workflow.body as { executed: boolean }).executed).toBe(false);

    await request(http)
      .post(`/v1/ai/approvals/${approvalId}/decision`)
      .set('Authorization', `Bearer ${clinician.token}`)
      .send({ decision: 'approved', reasonCode: 'documentation_review' })
      .expect(403)
      .expect((res) => expect(res.body.error.code).toBe('APPROVAL_SAME_ACTOR_NOT_ALLOWED'));

    const decided = await request(http)
      .post(`/v1/ai/approvals/${approvalId}/decision`)
      .set('Authorization', `Bearer ${secondClinician.token}`)
      .send({ decision: 'approved', reasonCode: 'documentation_review' })
      .expect(200);
    expect(decided.body).toMatchObject({
      approvalId, decision: 'approved', executed: false,
      note: 'HUMAN_APPROVAL_RECORDED_NO_AUTONOMOUS_ACTION',
    });
  });

  it('escalates to a named human and reports API-only metrics', async () => {
    const escalation = await request(http)
      .post('/v1/ai/escalations')
      .set('Authorization', `Bearer ${patient.token}`)
      .send({ agentId: 'patient_assistant', reasonCode: 'patient_request', assignedRole: 'support' })
      .expect(201);
    const escalationId = (escalation.body as { id: string }).id;
    expect(escalationId).toBeTruthy();

    const owned = await request(http)
      .get('/v1/ai/escalations')
      .set('Authorization', `Bearer ${patient.token}`)
      .expect(200);
    expect((owned.body as Array<{ id: string }>).some((item) => item.id === escalationId)).toBe(true);

    const assigned = await request(http)
      .get('/v1/ai/escalations')
      .set('Authorization', `Bearer ${support.token}`)
      .expect(200);
    expect((assigned.body as Array<{ id: string }>).some((item) => item.id === escalationId)).toBe(true);

    await request(http)
      .post(`/v1/ai/escalations/${escalationId}/resolve`)
      .set('Authorization', `Bearer ${support.token}`)
      .send({ outcomeCode: 'information_provided' })
      .expect(200)
      .expect((res) => expect(res.body.status).toBe('resolved'));

    const metrics = await request(http)
      .get('/v1/ai/metrics')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const body = metrics.body as {
      totalInteractions: number; byAgent: Record<string, number>;
      byOutcome: Record<string, number>; pendingApprovals: number; openEscalations: number;
    };
    expect(body.totalInteractions).toBeGreaterThan(0);
    expect(body.byAgent['patient_assistant']).toBeGreaterThan(0);
    expect(body.byAgent['doctor_documentation']).toBeGreaterThan(0);
    expect(body.byOutcome['answered']).toBeGreaterThan(0);
    expect(body.byOutcome['blocked']).toBeGreaterThan(0);
    expect(body.byOutcome['approval_requested']).toBeGreaterThan(0);
    expect(body.byOutcome['escalated']).toBeGreaterThan(0);
    expect(body.pendingApprovals).toBe(0);
    expect(body.openEscalations).toBe(0);

    await request(http)
      .get('/v1/ai/metrics')
      .set('Authorization', `Bearer ${patient.token}`)
      .expect(403);

    const audit = await request(http)
      .get('/v1/audit/events?limit=200')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const actions = (audit.body as Array<{ action: string }>).map((event) => event.action);
    expect(actions).toEqual(expect.arrayContaining([
      'AI_INTERACTION', 'AI_WORKFLOW_REQUESTED', 'AI_APPROVAL_DECIDED',
      'AI_ESCALATION_CREATED', 'AI_ESCALATION_RESOLVED',
    ]));
    expect(JSON.stringify(audit.body)).not.toContain(promptSentinel);
    expect(JSON.stringify(audit.body)).not.toContain('heart rate');
  });
});
