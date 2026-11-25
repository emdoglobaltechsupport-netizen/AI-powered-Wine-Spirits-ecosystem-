import {
  sanitizeMetricDefinition,
  sanitizeMetricValue,
  sanitizeReport,
  sanitizeReportDefinition,
} from './sanitize';

function rawValue(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    metricId: 'M10-M011',
    metricVersion: '1.0.0',
    name: 'AI agent activity',
    group: 'ai_activity',
    evidenceStatus: 'AVAILABLE_TESTED',
    sourceStatus: 'AVAILABLE',
    countryCode: 'SANDBOX',
    generatedAt: '2026-11-25T12:00:00.000Z',
    value: 12,
    suppressed: false,
    dimensions: { agentId: 'patient_assistant', capability: 'general_information', outcome: 'answered' },
    caveat: 'Aggregate telemetry only',
    ...overrides,
  };
}

describe('Portal aggregate sanitizers', () => {
  it('copies only allowlisted metric fields and drops injected PHI keys', () => {
    const result = sanitizeMetricValue(rawValue({
      patientId: 'patient-123',
      prompt: 'my chest hurts',
      dimensions: {
        agentId: 'patient_assistant',
        patientId: 'patient-123',
        capability: 'general_information',
      },
    }));
    expect(result.dimensions).toEqual({
      agentId: 'patient_assistant',
      capability: 'general_information',
    });
    expect(JSON.stringify(result)).not.toContain('patient-123');
    expect(JSON.stringify(result)).not.toContain('my chest hurts');
  });

  it('refuses to render unavailable or suppressed cells with invented numbers', () => {
    expect(() => sanitizeMetricValue(rawValue({
      evidenceStatus: 'UNAVAILABLE_NO_SOURCE',
      sourceStatus: 'NO_SOURCE',
      value: 999,
    }))).toThrow('UNAVAILABLE_VALUE_MUST_BE_NULL');
    expect(() => sanitizeMetricValue(rawValue({ suppressed: true, value: 9 })))
      .toThrow('SUPPRESSED_VALUE_MUST_BE_NULL');
    expect(sanitizeMetricValue(rawValue({
      evidenceStatus: 'UNAVAILABLE_NO_SOURCE',
      sourceStatus: 'NO_SOURCE',
      value: null,
      missingSource: 'No ledger',
    })).value).toBeNull();
  });

  it('sanitizes definitions and reports without copying unknown fields', () => {
    const definition = sanitizeMetricDefinition({
      id: 'M10-M006',
      version: '1.0.0',
      name: 'Subscription revenue',
      group: 'finance',
      ownerRole: 'finance_manager',
      formula: 'Recognised subscription revenue',
      evidenceStatus: 'UNAVAILABLE_NO_SOURCE',
      sourceStatus: 'NO_SOURCE',
      missingSource: 'No ledger',
      secretInternalNote: 'do not render',
    });
    expect(JSON.stringify(definition)).not.toContain('secretInternalNote');

    const reportDefinition = sanitizeReportDefinition({
      id: 'revenue_profitability',
      title: 'Revenue and profitability',
      group: 'finance',
      metricIds: ['M10-M006'],
      cadences: ['daily', 'weekly', 'monthly'],
      internalOwner: 'do not render',
    });
    expect(JSON.stringify(reportDefinition)).not.toContain('internalOwner');

    const report = sanitizeReport({
      reportId: 'revenue_profitability',
      title: 'Revenue and profitability',
      cadence: 'monthly',
      period: '2026-11',
      countryCode: 'ALL',
      generatedAt: '2026-11-25T12:00:00.000Z',
      note: 'Decision support only',
      finalDecisionAuthority: 'CEO / Super Admin',
      sections: [{
        metricId: 'M10-M006',
        metricVersion: '1.0.0',
        name: 'Subscription revenue',
        group: 'finance',
        evidenceStatus: 'UNAVAILABLE_NO_SOURCE',
        sourceStatus: 'NO_SOURCE',
        values: [rawValue({
          metricId: 'M10-M006',
          group: 'finance',
          evidenceStatus: 'UNAVAILABLE_NO_SOURCE',
          sourceStatus: 'NO_SOURCE',
          value: null,
          dimensions: undefined,
          caveat: undefined,
          missingSource: 'No ledger',
        })],
      }],
      patientSummary: 'do not render',
    });
    expect(report.sections[0]?.values[0]?.value).toBeNull();
    expect(JSON.stringify(report)).not.toContain('patientSummary');
  });
});
