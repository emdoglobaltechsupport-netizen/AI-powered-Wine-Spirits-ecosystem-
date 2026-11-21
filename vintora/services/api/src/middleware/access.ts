import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { authorizeAccess, type AccessDomain } from '@vintora/shared';
import { tenantQuery } from '../db/tenant.js';
import { forbidden, precondition, unauthorized } from '../lib/errors.js';

type ValueOrResolver<T> = T | ((req: Request) => T | undefined);

interface AccessOptions {
  jurisdiction?: ValueOrResolver<string>;
  resourceType?: string;
  resourceId?: ValueOrResolver<string>;
  ownerUserId?: ValueOrResolver<string>;
  ownerBusinessAccountId?: ValueOrResolver<string>;
  amountUsd?: ValueOrResolver<number>;
  currency?: ValueOrResolver<string>;
}

function resolve<T>(value: ValueOrResolver<T> | undefined, req: Request): T | undefined {
  return typeof value === 'function' ? (value as (request: Request) => T | undefined)(req) : value;
}

/** Normalise demo market labels to ISO-like jurisdiction codes. */
export function normalizeJurisdiction(value: string | undefined): string {
  const raw = (value ?? '').trim().toUpperCase();
  const map: Record<string, string> = {
    UK: 'GB', 'UNITED KINGDOM': 'GB', 'LONDON, UK': 'GB',
    FR: 'FR', FRANCE: 'FR', 'PARIS, FR': 'FR',
    US: 'US', 'UNITED STATES': 'US', 'NEW YORK, US': 'US',
    SG: 'SG', SINGAPORE: 'SG',
    AE: 'AE', AU: 'AU', BR: 'BR', CA: 'CA', DE: 'DE', ES: 'ES', IT: 'IT', JP: 'JP', NL: 'NL', PT: 'PT', ZA: 'ZA',
  };
  return map[raw] ?? raw;
}

/** Verified age country wins; otherwise use the principal's explicit scope. */
export function requestJurisdiction(req: Request): string {
  return normalizeJurisdiction(req.auth?.ageCountry ?? req.auth?.jurisdictions[0]);
}

/**
 * Intersection of principal, verified business and licence jurisdictions.
 * Used to filter list endpoints before data leaves the server.
 */
export function authorizedJurisdictions(req: Request): string[] {
  const verification = req.auth?.businessVerification;
  const allowed = new Set((req.auth?.jurisdictions ?? []).map(normalizeJurisdiction));
  if (!allowed.size) return [];
  if (!verification) return [...allowed];
  const business = new Set(verification.jurisdictions.map(normalizeJurisdiction));
  const licensed = new Set(verification.licenceJurisdictions.map(normalizeJurisdiction));
  return [...allowed].filter((code) => business.has(code) && licensed.has(code));
}

async function recordDecision(
  req: Request,
  permission: string,
  domain: AccessDomain,
  decision: { allowed: boolean; code: string; reason: string },
  resourceType: string | undefined,
  resourceId: string | undefined,
): Promise<void> {
  if (!req.auth) return;
  await tenantQuery(
    `INSERT INTO authorization_decisions
       (tenant_id, request_id, actor_user_id, domain, permission, resource_type,
        resource_id, result, reason_code, reason)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      req.auth.tenantId,
      req.id ?? null,
      req.auth.userId,
      domain,
      permission,
      resourceType ?? null,
      resourceId ?? null,
      decision.allowed ? 'allowed' : 'denied',
      decision.code,
      decision.reason,
    ],
    req.auth.tenantId,
    req.auth.userId,
  );
}

/**
 * Deny-by-default route guard for tenant-, jurisdiction- and
 * transaction-scoped authorization. Requires an authenticated principal.
 */
export function requireAccess(permission: string, options: AccessOptions = {}): RequestHandler {
  return async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) { next(unauthorized('Sign in to continue')); return; }

    const domain = permission.split(':')[0] ?? '';
    const resourceId = resolve(options.resourceId, req);
    const jurisdiction = normalizeJurisdiction(resolve(options.jurisdiction, req) ?? requestJurisdiction(req));
    const decision = authorizeAccess(req.auth, {
      tenantId: req.auth.tenantId,
      jurisdiction,
      domain: domain as AccessDomain,
      ownerUserId: resolve(options.ownerUserId, req),
      ownerBusinessAccountId: resolve(options.ownerBusinessAccountId, req),
    }, {
      permission,
      amountUsd: resolve(options.amountUsd, req),
      currency: resolve(options.currency, req),
    });

    try {
      await recordDecision(req, permission, domain as AccessDomain, decision, options.resourceType, resourceId);
    } catch (err) {
      next(err);
      return;
    }

    if (!decision.allowed) {
      const details = {
        code: decision.code,
        reason: decision.reason,
        requiredPermission: permission,
      };
      if (decision.code === 'age_verification_required') {
        next(precondition('Verify your age before checkout', 'POST /v1/age/verify'));
        return;
      }
      next(forbidden('Not permitted', details));
      return;
    }
    next();
  };
}
