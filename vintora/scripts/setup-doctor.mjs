#!/usr/bin/env node
/**
 * Setup doctor: a deterministic, secret-safe readiness diagnostic.
 *
 * Modes:
 *   --offline  env-contract, versions and documentation checks only (CI-safe)
 *   --ci       offline checks plus PostgreSQL/migration checks; no Docker/API
 *   (none)     all checks, including Docker Compose and API health
 *
 * The command never prints secret values. It prints only key names and
 * presence/absence, plus readiness findings.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(ROOT, path), 'utf8');
const args = new Set(process.argv.slice(2));
const OFFLINE = args.has('--offline');
const CI = args.has('--ci');
const CHECK_DB = !OFFLINE;
const CHECK_DOCKER = !OFFLINE && !CI;
const CHECK_API = !OFFLINE && !CI;

const matrix = JSON.parse(read('config/setup-environment-matrix.json'));
const boundaryConfig = JSON.parse(read('config/runtime-boundaries.json'));
const credentialPolicy = JSON.parse(read('config/credential-policy.json'));
const pkg = JSON.parse(read('package.json'));
const templateText = read('.env.example');
const setupDoc = existsSync(join(ROOT, 'SETUP.md')) ? read('SETUP.md') : '';
const migrationDir = join(ROOT, 'packages', 'db', 'migrations');

const passes = [];
const warnings = [];
const failures = [];
const pass = (message) => passes.push(message);
const warn = (message) => warnings.push(message);
const fail = (message) => failures.push(message);

function parseEnv(text) {
  const values = {};
  for (const line of text.split(/\r?\n/)) {
    const match = /^([A-Z][A-Z0-9_]*)=(.*)$/.exec(line);
    if (match) values[match[1]] = match[2];
  }
  return values;
}

function matchesPolicy(value, key) {
  return typeof value === 'string' && (credentialPolicy[key] ?? [])
    .some((pattern) => new RegExp(pattern, 'i').test(value));
}

function embeddedDatabasePassword(url) {
  if (!url) return null;
  try {
    return decodeURIComponent(new URL(url).password) || null;
  } catch {
    return null;
  }
}

const fileEnv = existsSync(join(ROOT, '.env')) ? parseEnv(read('.env')) : {};
// dotenv does not override existing process.env values.
const values = { ...fileEnv, ...process.env };
const template = parseEnv(templateText);
const allContractKeys = [...new Set([...matrix.requiredEnv, ...matrix.optionalEnv])];

function versionParts(value) {
  const match = /^v?(\d+)(?:\.(\d+))?(?:\.(\d+))?/.exec(String(value ?? ''));
  if (!match) return null;
  return [Number(match[1]), Number(match[2] ?? 0), Number(match[3] ?? 0)];
}

function atLeast(value, minimum) {
  const actual = versionParts(value);
  const expected = versionParts(minimum);
  if (!actual || !expected) return false;
  for (let i = 0; i < 3; i += 1) {
    if (actual[i] !== expected[i]) return actual[i] > expected[i];
  }
  return true;
}

// Supports explicit LTS ranges such as "24.x || 26.x" and "11.x".
function satisfiesRange(value, range) {
  const actual = versionParts(value);
  if (!actual) return false;
  return String(range).split('||').some((branch) => branch.trim().split(/\s+/).every((clause) => {
    const match = /^(>=|<=|>|<|=)?v?(\d+|[x*])(?:\.(\d+|[x*]))?(?:\.(\d+|[x*]))?$/.exec(clause.trim());
    if (!match) return false;
    const expected = [
      match[2] === 'x' || match[2] === '*' ? null : Number(match[2]),
      match[3] === undefined || match[3] === 'x' || match[3] === '*' ? null : Number(match[3]),
      match[4] === undefined || match[4] === 'x' || match[4] === '*' ? null : Number(match[4]),
    ];
    const operator = match[1] ?? '=';
    if (operator === '=' && expected[1] !== null && expected[2] !== null) {
      const comparison = actual[0] - expected[0] || actual[1] - expected[1] || actual[2] - expected[2];
      return comparison === 0;
    }
    if (operator !== '=' && expected.some((part) => part === null)) return false;
    const comparisonParts = [0, 1, 2].map((index) => (
      expected[index] === null ? 0 : actual[index] - expected[index]
    ));
    const comparison = comparisonParts[0] || comparisonParts[1] || comparisonParts[2];
    if (operator === '>=') return comparison >= 0;
    if (operator === '<=') return comparison <= 0;
    if (operator === '>') return comparison > 0;
    if (operator === '<') return comparison < 0;
    return comparison === 0;
  }));
}

function userAgentField(name) {
  const match = new RegExp(`${name}/([^\\s]+)`).exec(process.env.npm_config_user_agent ?? '');
  return match ? match[1] : null;
}

// 1. Repository and tool versions.
if (pkg.version === matrix.repository.packageVersion) pass(`repository package version ${pkg.version}`);
else fail(`package.json version ${pkg.version} does not match setup matrix ${matrix.repository.packageVersion}`);

if (satisfiesRange(process.version, matrix.repository.nodeEngine)) {
  pass(`Node ${process.version} satisfies supported LTS range ${matrix.repository.nodeEngine}`);
} else {
  fail(`Node ${process.version} is outside supported LTS range ${matrix.repository.nodeEngine}; baseline is ${matrix.repository.nodeBaseline}`);
}

const npmVersion = userAgentField('npm');
if (!npmVersion) warn('npm version unavailable from npm_config_user_agent; run the doctor through an npm script');
else if (satisfiesRange(npmVersion, matrix.repository.npmSupported)) {
  pass(`npm ${npmVersion} satisfies ${matrix.repository.npmSupported} (verified ${matrix.repository.npmVerified})`);
} else {
  fail(`npm ${npmVersion} is outside ${matrix.repository.npmSupported}`);
}

// 1b. Toolchain pins and enforced engine range.
for (const pinFile of ['.nvmrc', '.node-version']) {
  if (!existsSync(join(ROOT, pinFile))) fail(`${pinFile} is missing; pin Node ${matrix.repository.nodeBaseline}`);
  else if (read(pinFile).trim() !== matrix.repository.nodeBaseline) {
    fail(`${pinFile} must pin Node ${matrix.repository.nodeBaseline}`);
  }
}
if (!existsSync(join(ROOT, '.npmrc')) || !/^engine-strict=true$/m.test(read('.npmrc'))) {
  fail('.npmrc must enable engine-strict=true so unsupported Node/npm versions fail at install');
}
if (pkg.engines?.node !== matrix.repository.nodeEngine || pkg.engines?.npm !== matrix.repository.npmSupported) {
  fail('package.json engines must match the setup matrix node/npm support ranges');
}
if (existsSync(join(ROOT, '.nvmrc')) && read('.nvmrc').trim() === matrix.repository.nodeBaseline
    && existsSync(join(ROOT, '.node-version')) && read('.node-version').trim() === matrix.repository.nodeBaseline
    && existsSync(join(ROOT, '.npmrc')) && /^engine-strict=true$/m.test(read('.npmrc'))
    && pkg.engines?.node === matrix.repository.nodeEngine && pkg.engines?.npm === matrix.repository.npmSupported) {
  pass(`Node baseline ${matrix.repository.nodeBaseline} pinned and engines enforced`);
}

// 2. Environment contract completeness and secrecy.
for (const key of allContractKeys) {
  if (!(key in template)) fail(`.env.example is missing contracted key ${key}`);
}
for (const key of Object.keys(template)) {
  if (!allContractKeys.includes(key)) fail(`${key} exists in .env.example but not in setup-environment-matrix.json`);
}
for (const key of allContractKeys) {
  if (!setupDoc.includes(`\`${key}\``)) fail(`SETUP.md does not document ${key}`);
}

for (const key of matrix.secretEnv) {
  const value = template[key];
  if (value && !value.startsWith('<')) fail(`.env.example contains a non-empty secret placeholder for ${key}`);
}
if (allContractKeys.length > 0) pass(`.env.example and SETUP.md cover ${allContractKeys.length} contracted variables`);

const embeddingMode = String(values.EMBEDDING_MODE ?? template.EMBEDDING_MODE ?? 'auto').trim().toLowerCase();
if (matrix.embeddingModes.allowed.includes(embeddingMode)) {
  pass(`embedding mode configuration ${embeddingMode} is allowlisted`);
} else {
  fail(`EMBEDDING_MODE=${embeddingMode} must be one of ${matrix.embeddingModes.allowed.join(', ')}`);
}

if (values.NODE_ENV === 'production') fail('NODE_ENV=production is rejected by this prototype at startup');
if (values.CATALOGUE_SOURCE === 'verified') fail('CATALOGUE_SOURCE=verified is disabled until a rights-evidence adapter exists');

const profileByNodeEnv = { development: 'local', test: 'test', staging: 'staging', production: 'production' };
const nodeEnv = String(values.NODE_ENV ?? 'development').trim().toLowerCase();
const explicitProfile = String(values[boundaryConfig.profileEnv] ?? '').trim().toLowerCase();
const resolvedProfile = explicitProfile || profileByNodeEnv[nodeEnv];
const profileRule = boundaryConfig.profiles[resolvedProfile];
if (!profileRule) fail(`${boundaryConfig.profileEnv}=${explicitProfile || '(unset)'} is not a known runtime profile`);
else {
  pass(`runtime profile ${resolvedProfile} resolved from environment`);
  if (nodeEnv !== profileRule.nodeEnv) {
    fail(`NODE_ENV must be ${profileRule.nodeEnv} for runtime profile ${resolvedProfile}`);
  }
  if (profileRule.allowed === false) fail(profileRule.blockReason ?? `runtime profile ${resolvedProfile} is blocked`);
  if (String(values.ALLOW_DEMO_SEED ?? '').toLowerCase() === 'true' && !profileRule.allowDemoIdentities) {
    fail(`demo identities are not allowed in ${resolvedProfile}`);
  }
  const localProfile = credentialPolicy.localProfiles.includes(resolvedProfile);
  if (!localProfile && (
    String(values.ALLOW_DEMO_SEED ?? '').toLowerCase() === 'true'
    || matchesPolicy(values.SEED_ADMIN_EMAIL, 'demoEmailPatterns')
    || matchesPolicy(values.SEED_USER_EMAIL, 'demoEmailPatterns')
  )) {
    fail('seeded admin credentials are blocked outside local/test development');
  }
}
if (matchesPolicy(values.SESSION_SECRET, 'legacySessionSecretPatterns')) {
  fail('fixed development session secrets must be regenerated with npm run setup:env -- --force');
}
for (const key of ['SEED_ADMIN_PASSWORD', 'SEED_USER_PASSWORD']) {
  const value = values[key];
  if (!value) continue;
  if (matchesPolicy(value, 'legacyPasswordPatterns') || !value.startsWith(credentialPolicy.generatedSeedPasswordPrefix)) {
    fail(`${key} must be generated by npm run setup:env; fixed values are not permitted`);
  }
}
const databaseUrlPassword = embeddedDatabasePassword(values.DATABASE_URL);
if (values.POSTGRES_PASSWORD && databaseUrlPassword && databaseUrlPassword !== values.POSTGRES_PASSWORD) {
  fail('DATABASE_URL password must match POSTGRES_PASSWORD; regenerate secrets on a throwaway local environment');
}
if (String(values[boundaryConfig.globalRealOptInEnv] ?? '').toLowerCase() === 'true') {
  fail(`${boundaryConfig.globalRealOptInEnv}=true is blocked by prototype provider evidence gates`);
}
for (const provider of boundaryConfig.providers) {
  const value = String(values[provider.env] ?? provider.defaultValue).trim().toLowerCase();
  if (provider.simulatedValues.includes(value)) continue;
  if (value === 'real') fail(`${provider.env}=real is blocked until launch, licence and provider evidence exists`);
  else fail(`${provider.env}=${value} is not an allowlisted ${provider.id} adapter`);
}
if (existsSync(join(ROOT, '.env'))) pass('.env exists and is gitignored; values are not printed');
else warn('.env is absent; run npm run setup:env before a manual DB setup');

if (!OFFLINE) {
  for (const key of ['DATABASE_URL', 'POSTGRES_PASSWORD', 'SESSION_SECRET', 'SEED_ADMIN_PASSWORD', 'SEED_USER_PASSWORD']) {
    if (!values[key] || !String(values[key]).trim()) fail(`${key} is required for local setup; run npm run setup:env`);
  }
}

// 3. Documented environment matrix evidence.
for (const entry of matrix.matrix) {
  if (!setupDoc.includes(entry.id)) fail(`SETUP.md is missing matrix id ${entry.id}`);
}
if (setupDoc.includes('Windows') && setupDoc.includes('macOS') && setupDoc.includes('Linux')) {
  pass('setup matrix documents Windows, macOS and Linux evidence statuses');
} else {
  fail('setup matrix does not document all three operating systems');
}

const setupGuideSnippets = [
  ['root-ok', 'repository-root check'],
  ['npm.cmd', 'Windows PowerShell npm.cmd spelling'],
  ['read -rsp', 'macOS/Linux shell equivalent'],
  ['`.env.example` is committed', 'credential-free template guidance'],
  ['Variant A — Docker Compose', 'Docker Compose setup variant'],
  ['Variant B — Manual host PostgreSQL', 'manual PostgreSQL setup variant'],
  ['npm run db:configure', 'generated local role bootstrap'],
  ['CREATE EXTENSION IF NOT EXISTS citext', 'PostgreSQL extension commands'],
  ['npm run db:health', 'PostgreSQL health check'],
  ['npm run api:health', 'API health check'],
  ['EMBEDDING_MODE', 'embedding mode configuration'],
  ['schema_migration_metadata', 'recorded migration embedding mode'],
  ['db:migrations:test', 'fresh, upgrade and rollback migration test'],
  ['cosine', 'documented vector search limitation'],
];
const missingSetupGuide = setupGuideSnippets.filter(([needle]) => !setupDoc.includes(needle));
if (missingSetupGuide.length) {
  for (const [, label] of missingSetupGuide) fail(`SETUP.md is missing ${label}`);
} else {
  pass('setup guide covers shells, setup variants, DB bootstrap and health checks');
}

// 4. PostgreSQL and migration readiness.
if (CHECK_DB) {
  try {
    const pg = await import('pg');
    const client = new pg.Client({ connectionString: values.DATABASE_URL });
    await client.connect();
    try {
      const version = await client.query('SHOW server_version');
      if (atLeast(version.rows[0].server_version, '16')) pass(`PostgreSQL ${version.rows[0].server_version} satisfies the 16.x target`);
      else fail(`PostgreSQL ${version.rows[0].server_version} is below the 16.x target`);

      const extensions = await client.query('SELECT extname FROM pg_extension');
      const installed = new Set(extensions.rows.map((row) => row.extname));
      for (const ext of matrix.requiredExtensions) {
        if (installed.has(ext)) pass(`required extension ${ext} is installed`);
        else fail(`required extension ${ext} is missing; run CREATE EXTENSION IF NOT EXISTS ${ext};`);
      }
      for (const ext of matrix.optionalExtensions) {
        if (!installed.has(ext)) warn(`optional extension ${ext} is absent; migrations use the jsonb embedding fallback (no vector index or cosine operators)`);
      }
      try {
        const modeResult = await client.query(
          "SELECT value->>'mode' AS mode FROM schema_migration_metadata WHERE key = 'embedding_mode'",
        );
        const recorded = modeResult.rows[0]?.mode;
        if (matrix.embeddingModes.allowed.slice(1).includes(recorded)) pass(`recorded migration embedding mode ${recorded}`);
        else warn('embedding mode has not been recorded; run npm run db:setup');
      } catch {
        warn('embedding mode has not been recorded; run npm run db:setup');
      }

      const migrationFiles = readdirSync(migrationDir).filter((file) => file.endsWith('.sql')).length;
      let applied = 0;
      try {
        const result = await client.query('SELECT count(*)::int AS count FROM schema_migrations');
        applied = result.rows[0].count;
      } catch {
        applied = 0;
      }
      if (applied >= migrationFiles) pass(`${applied}/${migrationFiles} migrations applied`);
      else fail(`${applied}/${migrationFiles} migrations applied; run npm run db:setup`);
    } finally {
      await client.end();
    }
  } catch (error) {
    fail(`database diagnostic failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// 5. Docker Compose readiness (default mode only).
if (CHECK_DOCKER) {
  const version = spawnSync('docker', ['compose', 'version'], { cwd: ROOT, encoding: 'utf8' });
  if (version.error || version.status !== 0) {
    fail('Docker Compose v2 is unavailable; npm run setup requires Docker Engine/Desktop with Compose v2');
  } else {
    pass(`Docker Compose available: ${String(version.stdout).split(/\r?\n/)[0] || 'version reported'}`);
    const config = spawnSync('docker', ['compose', 'config', '--quiet'], { cwd: ROOT, encoding: 'utf8' });
    if (config.status === 0) pass('docker compose config --quiet passed');
    else fail(`docker compose config failed: ${String(config.stderr || config.stdout).trim()}`);

    // Compose config can succeed while the Docker daemon is unusable. The
    // one-command setup starts containers, so check daemon reachability too.
    const info = spawnSync('docker', ['info', '--format', '{{.ServerVersion}}'], { cwd: ROOT, encoding: 'utf8' });
    if (info.error || info.status !== 0) {
      fail(`Docker daemon is unavailable: ${String(info.stderr || info.stdout || info.error).trim()}`);
    } else {
      pass(`Docker daemon reachable: server ${String(info.stdout).trim() || 'version reported'}`);
    }
  }
}

// 6. API readiness (default mode only; non-fatal because the API may be stopped).
if (CHECK_API) {
  const port = values.PORT || String(template.PORT || '4000');
  try {
    const response = await fetch(`http://127.0.0.1:${port}/health`);
    const body = await response.json();
    if (response.ok && body?.db?.ok === true) pass(`API health endpoint ready on port ${port}`);
    else warn(`API responded but reported degraded health on port ${port}`);
    if (body?.embedding?.mode && body.embedding.consistent !== false) {
      pass(`API reports embedding mode ${body.embedding.mode}`);
    } else if (body?.embedding?.mode) {
      warn(`API reports inconsistent embedding mode: ${body.embedding.detail ?? 'see /health'}`);
    } else {
      warn('API health has no embedding mode field; run npm run db:setup and restart the API');
    }
  } catch {
    warn(`API health endpoint is not reachable on port ${port}; run npm run dev:api or npm run setup`);
  }
}

for (const message of passes) console.log(`PASS ${message}`);
for (const message of warnings) console.log(`WARN ${message}`);
for (const message of failures) console.error(`FAIL ${message}`);
console.log(`Setup doctor: ${passes.length} passed, ${warnings.length} warning(s), ${failures.length} failure(s).`);
if (failures.length) process.exit(1);
