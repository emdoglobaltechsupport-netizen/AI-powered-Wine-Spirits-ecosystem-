#!/usr/bin/env node
/**
 * Demo credential gate.
 *
 * Generated local credentials may exist only in gitignored .env files or
 * throwaway CI setup. The seed path must be explicitly disabled outside the
 * prototype, and committed files must not contain reusable demo passwords.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => readFileSync(join(ROOT, relativePath), 'utf8');
const EXTENSIONS = new Set(['.js', '.mjs', '.cjs', '.ts', '.tsx', '.json', '.yml', '.yaml', '.md', '.ps1', '.sh', '.example']);
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', '.next', 'out', 'coverage', '.turbo', 'sbom']);
const ALLOW_LOCALDEV = new Set([
  'scripts/lib/local-env.mjs',
  '.github/workflows/ci-migrations.yml',
]);

const errors = [];
const envExample = read('.env.example');
const configSource = read('services/api/src/config.ts');
const seedSource = read('services/api/src/db/seed.ts');
const compose = read('docker-compose.yml');
const identitySeed = read('packages/db/seed/005_identity_access_seed.sql');
const setupCli = read('services/api/src/db/cli.ts');
const devSeedCli = read('services/api/src/db/seed-dev-cli.ts');
const rootScripts = JSON.parse(read('package.json')).scripts;
const apiScripts = JSON.parse(read('services/api/package.json')).scripts;

if (!/^ALLOW_DEMO_SEED=false$/m.test(envExample)) errors.push('.env.example must set ALLOW_DEMO_SEED=false');
if (!configSource.includes('ALLOW_DEMO_SEED')) errors.push('services/api/src/config.ts must declare ALLOW_DEMO_SEED');
if (!configSource.includes('Seed credentials (development only)')) errors.push('seed credentials must be labelled development-only in config.ts');
if (!seedSource.includes('config.isProduction') || !seedSource.includes('ALLOW_DEMO_SEED')) {
  errors.push('seedDatabase() must reject production and require an explicit demo-seed opt-in');
}
if (!seedSource.includes('Demo identity seeding is disabled in production')) {
  errors.push('seedDatabase() must fail closed with an explicit production error');
}
if (!/NODE_ENV:\s*development/.test(compose)) errors.push('docker-compose.yml must force NODE_ENV=development');
if (!identitySeed.includes('not-a-real-licence')) errors.push('simulated identity licences must retain the not-a-real-licence marker');
if (!seedSource.includes('export async function seedDevIdentities')) {
  errors.push('demo identities must live in an explicit development-only seed function');
}
if (!devSeedCli.includes('seedDevIdentities') || !apiScripts['db:seed:dev'] || !rootScripts['db:seed:dev']) {
  errors.push('db:seed:dev must invoke the development-only identity seed');
}
if (setupCli.includes('seedDevIdentities')) {
  errors.push('db:setup must not create demo identities; use db:seed:dev explicitly');
}

function walk(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      walk(path);
      continue;
    }
    if (!entry.isFile()) continue;
    if (entry.name === '.env' || entry.name.startsWith('.env.') && entry.name !== '.env.example') continue;
    if (!EXTENSIONS.has(extname(entry.name))) continue;
    if (statSync(path).size > 1_000_000) continue;
    const rel = relative(ROOT, path).replace(/\\/g, '/');
    if (ALLOW_LOCALDEV.has(rel)) continue;
    const content = readFileSync(path, 'utf8');
    if (/LocalDev-[A-Za-z0-9_-]{8,}/.test(content)) {
      errors.push(`${rel} contains a generated demo password pattern outside the local generator/CI`);
    }
  }
}
walk(ROOT);

if (errors.length) {
  console.error(`Demo credential check failed: ${errors.length} finding(s).`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log('Demo credential check passed: local/test-only dev seed, production seeding disabled, env template credential-free, generated passwords confined to local .env/CI.');
