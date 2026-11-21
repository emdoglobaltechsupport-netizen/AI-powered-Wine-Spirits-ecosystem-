import { createHash, randomBytes } from 'node:crypto';
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { AccessPrincipal, BusinessVerification } from '@vintora/shared';
import { config } from '../config.js';
import { tenantQuery } from '../db/tenant.js';
import { forbidden, precondition, unauthorized } from '../lib/errors.js';

export const SESSION_COOKIE = 'vintora_session';
const SESSION_TTL_MS = config.SESSION_TTL_HOURS * 60 * 60 * 1000;

export interface AuthContext extends AccessPrincipal {
  ageCountry: string | null;
  ageVerifiedAt: Date | null;
  email: string | null;
  displayName: string | null;
  roles: string[];
  tokenHash: string;
  expiresAt: Date;
}

export interface SessionTokens {
  token: string;
  tokenHash: string;
  expiresAt: Date;
}

export function createSessionTokens(): SessionTokens {
  const token = randomBytes(32).toString('base64url');
  return { token, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + SESSION_TTL_MS) };
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function readCookie(req: Request, name: string): string | null {
  const raw = req.headers.cookie;
  if (!raw) return null;
  for (const part of raw.split(';')) {
    const index = part.indexOf('=');
    if (index < 0) continue;
    if (part.slice(0, index).trim() === name) {
      try { return decodeURIComponent(part.slice(index + 1).trim()); } catch { return null; }
    }
  }
  return null;
}

interface AuthRow {
  id: string;
  email: string | null;
  display_name: string | null;
  tenant_id: string;
  primary_commerce_role: string;
  access_jurisdictions: string[] | null;
  business_account_id: string | null;
  investor_status: string;
  token_hash: string;
  expires_at: Date;
  roles: string[] | null;
  age_verified: boolean;
  age_country: string | null;
  age_verified_at: Date | null;
  verified_business_id: string | null;
  verification_status: string | null;
  kyc_tier: string | null;
  permitted_jurisdictions: string[] | null;
  licensed_jurisdictions: string[] | null;
  credit_limit: string | number | null;
  credit_used: string | number | null;
  reserved_credit: string | number | null;
  credit_currency: string | null;
  authorised_buyer_user_id: string | null;
  contract_status: string | null;
  admin_session_id: string | null;
  admin_mfa_verified: boolean | null;
  admin_break_glass: boolean | null;
  admin_approver_id: string | null;
  admin_elevation_expires_at: Date | null;
}

