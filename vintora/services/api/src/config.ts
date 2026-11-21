import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { z } from 'zod';
import {
  evaluateRuntimeBoundaries,
  resolveAdapterMode,
  type RuntimeBoundaryConfig,
  type RuntimeBoundaryOutcome,
  type RuntimeHighRiskFeature,
  type RuntimeLaunchState,
  type RuntimeLicensingDomain,
} from '@vintora/shared';

// Load the repository-root .env regardless of the package's working directory.
dotenv.config({ path: fileURLToPath(new URL('../../../.env', import.meta.url)) });

function loadJson<T>(path: string): T {
  return JSON.parse(readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8')) as T;
}

const boundaryConfig = loadJson<RuntimeBoundaryConfig>('../../../config/runtime-boundaries.json');

interface CredentialPolicy {
  localProfiles: string[];
  generatedSeedPasswordPrefix: string;
  legacyPasswordPatterns: string[];
  legacySessionSecretPatterns: string[];
  demoEmailPatterns: string[];
}

const credentialPolicy = loadJson<CredentialPolicy>('../../../config/credential-policy.json');
const patternCache = new Map<string, RegExp[]>();
function compiledPatterns(key: keyof CredentialPolicy): RegExp[] {
  const cached = patternCache.get(key);
  if (cached) return cached;
  const patterns = (credentialPolicy[key] as string[]).map((pattern) => new RegExp(pattern, 'i'));
  patternCache.set(key, patterns);
  return patterns;
}
function matchesPolicy(value: string | undefined, key: keyof CredentialPolicy): boolean {
  return typeof value === 'string' && compiledPatterns(key).some((pattern) => pattern.test(value));
}
function embeddedDatabasePassword(url: string): string | null {
  try {
    return decodeURIComponent(new URL(url).password) || null;
  } catch {
    return null;
  }
}

/**
 * Environment contract for the API.
 * Every secret is read from process.env — never from source. `.env` is loaded
 * before this module by `dotenv/config` in `index.ts`, and `.env` is gitignored.
 */
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  RUNTIME_PROFILE: z.enum(['local', 'test', 'staging', 'production']).optional(),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  WEB_ORIGIN: z.string().url().default('http://localhost:8123'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  POSTGRES_PASSWORD: z.string().optional(),
  // auto detects pgvector; explicit modes are configuration guards, not launch approval.
  EMBEDDING_MODE: z.enum(['auto', 'pgvector', 'jsonb']).default('auto'),

  // Session / auth. Secrets are generated into .env by `npm run setup`.
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
  SESSION_TTL_HOURS: z.coerce.number().int().min(1).max(720).default(12),
  COOKIE_SECURE: z.enum(['true', 'false']).default('false'),

  // In-memory prototype rate limit. Production uses a distributed limiter.
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1000).default(900_000),
  RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(1000),

  // Seed credentials (development only). Demo seeding needs an explicit opt-in.
  ALLOW_DEMO_SEED: z.enum(['true', 'false']).default('false'),
  SEED_ADMIN_EMAIL: z.string().email().default('admin@vintora.local'),
  SEED_ADMIN_PASSWORD: z.string().min(12, 'SEED_ADMIN_PASSWORD must be at least 12 characters'),
  SEED_USER_EMAIL: z.string().email().default('demo@vintora.local'),
  SEED_USER_PASSWORD: z.string().min(12, 'SEED_USER_PASSWORD must be at least 12 characters'),

  // External providers are adapters only; no real calls in this build.
  AGE_VERIFICATION_PROVIDER: z.string().default('local'),
  KYC_PROVIDER: z.string().default('local'),
  PAYMENT_PROVIDER: z.string().default('simulated'),
  MARKETING_PROVIDER: z.string().default('simulated'),
  CUSTODY_PROVIDER: z.string().default('simulated'),
  AI_PROVIDER: z.string().default('deterministic'),
  REAL_PROVIDER_OPT_IN: z.enum(['true', 'false']).default('false'),
  ALLOW_SIMULATED_PROVIDERS: z.enum(['true', 'false']).default('true'),
  REAL_AGE_PROVIDER_OPT_IN: z.enum(['true', 'false']).default('false'),
  REAL_KYC_PROVIDER_OPT_IN: z.enum(['true', 'false']).default('false'),
  REAL_PAYMENT_PROVIDER_OPT_IN: z.enum(['true', 'false']).default('false'),
  REAL_MARKETING_PROVIDER_OPT_IN: z.enum(['true', 'false']).default('false'),
  REAL_CUSTODY_PROVIDER_OPT_IN: z.enum(['true', 'false']).default('false'),
  REAL_AI_PROVIDER_OPT_IN: z.enum(['true', 'false']).default('false'),
  CATALOGUE_SOURCE: z.enum(['demo', 'verified']).default('demo'),
  STRIPE_SECRET_KEY: z.string().optional(),
  ADYEN_API_KEY: z.string().optional(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type Config = z.infer<typeof schema> & {
  isProduction: boolean;
  isTest: boolean;
  runtimeBoundary: RuntimeBoundaryOutcome;
};

function load(): Config {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  const cfg = parsed.data as Config;
  cfg.isProduction = cfg.NODE_ENV === 'production';
  cfg.isTest = cfg.NODE_ENV === 'test';

  // Startup self-test: profile, adapter and seeded-identity boundaries must be
  // consistent before any route is registered or database work begins.
  const launch = loadJson<RuntimeLaunchState>('../../../config/launch-manifest.json');
  const licensing = loadJson<{ domains: RuntimeLicensingDomain[] }>('../../../config/commercial-licensing-policy.json');
  const highRisk = loadJson<{ features: RuntimeHighRiskFeature[] }>('../../../config/high-risk-features.json');
  cfg.runtimeBoundary = evaluateRuntimeBoundaries({
    env: process.env,
    config: boundaryConfig,
    launch,
    licensingDomains: licensing.domains,
    highRiskFeatures: highRisk.features,
  });
  if (!cfg.runtimeBoundary.ok) {
    const detail = cfg.runtimeBoundary.violations.map((violation) => `  - ${violation}`).join('\n');
    throw new Error(`Runtime boundary self-test failed:\n${detail}`);
  }

  // Non-secret startup diagnostic: names and modes only, never env values or credentials.
  const adapterModes = Object.fromEntries(boundaryConfig.providers.map((provider) => [
    provider.id,
    resolveAdapterMode(process.env, provider, boundaryConfig, cfg.runtimeBoundary.profile),
  ]));
  console.log(JSON.stringify({
    event: 'vintora.runtime.adapters',
    profile: cfg.runtimeBoundary.profile,
    policyVersion: 'v1',
    adapterModes,
    externalEffectsAllowed: false,
    credentialsLogged: false,
  }));

  const profile = String(cfg.runtimeBoundary.profile ?? '');
  const localProfile = credentialPolicy.localProfiles.includes(profile);
  if (!localProfile && (
    cfg.ALLOW_DEMO_SEED === 'true'
    || matchesPolicy(cfg.SEED_ADMIN_EMAIL, 'demoEmailPatterns')
    || matchesPolicy(cfg.SEED_USER_EMAIL, 'demoEmailPatterns')
  )) {
    throw new Error('Seeded admin credentials are blocked outside local/test development');
  }
  if (matchesPolicy(cfg.SESSION_SECRET, 'legacySessionSecretPatterns')) {
    throw new Error('Fixed development session secrets are not permitted; regenerate with npm run setup:env -- --force');
  }
  if (matchesPolicy(cfg.SEED_ADMIN_PASSWORD, 'legacyPasswordPatterns')
      || matchesPolicy(cfg.SEED_USER_PASSWORD, 'legacyPasswordPatterns')) {
    throw new Error('Fixed demo credentials are not permitted; regenerate with npm run setup:env -- --force');
  }
  if (localProfile && (
    !cfg.SEED_ADMIN_PASSWORD.startsWith(credentialPolicy.generatedSeedPasswordPrefix)
    || !cfg.SEED_USER_PASSWORD.startsWith(credentialPolicy.generatedSeedPasswordPrefix)
  )) {
    throw new Error('Seeded demo passwords must be generated by npm run setup:env');
  }
  const urlPassword = embeddedDatabasePassword(cfg.DATABASE_URL);
  if (cfg.POSTGRES_PASSWORD && urlPassword && urlPassword !== cfg.POSTGRES_PASSWORD) {
    throw new Error('DATABASE_URL password must match POSTGRES_PASSWORD; regenerate with npm run setup:env -- --force');
  }

  if (cfg.isProduction) {
    if (cfg.SESSION_SECRET.length < 32) {
      throw new Error('SESSION_SECRET must be at least 32 characters in production');
    }
    if (cfg.COOKIE_SECURE !== 'true') {
      throw new Error('COOKIE_SECURE=true is required in production');
    }
    if (cfg.WEB_ORIGIN.startsWith('http://') && !cfg.WEB_ORIGIN.includes('localhost')) {
      throw new Error('WEB_ORIGIN must use https in production');
    }
    // This repository intentionally ships local/deterministic provider adapters only.
    // Do not allow environment labels to make that scaffold appear to be a live
    // alcohol-commerce deployment. Remove this guard only when real, audited
    // provider implementations and the launch controls in LAUNCH_READINESS.md exist.
    throw new Error(
      'Production startup is disabled: Vintora currently contains simulated payment, age/KYC and AI adapters only. ' +
      'See LAUNCH_READINESS.md before enabling a live deployment.',
    );
  }
  return cfg;
}

export const config = load();
