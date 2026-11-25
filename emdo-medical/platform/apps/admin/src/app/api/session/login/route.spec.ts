import { InsightApiError, loginWithApi } from '../../../../lib/api';
import { POST } from './route';

jest.mock('../../../../lib/api', () => {
  const actual = jest.requireActual('../../../../lib/api');
  return { ...actual, loginWithApi: jest.fn() };
});

const originalSecret = process.env.ADMIN_SESSION_SECRET;

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

function request(): Request {
  return new Request('http://localhost/api/session/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      identifier: 'admin@example.invalid',
      password: 'ValidTestPassword2026!',
    }),
  });
}

describe('Portal login route', () => {
  beforeEach(() => {
    process.env.ADMIN_SESSION_SECRET = 'local-test-secret-at-least-32-characters';
    (loginWithApi as jest.Mock).mockReset();
  });

  afterAll(() => {
    if (originalSecret === undefined) delete process.env.ADMIN_SESSION_SECRET;
    else process.env.ADMIN_SESSION_SECRET = originalSecret;
  });

  it('sets an HTTP-only signed session and never returns tokens in the body', async () => {
    (loginWithApi as jest.Mock).mockResolvedValue({
      accessToken: jwt(['super_admin']),
      expiresIn: 900,
    });
    const response = await POST(request());
    expect(response.status).toBe(200);
    const body = await response.json() as Record<string, unknown>;
    expect(body).toEqual({ ok: true, roles: ['super_admin'], countryCode: 'SANDBOX' });
    expect(JSON.stringify(body)).not.toContain('accessToken');
    expect(JSON.stringify(body)).not.toContain('refreshToken');
    const cookie = response.headers.get('set-cookie') ?? '';
    expect(cookie).toContain('HttpOnly');
    expect(cookie.toLowerCase()).toContain('samesite=lax');
    expect(cookie).toContain('emdo_admin_session=');
  });

  it('refuses a non-administrative role before issuing any session', async () => {
    (loginWithApi as jest.Mock).mockResolvedValue({
      accessToken: jwt(['patient']),
      expiresIn: 900,
    });
    const response = await POST(request());
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: { code: 'PORTAL_ROLE_FORBIDDEN' } });
  });

  it('maps upstream credential errors without forwarding details', async () => {
    (loginWithApi as jest.Mock).mockRejectedValue(
      new InsightApiError(401, 'INVALID_CREDENTIALS'),
    );
    const response = await POST(request());
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: { code: 'INVALID_CREDENTIALS' } });
  });
});
