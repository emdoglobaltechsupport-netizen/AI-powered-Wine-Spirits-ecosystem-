import { Router } from 'express';
import { z } from 'zod';
import { config } from '../../config.js';
import { pool } from '../../db/pool.js';
import { tenantQuery } from '../../db/tenant.js';
import { badRequest, notFound } from '../../lib/errors.js';
import { asyncHandler } from '../../lib/async.js';
import { minimumAgeFor, verifyAge } from '@vintora/shared';
import { normalizeJurisdiction, requireAccess, requestJurisdiction } from '../../middleware/access.js';
import { requireUser } from '../../middleware/auth.js';
import { bodyOf, validate } from '../../middleware/validate.js';

export const ageRouter = Router();

const ageInput = z.object({
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD'),
  country: z.string().trim().toUpperCase().length(2).regex(/^[A-Z]{2}$/),
}).strict();

ageRouter.post('/verify', requireUser,
  validate({ body: ageInput }),
  requireAccess('market:browse:tenant', {
    resourceType: 'age-verification',
    jurisdiction: (req) => normalizeJurisdiction(bodyOf<{ country: string }>(req).country),
    ownerUserId: (req) => req.auth!.userId,
  }),
  asyncHandler(async (req, res) => {
  const { dateOfBirth, country } = bodyOf<{ dateOfBirth: string; country: string }>(req);
  const countryRow = await pool.query('SELECT minimum_drinking_age FROM countries WHERE code = $1', [country]);
  if (!countryRow.rowCount) throw notFound('Unsupported country');

  const result = verifyAge(dateOfBirth, country);
  if (result.reason === 'invalid_dob') throw badRequest('Invalid date of birth');

  const minimumAge = (countryRow.rows[0] as { minimum_drinking_age: number }).minimum_drinking_age
    ?? minimumAgeFor(country);

  await pool.query(
    `INSERT INTO age_verifications
       (user_id, country_code, date_of_birth, calculated_age, minimum_age, provider, status, verified_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      req.auth!.userId,
      country,
      dateOfBirth,
      result.calculatedAge,
      minimumAge,
      config.AGE_VERIFICATION_PROVIDER,
      result.verified ? 'verified' : 'rejected',
      result.verified ? new Date() : null,
    ],
  );
  await tenantQuery(
    'UPDATE users SET country_code = $1, updated_at = now() WHERE id = $2',
    [country, req.auth!.userId],
    req.auth!.tenantId,
    req.auth!.userId,
  );

  res.json({
    verified: result.verified,
    minimumAge,
    calculatedAge: result.calculatedAge,
    reason: result.reason,
    provider: config.AGE_VERIFICATION_PROVIDER,
  });
}));

ageRouter.get('/status', requireUser, requireAccess('market:browse:tenant', {
  resourceType: 'age-verification',
  jurisdiction: requestJurisdiction,
  ownerUserId: (req) => req.auth!.userId,
}), asyncHandler(async (req, res) => {
  const { rows } = await pool.query<{
    country_code: string; status: string; verified_at: Date | null; minimum_age: number;
  }>(
    `SELECT country_code, status, verified_at, minimum_age FROM age_verifications
     WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [req.auth!.userId],
  );
  const latest = rows[0];
  res.json({
    verified: latest?.status === 'verified' && !!latest.verified_at,
    country: latest?.country_code ?? null,
    minimumAge: latest?.minimum_age ?? null,
    verifiedAt: latest?.verified_at ?? null,
  });
}));
