import { sanitizeAuditMetadata } from './audit-sanitizer';

describe('sanitizeAuditMetadata', () => {
  it('drops unknown keys and redacts identifiers', () => {
    const result = sanitizeAuditMetadata({
      resourceType: 'Observation',
      secret: 'must-not-appear',
      email: 'patient@example.com',
      note: 'call +254712345678 now',
      version: 2,
    });
    expect(result).toEqual({ resourceType: 'Observation', version: 2 });
    expect(JSON.stringify(result)).not.toContain('must-not-appear');
    expect(JSON.stringify(result)).not.toContain('patient@example.com');

    const reason = sanitizeAuditMetadata({ reason: 'call +254712345678 now' });
    expect(reason).toEqual({ reason: 'call [redacted] now' });
  });

  it('handles non-object input', () => {
    expect(sanitizeAuditMetadata('PHI')).toEqual({});
  });

  it('allows only safe AI telemetry keys and never a prompt body', () => {
    const result = sanitizeAuditMetadata({
      agentId: 'patient_assistant',
      capability: 'general_information',
      outcome: 'answered',
      sourceCount: 0,
      prompt: 'my chest hurts',
      text: 'never store generated clinical text',
    });
    expect(result).toEqual({
      agentId: 'patient_assistant',
      capability: 'general_information',
      outcome: 'answered',
      sourceCount: 0,
    });
    expect(JSON.stringify(result)).not.toContain('chest');
    expect(JSON.stringify(result)).not.toContain('never store');
  });

  it('allows only safe M10 aggregate-report keys and never report content', () => {
    const result = sanitizeAuditMetadata({
      reportId: 'business_performance',
      cadence: 'daily',
      period: '2026-11-25',
      countryCode: 'SANDBOX',
      reportGroup: 'executive',
      metricCount: 7,
      suppressed: true,
      sourceStatus: 'NO_SOURCE',
      evidenceStatus: 'UNAVAILABLE_NO_SOURCE',
      patientIdentifier: 'patient-123',
      summary: 'revenue is low',
    });
    expect(result).toEqual({
      reportId: 'business_performance',
      cadence: 'daily',
      period: '2026-11-25',
      countryCode: 'SANDBOX',
      reportGroup: 'executive',
      metricCount: 7,
      suppressed: true,
      sourceStatus: 'NO_SOURCE',
      evidenceStatus: 'UNAVAILABLE_NO_SOURCE',
    });
    expect(JSON.stringify(result)).not.toContain('patient-123');
    expect(JSON.stringify(result)).not.toContain('revenue is low');
  });
});
