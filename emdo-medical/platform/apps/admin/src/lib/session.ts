import { createHmac, timingSafeEqual } from 'node:crypto';
import {
  INSIGHT_REPORT_GROUPS,
  INSIGHT_ROLE_GROUPS,
  ROLES,
  type InsightReportGroup,
  type Role,
} from '@emdo/shared';
import type { PortalSession } from './contracts';

export const SESSION_COOKIE = 'emdo_admin_session';
const SESSION_VERSION = 1;
const DEFAULT_MAX_AGE = 900;

/** Read the cookie-signing secret. Absent configuration fails closed. */
export function sessionSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 32 || secret.startsWith('REPLACE_WITH')) {
    throw new Error('ADMIN_SESSION_SECRET_NOT_CONFIGURED');
  }
  return secret;
}

function base64UrlDecode(value: string): string {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(padded, 'base64').toString('utf8');
}

function sign(value: string): string {
  return createHmac('sha256', sessionSecret()).update(value).digest('base64url');
}

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

interface DecodedClaims {
  readonly sub?: unknown;
  readonly countryCode?: unknown;
  readonly roles?: unknown;
  readonly exp?: unknown;
}

function decodeClaims(token: string): DecodedClaims {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('MALFORMED_ACCESS_TOKEN');
  const parsed: unknown = JSON.parse(base64UrlDecode(parts[1] ?? ''));
  if (!parsed || typeof parsed !== 'object') throw new Error('MALFORMED_ACCESS_TOKEN');
  return parsed as DecodedClaims;
}

/** Sign a short-lived session. Only the access token is held by the portal. */
export function createSessionCookie(accessToken: string, maxAgeSeconds = DEFAULT_MAX_AGE): string {
  if (!accessToken || accessToken.split('.').length !== 3) {
    throw new Error('INVALID_ACCESS_TOKEN');
  }
  const maxAge = Math.min(Math.max(Math.trunc(maxAgeSeconds), 60), 86400);
  const exp = Math.floor(Date.now() / 1000) + maxAge;
  const body = Buffer.from(
    JSON.stringify({ v: SESSION_VERSION, token: accessToken, exp }),
    'utf8',
  ).toString('base64url');
  return `${body}.${sign(body)}`;
}

/** Verify the cookie signature and expiry, then extract navigation claims only. */
export function readSessionCookie(raw: string | undefined): PortalSession | null {
  if (!raw) return null;
  const parts = raw.split('.');
  if (parts.length !== 2) return null;
  const [body, signature] = parts as [string, string];
  if (!safeEqual(signature, sign(body))) return null;

  let payload: unknown;
  try {
    payload = JSON.parse(base64UrlDecode(body));
  } catch {
    return null;
  }
  if (!payload || typeof payload !== 'object') return null;
  const record = payload as { v?: unknown; token?: unknown; exp?: unknown };
  if (record.v !== SESSION_VERSION || typeof record.token !== 'string') return null;
  if (typeof record.exp !== 'number' || record.exp <= Math.floor(Date.now() / 1000)) return null;

  try {
    const claims = decodeClaims(record.token);
    if (typeof claims.exp === 'number' && claims.exp <= Math.floor(Date.now() / 1000)) return null;
    if (typeof claims.sub !== 'string' || !claims.sub) return null;
    if (typeof claims.countryCode !== 'string' || !/^[A-Z]{2,8}$/.test(claims.countryCode)) return null;
    const roles = Array.isArray(claims.roles)
      ? claims.roles.filter((role): role is Role => ROLES.includes(role as Role))
      : [];
    if (!roles.length) return null;
    return {
      accessToken: record.token,
      userId: claims.sub,
      countryCode: claims.countryCode,
      roles,
      expiresAt: typeof claims.exp === 'number' ? claims.exp : record.exp,
    };
  } catch {
    return null;
  }
}

export function visibleInsightGroups(session: PortalSession): readonly InsightReportGroup[] {
  const groups = new Set<InsightReportGroup>();
  for (const role of session.roles) {
    for (const group of INSIGHT_ROLE_GROUPS[role] ?? []) groups.add(group);
  }
  return INSIGHT_REPORT_GROUPS.filter((group) => groups.has(group));
}

export function hasPortalAccess(session: PortalSession): boolean {
  return visibleInsightGroups(session).length > 0;
}

export function portalCountryScope(session: PortalSession): string {
  return session.roles.includes('super_admin') || session.roles.includes('platform_admin')
    ? 'ALL'
    : session.countryCode;
}
