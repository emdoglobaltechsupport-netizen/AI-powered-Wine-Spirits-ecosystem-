import { INSIGHT_REPORT_GROUPS, type Role } from '@emdo/shared';
import type { PortalSession } from './contracts';
import {
  createSessionCookie,
  hasPortalAccess,
  portalCountryScope,
  readSessionCookie,
  sessionSecret,
  visibleInsightGroups,
} from './session';

const originalSecret = process.env.ADMIN_SESSION_SECRET;

function jwt(roles: Role[], countryCode = 'SANDBOX', exp = Math.floor(Date.now() / 1000) + 900): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    sub: '00000000-0000-4000-8000-000000000001',
    tenantId: '00000000-0000-4000-8000-000000000002',
    countryCode,
    roles,
    exp,
  })).toString('base64url');
  return `${header}.${payload}.signature`;
}

function session(roles: Role[], countryCode = 'SANDBOX'): PortalSession {
  return {
    accessToken: jwt(roles, countryCode),
    userId: '00000000-0000-4000-8000-000000000001',
    countryCode,
    roles,
    expiresAt: Math.floor(Date.now() / 1000) + 900,
  };
}

describe('Super Admin session boundary', () => {
  beforeEach(() => {
    process.env.ADMIN_SESSION_SECRET = 'local-test-secret-at-least-32-characters';
  });

  afterAll(() => {
    if (originalSecret === undefined) delete process.env.ADMIN_SESSION_SECRET;
    else process.env.ADMIN_SESSION_SECRET = originalSecret;
  });

  it('fails closed when no cookie-signing secret is configured', () => {
    delete process.env.ADMIN_SESSION_SECRET;
    expect(() => sessionSecret()).toThrow('ADMIN_SESSION_SECRET_NOT_CONFIGURED');
    expect(() => createSessionCookie(jwt(['super_admin'])))
      .toThrow('ADMIN_SESSION_SECRET_NOT_CONFIGURED');
  });

  it('round-trips a signed cookie without exposing the token in a response object', () => {
    const token = jwt(['super_admin']);
    const cookie = createSessionCookie(token, 900);
    const parsed = readSessionCookie(cookie);
    expect(parsed).toMatchObject({
      accessToken: token,
      countryCode: 'SANDBOX',
      roles: ['super_admin'],
      userId: '00000000-0000-4000-8000-000000000001',
    });
    expect(Object.keys(parsed ?? {})).toEqual([
      'accessToken', 'userId', 'countryCode', 'roles', 'expiresAt',
    ]);
  });

  it('rejects tampered, malformed and expired sessions', () => {
    const cookie = createSessionCookie(jwt(['super_admin']));
    expect(readSessionCookie(`${cookie.slice(0, -1)}X`)).toBeNull();
    expect(readSessionCookie('not-a-cookie')).toBeNull();
    expect(readSessionCookie(undefined)).toBeNull();
    const expired = createSessionCookie(jwt(['super_admin'], 'SANDBOX', 1), 60);
    expect(readSessionCookie(expired)).toBeNull();
  });

  it('filters unknown roles but keeps only the caller\'s real roles', () => {
    const mixed = readSessionCookie(
      createSessionCookie(jwt(['patient', 'finance_manager', 'not_a_role' as Role])),
    );
    expect(mixed?.roles).toEqual(['patient', 'finance_manager']);
    expect(visibleInsightGroups(mixed as PortalSession)).toEqual(['finance']);
    const patientOnly = readSessionCookie(createSessionCookie(jwt(['patient'])));
    expect(patientOnly?.roles).toEqual(['patient']);
    expect(hasPortalAccess(patientOnly as PortalSession)).toBe(false);
  });

  it('derives navigation groups and country scope from the canonical matrix', () => {
    expect(visibleInsightGroups(session(['finance_manager']))).toEqual(['finance']);
    expect(visibleInsightGroups(session(['super_admin']))).toEqual(INSIGHT_REPORT_GROUPS);
    expect(visibleInsightGroups(session(['platform_admin']))).toEqual(INSIGHT_REPORT_GROUPS);
    expect(hasPortalAccess(session(['patient']))).toBe(false);
    expect(hasPortalAccess(session(['marketing_manager']))).toBe(true);
    expect(portalCountryScope(session(['country_administrator']))).toBe('SANDBOX');
    expect(portalCountryScope(session(['super_admin']))).toBe('ALL');
  });
});
