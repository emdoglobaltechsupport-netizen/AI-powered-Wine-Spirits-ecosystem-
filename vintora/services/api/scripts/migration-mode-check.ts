/**
 * Disposable-schema migration contract test.
 *
 * Requires an explicit opt-in and a loopback PostgreSQL URL so it can never be
 * pointed at a hosted database by accident. CI runs it against both a stock
 * PostgreSQL 16 service (jsonb fallback) and the digest-pinned pgvector image.
 */
import { copyFile, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { config } from '../src/config.js';
import { embeddingModeHealth, migrate, type EmbeddingMode } from '../src/db/migrate.js';

if (process.env.VINTORA_MIGRATION_TEST !== '1') {
  throw new Error('Migration mode checks require VINTORA_MIGRATION_TEST=1 and a disposable loopback database');
}

const url = new URL(config.DATABASE_URL);
if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
  throw new Error('Migration mode checks refuse non-loopback DATABASE_URL values');
}

const expectedRaw = String(process.env.EXPECTED_EMBEDDING_MODE ?? '').trim().toLowerCase();
if (expectedRaw !== 'pgvector' && expectedRaw !== 'jsonb') {
  throw new Error('Set EXPECTED_EMBEDDING_MODE to pgvector or jsonb for this disposable database image');
}
const expected: EmbeddingMode = expectedRaw;

const realMigrationsDir = fileURLToPath(new URL('../../../packages/db/migrations/', import.meta.url));
const admin = new pg.Pool({ connectionString: config.DATABASE_URL, max: 1 });
const suffix = `${process.pid}_${Date.now()}`;
const freshSchema = `vintora_migtest_fresh_${suffix}`;
const legacySchema = `vintora_migtest_upgrade_${suffix}`;
let tempDir: string | null = null;

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(`ASSERT ${message}`);
  console.log(`PASS ${message}`);
}

function scopedPool(schema: string): pg.Pool {
  return new pg.Pool({
    connectionString: config.DATABASE_URL,
    // Keep public last so preinstalled extension types (citext, pgcrypto)
    // resolve while new objects still land in the disposable schema.
    options: `-c search_path=${schema},public`,
    max: 1,
  });
}

async function storageMode(pool: pg.Pool): Promise<string | undefined> {
  const result = await pool.query<{ udt_name: string }>(`
    SELECT udt_name FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'skus'
      AND column_name = 'embedding'
  `);
  return result.rows[0]?.udt_name;
}

async function prepareTempMigrations(): Promise<string> {
  tempDir = await mkdtemp(join(tmpdir(), 'vintora-migration-modes-'));
  for (const filename of await readdir(realMigrationsDir)) {
    if (filename.endsWith('.sql')) await copyFile(join(realMigrationsDir, filename), join(tempDir, filename));
  }
  return tempDir;
}

async function runScenario(label: string, schema: string): Promise<void> {
  await admin.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
  await admin.query(`CREATE SCHEMA ${schema}`);
  const scoped = scopedPool(schema);
  try {
    const fresh = await migrate({ pool: scoped, migrationsDir: realMigrationsDir, configuredMode: 'auto' });
    assert(fresh.embeddingMode === expected, `${label}: fresh migration selects ${expected}`);
    const actualStorage = await storageMode(scoped);
    assert(actualStorage === (expected === 'pgvector' ? 'vector' : 'jsonb'),
      `${label}: physical embedding column matches ${expected} (observed ${actualStorage ?? 'missing'})`);
    assert(fresh.applied.length > 0, `${label}: fresh migration applied tracked files`);

    const idempotent = await migrate({ pool: scoped, migrationsDir: realMigrationsDir, configuredMode: 'auto' });
    assert(idempotent.applied.length === 0 && idempotent.skipped === fresh.applied.length,
      `${label}: second migration pass is idempotent`);

    const workDir = tempDir ?? await prepareTempMigrations();
    await writeFile(join(workDir, '9998_test_rollback.sql'), [
      'CREATE TABLE migration_rollback_probe (id integer PRIMARY KEY);',
      'SELECT 1 / 0;',
      '',
    ].join('\n'));
    await rm(join(workDir, '9999_test_upgrade.sql'), { force: true });
    let rejected = false;
    try {
      await migrate({ pool: scoped, migrationsDir: workDir, configuredMode: 'auto' });
    } catch {
      rejected = true;
    }
    assert(rejected, `${label}: failing upgrade migration is rejected`);
    const rollback = await scoped.query<{ relation: string | null }>(
      "SELECT to_regclass('migration_rollback_probe')::text AS relation",
    );
    assert(!rollback.rows[0]?.relation, `${label}: failed migration rolled back its table`);

    await rm(join(workDir, '9998_test_rollback.sql'), { force: true });
    await writeFile(join(workDir, '9999_test_upgrade.sql'), [
      'CREATE TABLE migration_upgrade_probe (id integer PRIMARY KEY);',
      '',
    ].join('\n'));
    const upgraded = await migrate({ pool: scoped, migrationsDir: workDir, configuredMode: 'auto' });
    assert(upgraded.applied.includes('9999_test_upgrade.sql'), `${label}: later migration applies after rollback`);
    const probe = await scoped.query<{ relation: string | null }>(
      "SELECT to_regclass('migration_upgrade_probe')::text AS relation",
    );
    assert(Boolean(probe.rows[0]?.relation), `${label}: upgrade probe table exists`);

    const health = await embeddingModeHealth(scoped);
    assert(health.mode === expected && health.consistent,
      `${label}: health reports the recorded and physical embedding mode (${health.detail})`);
  } finally {
    await scoped.end();
    await admin.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
  }
}

try {
  await prepareTempMigrations();
  await runScenario('fresh', freshSchema);
  await runScenario('upgrade', legacySchema);
  console.log(`Migration mode checks passed: ${expected} fresh, idempotency, rollback, upgrade and health.`);
} finally {
  if (tempDir) await rm(tempDir, { recursive: true, force: true });
  await admin.end();
}
