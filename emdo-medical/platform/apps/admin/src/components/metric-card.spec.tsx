import { renderToStaticMarkup } from 'react-dom/server';
import type { SafeInsightMetricValue, SafeInsightReport } from '../lib/contracts';
import { MetricCard } from './metric-card';
import { ReportView } from './report-view';

const base = {
  metricVersion: '1.0.0',
  countryCode: 'ALL',
  generatedAt: '2026-11-25T12:00:00.000Z',
} as const;

describe('PHI-safe portal rendering', () => {
  it('renders unavailable evidence as explicit absence, never as zero', () => {
    const metric = {
      ...base,
      metricId: 'M10-M006',
      name: 'Subscription revenue',
      group: 'finance',
      evidenceStatus: 'UNAVAILABLE_NO_SOURCE',
      sourceStatus: 'NO_SOURCE',
      value: null,
      suppressed: false,
      missingSource: 'No billing ledger or subscription source module is implemented.',
    } as SafeInsightMetricValue;
    const html = renderToStaticMarkup(<MetricCard metric={metric} />);
    expect(html).toContain('Unavailable — no trusted source');
    expect(html).toContain('No value reported');
    expect(html).toContain('No billing ledger');
    expect(html).toContain('v1.0.0');
    expect(html).not.toContain('>0<');
  });

  it('renders suppressed cells as withheld', () => {
    const metric = {
      ...base,
      metricId: 'M10-M002',
      name: 'Verified doctors',
      group: 'clinical_capacity',
      evidenceStatus: 'AVAILABLE_WITH_CAVEAT',
      sourceStatus: 'AVAILABLE',
      value: null,
      suppressed: true,
      caveat: 'Manual-review verification is non-authoritative.',
    } as SafeInsightMetricValue;
    const html = renderToStaticMarkup(<MetricCard metric={metric} />);
    expect(html).toContain('Withheld — below minimum group size');
    expect(html).toContain('non-authoritative');
    expect(html).not.toContain('>0<');
  });

  it('renders only allowlisted aggregate dimensions', () => {
    const metric = {
      ...base,
      metricId: 'M10-M011',
      name: 'AI agent activity',
      group: 'ai_activity',
      evidenceStatus: 'AVAILABLE_TESTED',
      sourceStatus: 'AVAILABLE',
      value: 12,
      suppressed: false,
      dimensions: {
        agentId: 'patient_assistant',
        capability: 'general_information',
        outcome: 'answered',
      },
    } as SafeInsightMetricValue;
    const html = renderToStaticMarkup(<MetricCard metric={metric} />);
    expect(html).toContain('>12<');
    expect(html).toContain('patient_assistant');
    expect(html).toContain('general_information');
    expect(html).not.toContain('prompt');
  });

  it('labels decision support and final authority without executing an action', () => {
    const unavailableValue = {
      ...base,
      metricId: 'M10-M006',
      name: 'Subscription revenue',
      group: 'finance',
      evidenceStatus: 'UNAVAILABLE_NO_SOURCE',
      sourceStatus: 'NO_SOURCE',
      value: null,
      suppressed: false,
      missingSource: 'No ledger',
    } as SafeInsightMetricValue;
    const report = {
      reportId: 'revenue_profitability',
      title: 'Revenue and profitability',
      cadence: 'monthly',
      period: '2026-11',
      countryCode: 'ALL',
      generatedAt: base.generatedAt,
      note: 'Decision support only. Unavailable sections are evidence-backed gaps.',
      finalDecisionAuthority: 'CEO / Super Admin',
      sections: [{
        metricId: 'M10-M006',
        metricVersion: '1.0.0',
        name: 'Subscription revenue',
        group: 'finance',
        evidenceStatus: 'UNAVAILABLE_NO_SOURCE',
        sourceStatus: 'NO_SOURCE',
        values: [unavailableValue],
      }],
    } as SafeInsightReport;
    const html = renderToStaticMarkup(<ReportView report={report} />);
    expect(html).toContain('CEO / Super Admin');
    expect(html).toContain('decision support only');
    expect(html).toContain('Unavailable — no trusted source');
    expect(html).not.toContain('>0<');
    expect(html).not.toContain('approved');
  });
});
