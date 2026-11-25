import type { PortalSession } from './contracts';
import {
  assertGenerateReportInput,
  fetchMetricDefinitions,
  fetchMetricValues,
  fetchReportDefinitions,
  generateReport,
  loginWithApi,
} from './api';

const originalFetch = global.fetch;
const originalBase = process.env.INSIGHT_API_BASE_URL;

const session: PortalSession = {
  accessToken: 'header.payload.signature',
  userId: '00000000-0000-4000-8000-000000000001',
  countryCode: 'SANDBOX',
  roles: ['super_admin'],
  expiresAt: Math.floor(Date.now() / 1000) + 900,
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('Insight API client boundary', () => {
  beforeEach(() => {
    process.env.INSIGHT_API_BASE_URL = 'http://127.0.0.1:3000';
    global.fetch = jest.fn();
  });

  afterAll(() => {
    global.fetch = originalFetch;
    if (originalBase === undefined) delete process.env.INSIGHT_API_BASE_URL;
    else process.env.INSIGHT_API_BASE_URL = originalBase;
  });

  it('sends the bearer token server-side and sanitizes metric definitions', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(json([{
      id: 'M10-M006',
      version: '1.0.0',
      name: 'Subscription revenue',
      group: 'finance',
      ownerRole: 'finance_manager',
      formula: 'Recognised subscription revenue',
      evidenceStatus: 'UNAVAILABLE_NO_SOURCE',
      sourceStatus: 'NO_SOURCE',
      missingSource: 'No ledger',
      patientName: 'should not survive',
    }]));
    const definitions = await fetchMetricDefinitions(session);
    expect(definitions[0]?.id).toBe('M10-M006');
    expect(JSON.stringify(definitions)).not.toContain('should not survive');
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://127.0.0.1:3000/v1/insight/metrics');
    const headers = new Headers(init.headers);
    expect(headers.get('authorization')).toBe(`Bearer ${session.accessToken}`);
  });

  it('validates metric IDs before any request and sanitizes aggregate values', async () => {
    await expect(fetchMetricValues(session, '../../records')).rejects.toMatchObject({
      code: 'INSIGHT_METRIC_NOT_FOUND',
    });
    expect(global.fetch).not.toHaveBeenCalled();

    (global.fetch as jest.Mock).mockResolvedValue(json([{
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
      dimensions: { agentId: 'patient_assistant', outcome: 'answered', prompt: 'do not render' },
    }]));
    const values = await fetchMetricValues(session, 'M10-M011');
    expect(values[0]?.value).toBe(12);
    expect(JSON.stringify(values)).not.toContain('do not render');
  });

  it('maps API errors to safe codes without forwarding messages', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(json({
      error: { code: 'INSIGHT_REPORT_GROUP_FORBIDDEN', message: 'patient-123 chest pain' },
    }, 403));
    await expect(fetchReportDefinitions(session)).rejects.toMatchObject({
      status: 403,
      code: 'INSIGHT_REPORT_GROUP_FORBIDDEN',
      message: 'INSIGHT_REPORT_GROUP_FORBIDDEN',
    });
  });

  it('rejects invalid report input without calling the API', async () => {
    expect(() => assertGenerateReportInput({
      reportId: 'business_performance',
      cadence: 'hourly',
      period: '2026-11',
    })).toThrow('INVALID_INSIGHT_CADENCE');
    await expect(generateReport(session, {
      reportId: 'business_performance',
      cadence: 'daily',
      period: '../../etc/passwd',
    })).rejects.toMatchObject({ status: 400, code: 'VALIDATION_ERROR' });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('generates a sanitized report through the internal server route payload', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(json({
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
        values: [{
          metricId: 'M10-M006',
          metricVersion: '1.0.0',
          name: 'Subscription revenue',
          group: 'finance',
          evidenceStatus: 'UNAVAILABLE_NO_SOURCE',
          sourceStatus: 'NO_SOURCE',
          countryCode: 'ALL',
          generatedAt: '2026-11-25T12:00:00.000Z',
          value: null,
          suppressed: false,
          missingSource: 'No billing ledger',
        }],
      }],
      confidentialLedgerRow: 'do not render',
    }));
    const report = await generateReport(session, {
      reportId: 'revenue_profitability',
      cadence: 'monthly',
      period: '2026-11',
    });
    expect(report.finalDecisionAuthority).toBe('CEO / Super Admin');
    expect(report.sections[0]?.values[0]?.value).toBeNull();
    expect(JSON.stringify(report)).not.toContain('confidentialLedgerRow');
    const [, init] = (global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toEqual({
      reportId: 'revenue_profitability',
      cadence: 'monthly',
      period: '2026-11',
    });
  });

  it('discards refresh tokens at login', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(json({
      accessToken: 'header.payload.signature',
      refreshToken: 'must-not-be-held-by-portal',
      tokenType: 'Bearer',
      expiresIn: 900,
    }));
    const issued = await loginWithApi('admin@example.invalid', 'ValidTestPassword2026!');
    expect(issued).toEqual({ accessToken: 'header.payload.signature', expiresIn: 900 });
    expect(JSON.stringify(issued)).not.toContain('must-not-be-held-by-portal');
  });
});
