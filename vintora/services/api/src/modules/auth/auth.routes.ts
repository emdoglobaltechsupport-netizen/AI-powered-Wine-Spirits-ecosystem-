import { Router } from 'express';
import { z } from 'zod';
import { config } from '../../config.js';
import { conflict, unauthorized } from '../../lib/errors.js';
import { asyncHandler } from '../../lib/async.js';
import { hashPassword, verifyPassword } from '../../lib/password.js';
import {
  PROTOTYPE_JURISDICTIONS, TENANT_ID, tenantQuery,
} from '../../db/tenant.js';
import {
  SESSION_COOKIE, cookieOptions, createSessionTokens, requireUser,
} from '../../middleware/auth.js';
import { bodyOf, validate } from '../../middleware/validate.js';

export const authRouter = Router();

const credentials = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(12).max(128),
}).strict();

async function startSession(
  userId: string,
  tenantId: string,
  res: import('express').Response,
): Promise<void> {
  const { token, tokenHash, expiresAt } = createSessionTokens();
  await tenantQuery(
    `INSERT INTO app_sessions (tenant_id, token_hash, user_id, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [tenantId, tokenHash, userId, expiresAt],
    tenantId,
    userId,
  );
  res.cookie(SESSION_COOKIE, token, cookieOptions());
}

authRouter.post('/register',
  validate({ body: credentials.extend({ displayName: z.string().trim().min(2).max(80) }).strict() }),
  asyncHandler(async (req, res) => {
    const { email, password, displayName } = bodyOf<{ email: string; password: string; displayName: string }>(req);
    const existing = await tenantQuery<{ id: string }>(
      'SELECT id FROM users WHERE email = $1', [email], TENANT_ID,
    );
    if (existing.length) throw conflict('An account with that email already exists');
    const passwordHash = await hashPassword(password);
    const rows = await tenantQuery<{ id: string }>(
      `INSERT INTO users
         (email, display_name, password_hash, locale, preferred_currency, status,
          tenant_id, access_jurisdictions)
       VALUES ($1, $2, $3, 'en', 'USD', 'active', $4, $5::text[])
       RETURNING id`,
      [email, displayName, passwordHash, TENANT_ID, [...PROTOTYPE_JURISDICTIONS]],
      TENANT_ID,
    );
    const id = rows[0]!.id;
    await startSession(id, TENANT_ID, res);
    res.status(201).json({
      user: { id, email, displayName },
      roles: [],
      role: 'customer',
      tenantId: TENANT_ID,
      jurisdictions: [...PROTOTYPE_JURISDICTIONS],
    });
  }),
);

authRouter.post('/login',
  validate({ body: credentials }),
  asyncHandler(async (req, res) => {
    const { email, password } = bodyOf<{ email: string; password: string }>(req);
    const rows = await tenantQuery<{
      id: string; display_name: string | null; password_hash: string | null;
      status: string; tenant_id: string;
    }>(
      `SELECT id, display_name, password_hash, status, tenant_id
       FROM users WHERE email = $1`,
      [email],
      TENANT_ID,
    );
    const user = rows[0];
    if (!user || !user.password_hash || user.status !== 'active') {
      throw unauthorized('Invalid email or password');
    }
    const ok = await verifyPassword(password, user.password_hash);
    if (!ok) throw unauthorized('Invalid email or password');

    await tenantQuery(
      `INSERT INTO login_attempts (tenant_id, email, ip_address, succeeded)
       VALUES ($1, $2, $3, true)`,
      [user.tenant_id, email, req.ip || null],
      user.tenant_id,
      user.id,
    );
    await startSession(user.id, user.tenant_id, res);
    res.json({ user: { id: user.id, email, displayName: user.display_name } });
  }),
);

authRouter.post('/logout', requireUser, asyncHandler(async (req, res) => {
  await tenantQuery(
    'DELETE FROM app_sessions WHERE token_hash = $1',
    [req.auth!.tokenHash],
    req.auth!.tenantId,
    req.auth!.userId,
  );
  res.clearCookie(SESSION_COOKIE, { path: '/' });
  res.json({ ok: true });
}));

authRouter.get('/me', requireUser, asyncHandler(async (req, res) => {
  const auth = req.auth!;
  const rows = await tenantQuery<{ country_code: string | null; status: string }>(
    'SELECT country_code, status FROM users WHERE id = $1', [auth.userId], auth.tenantId, auth.userId,
  );
  res.json({
    user: {
      id: auth.userId,
      email: auth.email,
      displayName: auth.displayName,
      country: rows[0]?.country_code ?? null,
    },
    roles: auth.roles,
    role: auth.role,
    tenantId: auth.tenantId,
    jurisdictions: auth.jurisdictions,
    ageVerified: auth.ageVerified,
    ageCountry: auth.ageCountry,
    business: auth.businessVerification ? {
      accountId: auth.businessAccountId,
      status: auth.businessVerification.status,
      kycTier: auth.businessVerification.kycTier,
      activeContract: auth.businessVerification.activeContract,
      licenceJurisdictions: auth.businessVerification.licenceJurisdictions,
      availableUsd: Math.max(0, auth.businessVerification.creditLimit
        - auth.businessVerification.creditUsed - auth.businessVerification.reservedCredit),
    } : null,
    investorStatus: auth.investorEligibility?.status ?? 'unverified',
    staff: auth.staff,
    config: {
      simulatedPayments: config.PAYMENT_PROVIDER === 'simulated',
      aiProvider: config.AI_PROVIDER,
    },
  });
}));