/** Resolve the session cookie into a tenant- and role-scoped auth context. Never throws. */
export const attachAuth: RequestHandler = async (req, _res, next) => {
  try {
    const token = readCookie(req, SESSION_COOKIE);
    if (!token || !/^[\w-]{43}$/.test(token)) { next(); return; }
    const tokenHash = hashToken(token);
    const rows = await tenantQuery<AuthRow>(
      `SELECT u.id, u.email, u.display_name, u.tenant_id, u.primary_commerce_role,
              u.access_jurisdictions, u.business_account_id, u.investor_status,
              s.token_hash, s.expires_at,
              COALESCE((
                SELECT array_agg(r.code)
                FROM admin_staff_roles sr
                JOIN admin_roles r ON r.id = sr.role_id AND r.active = true
                WHERE sr.staff_user_id = u.id AND sr.active = true
                  AND (sr.expires_at IS NULL OR sr.expires_at > now())
              ), '{}'::text[]) AS roles,
              EXISTS (
                SELECT 1 FROM age_verifications av
                WHERE av.user_id = u.id AND av.status = 'verified' AND av.verified_at IS NOT NULL
              ) AS age_verified,
              (SELECT av.country_code FROM age_verifications av
                WHERE av.user_id = u.id AND av.status = 'verified' AND av.verified_at IS NOT NULL
                ORDER BY av.verified_at DESC LIMIT 1) AS age_country,
              (SELECT av.verified_at FROM age_verifications av
                WHERE av.user_id = u.id AND av.status = 'verified' AND av.verified_at IS NOT NULL
                ORDER BY av.verified_at DESC LIMIT 1) AS age_verified_at,
              b.id AS verified_business_id, b.verification_status, b.kyc_tier,
              b.permitted_jurisdictions, b.licence_jurisdictions AS licensed_jurisdictions,
              b.credit_used, b.reserved_credit, b.authorised_buyer_user_id,
              COALESCE(contract.status, b.contract_status) AS contract_status,
              COALESCE(contract.credit_limit, b.credit_limit) AS credit_limit,
              COALESCE(contract.currency_code, b.credit_currency) AS credit_currency,
              COALESCE(contract.permitted_jurisdictions, b.permitted_jurisdictions) AS permitted_jurisdictions,
              admin_session.admin_session_id, admin_session.admin_mfa_verified,
              admin_session.admin_break_glass, admin_session.admin_approver_id,
              admin_session.admin_elevation_expires_at
       FROM app_sessions s
       JOIN users u ON u.id = s.user_id
       LEFT JOIN b2b_accounts b
         ON b.id = u.business_account_id AND b.tenant_id = u.tenant_id
       LEFT JOIN LATERAL (
         SELECT tc.status, tc.credit_limit, tc.currency_code, tc.permitted_jurisdictions
         FROM trade_contracts tc
         WHERE tc.business_account_id = b.id
           AND tc.tenant_id = u.tenant_id
           AND tc.status = 'active'
           AND (tc.effective_to IS NULL OR tc.effective_to > now())
         ORDER BY tc.version DESC
         LIMIT 1
       ) contract ON true
       LEFT JOIN LATERAL (
         SELECT ses.id AS admin_session_id, ses.mfa_verified AS admin_mfa_verified,
                ses.break_glass AS admin_break_glass,
                ses.approver_id AS admin_approver_id,
                ses.elevation_expires_at AS admin_elevation_expires_at
         FROM admin_sessions ses
         WHERE ses.staff_user_id = u.id
           AND ses.tenant_id = u.tenant_id
           AND ses.ends_at IS NULL
           AND (ses.elevation_expires_at IS NULL OR ses.elevation_expires_at > now())
         ORDER BY ses.elevation_expires_at DESC NULLS LAST, ses.started_at DESC
         LIMIT 1
       ) admin_session ON true
       WHERE s.token_hash = $1 AND s.expires_at > now() AND u.status = 'active'`,
      [tokenHash],
    );
    const row = rows[0];
    if (row) {
      const roles = row.roles ?? [];
      const jurisdictions = row.permitted_jurisdictions ?? [];
      const elevationValid = Boolean(
        row.admin_session_id &&
        row.admin_mfa_verified &&
        (!row.admin_elevation_expires_at || row.admin_elevation_expires_at > new Date()),
      );
      const approverDistinct = !row.admin_break_glass || Boolean(
        row.admin_approver_id && row.admin_approver_id !== row.id,
      );
      const businessVerification: BusinessVerification | null = row.verified_business_id ? {
        status: row.verification_status ?? 'unverified',
        kycTier: row.kyc_tier ?? 'unverified',
        tenantId: row.tenant_id,
        jurisdictions,
        licenceJurisdictions: row.licensed_jurisdictions ?? [],
        activeContract: row.contract_status === 'active',
        licenceEvidenceForJurisdiction: (row.licensed_jurisdictions ?? []).length > 0,
        namedAuthorisedBuyer: row.authorised_buyer_user_id === row.id,
        creditLimit: Number(row.credit_limit ?? 0),
        creditUsed: Number(row.credit_used ?? 0),
        reservedCredit: Number(row.reserved_credit ?? 0),
        creditCurrency: row.credit_currency ?? 'USD',
      } : null;

      req.auth = {
        userId: row.id,
        email: row.email,
        displayName: row.display_name,
        tenantId: row.tenant_id,
        role: roles.length ? 'admin' : row.primary_commerce_role,
        jurisdictions: row.access_jurisdictions ?? [],
        ageVerified: row.age_verified,
        ageCountry: row.age_country,
        ageVerifiedAt: row.age_verified_at,
        businessAccountId: row.business_account_id,
        businessVerification,
        investorEligibility: { status: row.investor_status, tenantId: row.tenant_id },
        staff: roles.length ? { active: true, elevationValid, approverDistinct } : null,
        roles,
        tokenHash,
        expiresAt: row.expires_at,
      };
    }
    next();
  } catch (err) {
    next(err);
  }
};

export const requireUser: RequestHandler = (req, _res, next) => {
  if (!req.auth) { next(unauthorized('Sign in to continue')); return; }
  next();
};

export function requireRole(...roles: string[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.auth) { next(unauthorized('Sign in to continue')); return; }
    const allowed = roles.some((r) => req.auth!.roles.includes(r));
    if (!allowed) { next(forbidden('Insufficient role')); return; }
    next();
  };
}

export function cookieOptions() {
  return {
    httpOnly: true,
    secure: config.COOKIE_SECURE === 'true',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_TTL_MS,
  };
}

/** Commerce routes require a verified age assertion stored in the DB (ADR-008). */
export const requireAge: RequestHandler = async (req, _res, next) => {
  if (!req.auth) { next(unauthorized('Sign in to continue')); return; }
  try {
    const rows = await tenantQuery<{ country_code: string }>(
      `SELECT country_code FROM age_verifications
       WHERE user_id = $1 AND status = 'verified' AND verified_at IS NOT NULL
       ORDER BY verified_at DESC LIMIT 1`,
      [req.auth.userId],
      req.auth.tenantId,
      req.auth.userId,
    );
    if (!rows.length) {
      next(precondition('Verify your age before checkout', 'POST /v1/age/verify'));
      return;
    }
    next();
  } catch (err) {
    next(err);
  }
};
