#!/usr/bin/env node
/**
 * Database operations gate.
 *
 * Verifies that the quick start separates migrations, reference seeding and
 * local identity seeding; that applied migration files are checksummed; and
 * that rollback/backup guidance is present. It checks that an attached restore
 * drill result is explicitly prototype-only. This proves command, document and
 * local drill contracts only, not production migration or recovery readiness.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(ROOT, path), 'utf8');
const policy = JSON.parse(read('config/database-operations.json'));
const rootPkg = JSON.parse(read('package.json'));
const apiPkg = JSON.parse(read('services/api/package.json'));
const errors = [];
const fail = (message) => errors.push(message);
const requireText = (haystack, needle, label) => {
  if (!haystack.includes(needle)) fail(`${label} must contain ${JSON.stringify(needle)}`);
};

if (policy.status !== 'prototype-database-operations-design' || policy.prototypeMode !== true || policy.publicLaunch !== false) {
  fail('database operations policy must remain a prototype design with no public launch');
}
if (JSON.stringify(policy.allowedProfiles) !== JSON.stringify(['local', 'test'])) {
  fail('migration commands must be limited to local and test profiles');
}
if (policy.stagingRequiresManualEvidence !== true || policy.productionMigrationsAllowed !== false) {
  fail('staging must require manual evidence and production migrations must be blocked');
}

const commands = policy.commands ?? {};
if (commands['db:migrate']?.appliesMigrations !== true || commands['db:migrate']?.appliesReferenceSeed !== false || commands['db:migrate']?.createsDemoIdentities !== false) {
  fail('db:migrate must apply migrations only');
}
if (commands['db:setup']?.appliesMigrations !== true || commands['db:setup']?.appliesReferenceSeed !== true || commands['db:setup']?.createsDemoIdentities !== false) {
  fail('db:setup must apply migrations and reference rows but never identities');
}
if (commands['db:seed:dev']?.createsDemoIdentities !== true || commands['db:reset']?.implemented !== false) {
  fail('only db:seed:dev may create identities and db:reset must remain unavailable');
}
if (commands['db:dr:drill']?.implemented !== true || commands['db:dr:drill']?.productionAllowed !== false ||
    commands['db:dr:drill']?.appliesMigrations !== false || commands['db:dr:drill']?.appliesReferenceSeed !== false ||
    commands['db:dr:drill']?.createsDemoIdentities !== false) {
  fail('the local DR drill must be local/test-only and must not apply migrations, seed data or identities');
}

const runner = policy.migrationRunner ?? {};
if (runner.checksumAlgorithm !== 'sha256' || runner.checksumColumn !== 'content_sha256' ||
    runner.atomicMigrationAndTrackingInsert !== true || runner.checksumMismatchFailsClosed !== true ||
    runner.legacyChecksumBackfill !== true || runner.productionProfileBlocked !== true ||
    runner.automaticDownMigrations !== false) {
  fail('migration runner contract has drifted');
}
if (policy.backupAndRestore?.backupRequiredBeforeDestructiveOperation !== true ||
    policy.backupAndRestore?.restoreDrillEvidenceRef !== null ||
    policy.backupAndRestore?.restoreDrillEvidenceRefScope !== 'production' ||
    policy.backupAndRestore?.localPrototypeDrillRef !== 'evidence/local-dr-drill.json' ||
    JSON.stringify(policy.backupAndRestore?.localPrototypeDrillAllowedProfiles) !== JSON.stringify(['local', 'test']) ||
    policy.roles?.dedicatedMigrationRoleRequired !== true ||
    policy.roles?.applicationRoleMustNotOwnSchema !== true ||
    policy.roles?.adminDsnTransientOnly !== true ||
    policy.roles?.roleEvidenceRef !== null) {
  fail('production backup, restore and dedicated-role requirements must remain unevidenced; only the local prototype drill may be attached');
}
const localDrillRef = policy.backupAndRestore?.localPrototypeDrillRef;
if (localDrillRef) {
  const localDrillPath = join(ROOT, localDrillRef);
  if (!existsSync(localDrillPath)) {
    fail(`missing local prototype drill evidence: ${localDrillRef}`);
  } else {
    const drill = JSON.parse(readFileSync(localDrillPath, 'utf8'));
    if (drill.status !== 'local-prototype-dr-drill' || drill.prototypeMode !== true ||
        drill.publicLaunch !== false || drill.verdict !== 'NO-GO' ||
        drill.productionEvidenceRef !== null ||
        (drill.runtimeProfile !== 'local' && drill.runtimeProfile !== 'test') ||
        Object.values(drill.checks ?? {}).some((value) => value !== true) ||
        drill.fingerprint?.algorithm !== 'sha256' ||
        !drill.fingerprint?.source || drill.fingerprint?.source !== drill.fingerprint?.restored) {
      fail('local drill evidence must remain a passing prototype-only result with null production ref and NO-GO verdict');
    }
    if (!String(drill.note ?? '').includes('No production backup')) {
      fail('local drill evidence must disclaim production backup, PITR, RTO and RPO evidence');
    }
  }
}
if (policy.representativeDataCheck?.required !== true ||
    !String(policy.representativeDataCheck?.command ?? '').includes('catalogue:selftest')) {
  fail('representative-data checks must be required after schema changes');
}
if ((policy.rollback?.procedure?.length ?? 0) < 5 || policy.rollback?.failedMigrationTransactionRollbackTested !== true) {
  fail('rollback procedure must include at least five steps and transactional rollback evidence');
}
if (policy.ci?.freshApply !== true || policy.ci?.secondPassIdempotency !== true ||
    policy.ci?.failingUpgradeRollback !== true || policy.ci?.embeddingModeHealth !== true) {
  fail('CI migration contract must cover fresh, idempotent, rollback and health checks');
}

if (rootPkg.scripts?.['db:migrate'] === rootPkg.scripts?.['db:setup']) {
  fail('root db:migrate must not be an alias for db:setup');
}
for (const script of ['db:migrate', 'db:setup', 'db:seed:dev', 'db:reset', 'db:ops:check', 'db:dr:drill']) {
  if (!rootPkg.scripts?.[script]) fail(`package.json must define ${script}`);
}
if (rootPkg.scripts?.['db:dr:drill'] !== 'node scripts/local-dr-drill.mjs') {
  fail('db:dr:drill must invoke the local-only restore drill script');
}
if (!String(apiPkg.scripts?.['db:migrate'] ?? '').includes('migrate-cli.ts')) {
  fail('API db:migrate must use the schema-only migrate CLI');
}

const migrate = read('services/api/src/db/migrate.ts');
for (const needle of [
  "createHash('sha256')",
  'content_sha256',
  'Migration checksum mismatch',
  'assertMigrationEnvironment()',
  'Schema migrations are disabled in the production profile',
  'backfillMigrationChecksums',
  'Embedding mode mismatch',
]) {
  requireText(migrate, needle, 'services/api/src/db/migrate.ts');
}
requireText(read('services/api/src/db/migrate-cli.ts'), 'Schema-only entry point', 'migrate-cli.ts');
requireText(read('services/api/src/db/seed.ts'), 'Apply migrations and reference/demo catalogue data', 'seed.ts');
requireText(read('scripts/refuse-destructive-db-reset.mjs'), 'db:reset is intentionally unavailable', 'refuse-destructive-db-reset.mjs');
const drillScript = read('scripts/local-dr-drill.mjs');
for (const needle of [
  "runtimeProfile !== 'local' && runtimeProfile !== 'test'",
  'NODE_ENV=production',
  "'localhost', '127.0.0.1', '::1'",
  'productionEvidenceRef: null',
  "verdict: 'NO-GO'",
]) {
  requireText(drillScript, needle, 'scripts/local-dr-drill.mjs');
}

const doc = read('DATABASE_OPERATIONS.md');
for (const heading of [
  '## 1. Command separation',
  '## 2. Profile and role guards',
  '## 3. Checksum and state protection',
  '## 4. Backup, restore and representative-data checks',
  '## 5. Rollback procedure',
  '## 6. Evidence gaps',
]) {
  requireText(doc, heading, 'DATABASE_OPERATIONS.md');
}
for (const needle of [
  'db:reset is intentionally refused',
  'dedicated migration role',
  'SHA-256',
  'No production restore drill',
  'local prototype restore drill',
  'evidence/local-dr-drill.json',
  'npm run catalogue:selftest && npm run accessories:selftest && npm run africa:selftest',
]) {
  requireText(doc, needle, 'DATABASE_OPERATIONS.md');
}
requireText(read('SETUP.md'), '[`DATABASE_OPERATIONS.md`](./DATABASE_OPERATIONS.md)', 'SETUP.md');

const workflow = read('.github/workflows/ci-migrations.yml');
requireText(workflow, 'npm run db:migrations:test', 'ci-migrations.yml');
requireText(workflow, 'Re-apply migrations and catalogue seed (idempotency proof)', 'ci-migrations.yml');
requireText(read('services/api/scripts/migration-mode-check.ts'), 'failing upgrade migration is rejected', 'migration-mode-check.ts');

for (const ref of policy.references ?? []) {
  if (!existsSync(join(ROOT, ref))) fail(`missing database operations reference: ${ref}`);
}

if (errors.length) {
  console.error(`Database operations check failed: ${errors.length} finding(s).`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}
console.log('Database operations check passed: migrations, reference seed and dev identities are separate.');
console.log('Applied migrations are SHA-256 checked; production, destructive reset and down migrations remain blocked.');
console.log('A local prototype restore drill is attached as prototype evidence; production restore and role evidence remain absent.');
