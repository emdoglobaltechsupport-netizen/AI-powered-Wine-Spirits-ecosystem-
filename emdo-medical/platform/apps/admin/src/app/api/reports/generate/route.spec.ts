import { createSessionCookie } from '../../../../lib/session';
import { POST } from './route';

jest.mock('next/headers', () => ({
  cookies: jest.fn(async () => ({
    get: (name: string) => name === 'emdo_admin_session'
      ? { value: (globalThis as TestGlobal).__EMDO_TEST_COOKIE__ }
      : undefined,
  })),
}));

type TestGlobal = typeof globalThis & { __EMDO_TEST_COOKIE__?: string };

const originalFetch = global.fetch;
const originalSecret = process.env.ADMIN_SESSION_SECRET;
const originalBase = process.env.INSIGHT_API_BASE_URL;

function jwt(roles: string[]): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    sub: '00000000-0000-4000-8000-000000000001',
    tenantId: '00000000-0000-4000-8000-000000000002',
    countryCode: 'SANDBOX',
    roles,
    exp: Math.floor(Date.now() / 1000) + 900,
  })).toString('base64url');
  return `${header}.${payload}.signature`;
}

function request(body: unknown): Request {
  return new Request('http://localhost/api/reports/generate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function reportPayload(): Record<string, unknown> {
  return {
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
  };
}

describe('Portal report-generation route', () => {
  beforeEach(() => {
    process.env.ADMIN_SESSION_SECRET = 'local-test-secret-at-least-32-characters';
    process.env.INSIGHT_API_BASE_URL = 'http://127.0.0.1:3000';
    (globalThis as TestGlobal).__EMDO_TEST_COOKIE__ = createSessionCookie(jwt(['super_admin']));
    global.fetch = jest.fn().mockResolvedValue(new Response(JSON.stringify(reportPayload()), {
      status: 201,
      headers: { 'content-type': 'application/json' },
    }));
  });

  afterAll(() => {
    global.fetch = originalFetch;
    if (originalSecret === undefined) delete process.env.ADMIN_SESSION_SECRET;
    else process.env.ADMIN_SESSION_SECRET = originalSecret;
    if (originalBase === undefined) delete process.env.INSIGHT_API_BASE_URL;
    else process.env.INSIGHT_API_BASE_URL = originalBase;
  });

  it('requires a signed session before calling the API', async () => {
    delete (globalThis as TestGlobal).__EMDO_TEST_COOKIE__;
    const response = await POST(request({
      reportId: 'revenue_profitability',
      cadence: 'monthly',
      period: '2026-11',
    }));
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: { code: 'AUTH_REQUIRED' } });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('rejects invalid cadence and period without calling the API', async () => {
    const response = await POST(request({
      reportId: 'revenue_profitability',
      cadence: 'hourly',
      period: '2026-11',
    }));
    expect(response.status).toBe(400);
    expect((await response.json() as { error: { code: string } }).error.code)
      .toBe('INVALID_INSIGHT_CADENCE');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('returns only sanitized aggregate report content', async () => {
    const response = await POST(request({
      reportId: 'revenue_profitability',
      cadence: 'monthly',
      period: '2026-11',
    }));
    expect(response.status).toBe(200);
    const body = await response.json() as { report: Record<string, unknown> };
    expect(body.report.finalDecisionAuthority).toBe('CEO / Super Admin');
    expect(JSON.stringify(body)).not.toContain('secret');
    expect(JSON.stringify(body)).not.toContain('accessToken');
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://127.0.0.1:3000/v1/insight/reports/generate');
    const headers = new Headers(init.headers);
    expect(headers.get('authorization')).toMatch(/^Bearer /);
  });
});
