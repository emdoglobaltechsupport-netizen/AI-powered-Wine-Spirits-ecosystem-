import { randomBytes } from 'node:crypto';
import { chmodSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const ENV_PATH = join(ROOT, '.env');
export const TEMPLATE_PATH = join(ROOT, '.env.example');

const CREDENTIAL_POLICY = JSON.parse(readFileSync(join(ROOT, 'config', 'credential-policy.json'), 'utf8'));
const LEGACY_PASSWORD_PATTERNS = CREDENTIAL_POLICY.legacyPasswordPatterns.map((pattern) => new RegExp(pattern, 'i'));
const LEGACY_SESSION_PATTERNS = CREDENTIAL_POLICY.legacySessionSecretPatterns.map((pattern) => new RegExp(pattern, 'i'));
const GENERATED_SEED_PREFIX = CREDENTIAL_POLICY.generatedSeedPasswordPrefix;

const GENERATED_KEYS = [
  'POSTGRES_PASSWORD',
  'DATABASE_URL',
  'SESSION_SECRET',
  'ALLOW_DEMO_SEED',
  'SEED_ADMIN_PASSWORD',
  'SEED_USER_PASSWORD',
];

function token(bytes, prefix = '') {
  return `${prefix}${randomBytes(bytes).toString('base64url')}`;
}

function databaseUrl(password, values = {}) {
  const user = encodeURIComponent(values.POSTGRES_USER || 'vintora');
  const database = encodeURIComponent(values.POSTGRES_DB || 'vintora');
  const port = encodeURIComponent(values.POSTGRES_PORT || '5432');
  return `postgres://${user}:${encodeURIComponent(password)}@localhost:${port}/${database}`;
}

function databasePassword(url) {
  if (!url) return null;
  try {
    return decodeURIComponent(new URL(url).password);
  } catch {
    return null;
  }
}

function matchesAny(value, patterns) {
  return patterns.some((pattern) => pattern.test(String(value ?? '')));
}

function isGeneratedSeedPassword(key, value) {
  return key.startsWith('SEED_') && key.endsWith('_PASSWORD')
    && String(value ?? '').startsWith(GENERATED_SEED_PREFIX);
}

function shouldGenerate(key, value, force) {
  if (force || !value || !String(value).trim()) return true;
  if (key === 'SESSION_SECRET') return matchesAny(value, LEGACY_SESSION_PATTERNS);
  if (key.startsWith('SEED_') && key.endsWith('_PASSWORD')) {
    return !isGeneratedSeedPassword(key, value) || matchesAny(value, LEGACY_PASSWORD_PATTERNS);
  }
  if (key === 'POSTGRES_PASSWORD') return matchesAny(value, LEGACY_PASSWORD_PATTERNS);
  return false;
}

export function generatedValues() {
  return {
    POSTGRES_PASSWORD: token(24),
    DATABASE_URL: '',
    SESSION_SECRET: token(48),
    ALLOW_DEMO_SEED: 'true',
    SEED_ADMIN_PASSWORD: token(24, GENERATED_SEED_PREFIX),
    SEED_USER_PASSWORD: token(24, GENERATED_SEED_PREFIX),
  };
}

function parseEnv(text) {
  const values = {};
  const extras = [];
  for (const line of text.split(/\r?\n/)) {
    const match = /^([A-Z][A-Z0-9_]*)=(.*)$/.exec(line);
    if (!match) {
      extras.push(line);
      continue;
    }
    values[match[1]] = match[2];
  }
  return { values, extras };
}

function render(template, values, extras) {
  const seen = new Set();
  const lines = template.split(/\r?\n/).map((line) => {
    const match = /^([A-Z][A-Z0-9_]*)=(.*)$/.exec(line);
    if (!match) return line;
    const key = match[1];
    seen.add(key);
    return `${key}=${values[key] ?? ''}`;
  });
  const extraLines = extras.filter((line) => {
    const match = /^([A-Z][A-Z0-9_]*)=/.exec(line);
    return match && !seen.has(match[1]) && !GENERATED_KEYS.includes(match[1]);
  });
  return `${lines.join('\n').replace(/\s+$/, '')}\n${extraLines.filter(Boolean).join('\n')}${extraLines.length ? '\n' : ''}`;
}

/**
 * Create .env from the credential-free template, fill empty or known-legacy
 * secrets, and keep DATABASE_URL consistent with the resolved database password.
 * Generated values are environment-only; no password is ever printed.
 */
export function ensureEnv({ force = false } = {}) {
  if (!existsSync(TEMPLATE_PATH)) throw new Error(`.env.example not found at ${TEMPLATE_PATH}`);
  const template = readFileSync(TEMPLATE_PATH, 'utf8');
  const existing = existsSync(ENV_PATH) ? readFileSync(ENV_PATH, 'utf8') : null;
  const { values: current, extras } = existing ? parseEnv(existing) : { values: {}, extras: [] };
  const templateValues = parseEnv(template).values;
  const fresh = generatedValues();
  const filled = [];

  if (shouldGenerate('POSTGRES_PASSWORD', current.POSTGRES_PASSWORD, force)) {
    current.POSTGRES_PASSWORD = fresh.POSTGRES_PASSWORD;
    filled.push('POSTGRES_PASSWORD');
  }

  const connectionValues = {
    POSTGRES_USER: current.POSTGRES_USER ?? templateValues.POSTGRES_USER,
    POSTGRES_DB: current.POSTGRES_DB ?? templateValues.POSTGRES_DB,
    POSTGRES_PORT: current.POSTGRES_PORT ?? templateValues.POSTGRES_PORT,
  };
  const expectedUrl = databaseUrl(current.POSTGRES_PASSWORD, connectionValues);
  const embeddedPassword = databasePassword(current.DATABASE_URL);
  if (!current.DATABASE_URL || !current.DATABASE_URL.trim()
      || current.DATABASE_URL.trim() !== expectedUrl
      || embeddedPassword !== current.POSTGRES_PASSWORD
      || matchesAny(embeddedPassword, LEGACY_PASSWORD_PATTERNS)) {
    current.DATABASE_URL = expectedUrl;
    filled.push('DATABASE_URL');
  }

  for (const key of GENERATED_KEYS) {
    if (key === 'POSTGRES_PASSWORD' || key === 'DATABASE_URL') continue;
    if (shouldGenerate(key, current[key], force)) {
      current[key] = fresh[key];
      filled.push(key);
    }
  }

  // Keep template defaults for non-secret keys unless the user override exists.
  for (const [key, value] of Object.entries(templateValues)) {
    if (current[key] === undefined) current[key] = value;
  }

  writeFileSync(ENV_PATH, render(template, current, extras), 'utf8');
  try { chmodSync(ENV_PATH, 0o600); } catch { /* Windows ignores POSIX modes. */ }

  return {
    path: ENV_PATH,
    created: existing === null,
    filled: [...new Set(filled)],
  };
}
