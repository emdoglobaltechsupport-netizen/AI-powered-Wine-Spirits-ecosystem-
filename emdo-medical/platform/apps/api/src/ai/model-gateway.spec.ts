import { ConfigService } from '@nestjs/config';
import { AI_LABELS } from '@emdo/shared';
import { ModelGateway, type GatewayContext } from './model-gateway';
import { resolvePrompt } from './prompt-registry';

const context: GatewayContext = {
  recordCount: 1,
  resourceTypes: ['Observation'],
  sources: [{
    kind: 'clinical_record',
    id: '33333333-3333-4333-8333-333333333333',
    version: 2,
    resourceType: 'Observation',
  }],
};

function gateway(backend = 'offline', nodeEnv = 'test'): ModelGateway {
  const config = {
    get: jest.fn((key: string) => key === 'aiModelBackend' ? backend : nodeEnv),
  } as unknown as ConfigService;
  return new ModelGateway(config);
}

describe('ModelGateway (offline prototype)', () => {
  it('returns labelled, source-attributed text without a network call', async () => {
    const response = await gateway().generate({
      prompt: resolvePrompt('patient_assistant', 'explain_authorised_record'),
      agentId: 'patient_assistant',
      capability: 'explain_authorised_record',
      label: AI_LABELS.nonClinical,
      context,
    });

    expect(response.label).toBe(AI_LABELS.nonClinical);
    expect(response.sources).toEqual(context.sources);
    expect(response.text).toContain('1 authorised record');
    expect(response.text).toContain('Observation');
    expect(response.text).toContain(AI_LABELS.nonClinical);
    expect(response.text).not.toContain('heart rate');
    expect(response.model).toBe('emdo-offline-policy-gateway');
  });

  it('marks drafts as requiring clinician review', async () => {
    const response = await gateway().generate({
      prompt: resolvePrompt('doctor_documentation', 'draft_documentation_outline'),
      agentId: 'doctor_documentation',
      capability: 'draft_documentation_outline',
      label: AI_LABELS.draftReview,
      context,
    });
    expect(response.requiresReview).toBe(true);
    expect(response.label).toBe(AI_LABELS.draftReview);
    expect(response.text).toContain('DRAFT DOCUMENTATION OUTLINE');
  });

  it('fails closed for any non-offline or production configuration', async () => {
    const request = {
      prompt: resolvePrompt('patient_assistant', 'general_information'),
      agentId: 'patient_assistant',
      capability: 'general_information',
      label: AI_LABELS.nonClinical,
      context,
    };
    await expect(gateway('hosted').generate(request)).rejects.toThrow('AI_MODEL_BACKEND_NOT_CONFIGURED');
    await expect(gateway('offline', 'production').generate(request)).rejects.toThrow('AI_MODEL_BACKEND_NOT_CONFIGURED');
  });
});
