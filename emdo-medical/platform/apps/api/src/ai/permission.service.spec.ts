import { AI_LABELS, type Role } from '@emdo/shared';
import { CountryProfileService } from '../config/country-profile.service';
import { RequestContext } from '../common/auth/request-context';
import { getAgent, type AgentDefinition } from './agent-registry';
import { AiPermissionService } from './permission.service';

const profiles = { assertUsable: jest.fn() } as unknown as CountryProfileService;

const ctx = (roles: Role[], userId = '11111111-1111-4111-8111-111111111111'): RequestContext => ({
  userId,
  tenantId: '22222222-2222-4222-8222-222222222222',
  countryCode: 'SANDBOX',
  roles,
  assurance: 1,
  authTime: Math.floor(Date.now() / 1000),
  jti: 'test-jti',
  isPlatform: roles.includes('platform_admin'),
});

const commercialAgent: AgentDefinition = {
  id: 'marketing',
  name: 'Marketing AI',
  department: 'Marketing',
  state: 'enabled',
  dataDomain: 'commercial',
  allowedRoles: ['platform_admin'],
  capabilities: ['campaign_draft'],
  maxContextRecords: 0,
  label: AI_LABELS.operational,
  requiresHumanReview: true,
  dependency: 'test',
  notes: 'test',
};

describe('AiPermissionService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('checks country, state, capability and role before any model call', () => {
    const service = new AiPermissionService(profiles);
    expect(() => service.authorise(getAgent('patient_assistant'), 'general_information', ctx(['patient']))).not.toThrow();
    expect(profiles.assertUsable).toHaveBeenCalledWith('SANDBOX');
    expect(() => service.authorise(getAgent('clinic_operations'), 'operational_summary', ctx(['patient'])))
      .toThrow('AI_AGENT_DISABLED');
    expect(() => service.authorise(getAgent('patient_assistant'), 'general_information', ctx(['clinician'])))
      .toThrow('AI_ROLE_NOT_ALLOWED');
  });

  it('restricts own-record capability to the authenticated patient', () => {
    const service = new AiPermissionService(profiles);
    const agent = getAgent('patient_assistant');
    expect(() => service.authorise(agent, 'explain_authorised_record', ctx(['patient']), ctx(['patient']).userId)).not.toThrow();
    expect(() => service.authorise(agent, 'explain_authorised_record', ctx(['patient']))).toThrow('AI_PATIENT_REQUIRED');
    expect(() => service.authorise(agent, 'explain_authorised_record', ctx(['patient']), '33333333-3333-4333-8333-333333333333'))
      .toThrow('AI_PATIENT_MISMATCH');
  });

  it('separates commercial workloads from patient identifiers', () => {
    const service = new AiPermissionService(profiles);
    expect(() => service.authorise(commercialAgent, 'campaign_draft', ctx(['platform_admin']), ctx(['platform_admin']).userId))
      .toThrow('AI_DATA_DOMAIN_FORBIDDEN');
    expect(() => service.assertContextAllowed(commercialAgent, 'campaign_draft')).toThrow('AI_DATA_DOMAIN_FORBIDDEN');
  });

  it('denies context retrieval by default for agents with no data budget', () => {
    const service = new AiPermissionService(profiles);
    expect(() => service.assertContextAllowed(getAgent('customer_support'), 'non_clinical_faq')).not.toThrow();
    expect(() => service.assertContextAllowed(getAgent('customer_support'), 'explain_authorised_record'))
      .toThrow('AI_DATA_DOMAIN_FORBIDDEN');
  });
});
