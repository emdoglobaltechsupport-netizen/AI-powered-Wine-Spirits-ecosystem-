import { validateFhirResource, assertNoAutomatedSignature } from './fhir';

describe('FHIR compatibility validation', () => {
  const valid = {
    resourceType: 'Observation',
    id: 'obs-1',
    meta: { versionId: '1' },
    subject: { reference: 'Patient/patient-1' },
    status: 'final',
    code: { text: 'heart rate' },
  };

  it('accepts a supported resource', () => {
    expect(validateFhirResource(valid).valid).toBe(true);
  });

  it('rejects unsupported resource types', () => {
    expect(validateFhirResource({ ...valid, resourceType: 'AIClaim' }).valid).toBe(false);
  });

  it('requires a patient subject reference', () => {
    expect(validateFhirResource({ ...valid, subject: { reference: 'Device/1' } }).valid).toBe(false);
  });

  it('rejects an AI principal as clinical author', () => {
    expect(assertNoAutomatedSignature({ author: [{ reference: 'AI/model-1' }] }).valid).toBe(false);
  });
});
