import { Router } from 'express';
import { CANON, FX_RATES } from '@vintora/shared';
import { config } from '../../config.js';
import { databaseHealth } from '../../db/pool.js';
import { query } from '../../db/pool.js';
import { embeddingModeHealth } from '../../db/migrate.js';
import { asyncHandler } from '../../lib/async.js';

export const systemRouter = Router();

systemRouter.get('/health', asyncHandler(async (_req, res) => {
  let db: { ok: boolean; latencyMs: number } | { ok: false; error: string };
  try {
    db = await databaseHealth();
  } catch {
    db = { ok: false, error: 'unavailable' };
  }
  let embedding = null;
  try {
    embedding = await embeddingModeHealth();
  } catch {
    embedding = { mode: 'unknown', detail: 'embedding mode diagnostic failed' };
  }
  res.status(db.ok ? 200 : 503).json({
    status: db.ok ? 'ok' : 'degraded',
    brand: CANON.brand,
    modules: CANON.modules.length,
    version: process.env.npm_package_version ?? '0.1.0',
    environment: config.NODE_ENV,
    runtimeProfile: config.runtimeBoundary.profile,
    runtimeBoundaryOk: config.runtimeBoundary.ok,
    db,
    embedding,
  });
}));

systemRouter.get('/v1/canon', (_req, res) => res.json(CANON));

systemRouter.get('/v1/fx/rates', (_req, res) => {
  res.json({ base: 'USD', rates: FX_RATES, lockedForSeconds: 900, provider: 'internal-fx-engine' });
});

systemRouter.get('/v1/reference', asyncHandler(async (_req, res) => {
  const [currencies, countries, clubs] = await Promise.all([
    query('SELECT code, name, symbol, minor_units FROM currencies ORDER BY code'),
    query('SELECT code, name, minimum_drinking_age, currency_code FROM countries ORDER BY name'),
    query('SELECT code, name, monthly_usd, bottle_count, description FROM club_plans ORDER BY monthly_usd'),
  ]);
  res.json({ currencies, countries, clubPlans: clubs, simulatedProviders: {
    payments: config.PAYMENT_PROVIDER,
    age: config.AGE_VERIFICATION_PROVIDER,
    ai: config.AI_PROVIDER,
  } });
}));
