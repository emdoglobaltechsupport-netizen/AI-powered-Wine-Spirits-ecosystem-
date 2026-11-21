import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Pool } from 'pg';
import { config } from '../config.js';
import { pool as defaultPool } from './pool.js';

const defaultMigrationsDir = fileURLToPath(new URL('../../../../packages/db/migrations/', import.meta.url));

export type EmbeddingModeSetting = 'auto' | 'pgvector' | 'jsonb';
export type EmbeddingMode = 'pgvector' | 'jsonb';
export type ObservedEmbeddingMode = EmbeddingMode | 'unknown';

type RunnerPool = Pick<Pool, 'query' | 'connect'>;

export interface MigrationOptions {
  pool?: RunnerPool;
  migrationsDir?: string;
  configuredMode?: EmbeddingModeSetting;
}

export interface MigrationRunSummary {
  applied: string[];
  skipped: number;
  embeddingMode: EmbeddingMode;
  configuredMode: EmbeddingModeSetting;
  extensionAvailable: boolean;
  extensionVersion: string | null;
  verifiedChecksums: number;
  backfilledChecksums: number;
}

export interface EmbeddingModeHealth {
  configuredMode: EmbeddingModeSetting;
  mode: ObservedEmbeddingMode;
  recordedMode: ObservedEmbeddingMode;
  storageMode: ObservedEmbeddingMode;
  extensionAvailable: boolean;
  extensionVersion: string | null;
  consistent: boolean;
  detail: string;
}

interface VectorCapability {
  available: boolean;
  version: string | null;
  reason: string | null;
}

export function parseEmbeddingMode(value: string | undefined): EmbeddingModeSetting {
  const mode = String(value ?? 'auto').trim().toLowerCase();
  if (mode === 'auto' || mode === 'pgvector' || mode === 'jsonb') return mode;
  throw new Error(`EMBEDDING_MODE must be auto, pgvector or jsonb; received ${JSON.stringify(mode)}`);
}

function shortReason(error: unknown): string {
  return error instanceof Error ? error.message.slice(0, 240) : String(error).slice(0, 240);
}

/**
 * Check capability without mutating schema on the health path. Migrations may
 * install pgvector explicitly in their own transaction.
 */
async function inspectVector(pool: RunnerPool): Promise<VectorCapability> {
  const result = await pool.query<{ extversion: string }>(
    "SELECT extversion FROM pg_extension WHERE extname = 'vector'",
  );
  const version = result.rows[0]?.extversion ?? null;
  return { available: Boolean(version), version, reason: null };
}

async function detectVector(pool: RunnerPool, configuredMode: EmbeddingModeSetting): Promise<{
  mode: EmbeddingMode;
  capability: VectorCapability;
}> {
  let capability = await inspectVector(pool);
  if (!capability.available) {
    try {
      await pool.query('CREATE EXTENSION IF NOT EXISTS vector');
      capability = await inspectVector(pool);
      if (!capability.available) capability = { ...capability, available: true, version: 'unknown' };
    } catch (error) {
      capability = { available: false, version: null, reason: shortReason(error) };
    }
  }

  if (configuredMode === 'pgvector' && !capability.available) {
    throw new Error(`EMBEDDING_MODE=pgvector requires pgvector, but it is unavailable: ${capability.reason ?? 'extension not installed'}`);
  }

  if (!capability.available && configuredMode !== 'jsonb') {
    console.warn('[db] pgvector unavailable — embedding columns will use jsonb (see SETUP.md embedding mode notes)');
  }
  if (configuredMode === 'jsonb' && capability.available) {
    console.warn('[db] pgvector is installed but EMBEDDING_MODE=jsonb forces the portable fallback');
  }

  const mode: EmbeddingMode = configuredMode === 'jsonb'
    ? 'jsonb'
    : capability.available ? 'pgvector' : 'jsonb';
  return { mode, capability };
}

/**
 * Make the canonical SQL portable to a stock PostgreSQL install.
 * pgvector keeps native `vector(1536)` columns and its cosine index. The
 * jsonb fallback stores the same numbers in a JSON array without a vector
 * index or cosine operators; it is a prototype compatibility path, not an
 * equivalent large-scale similarity index.
 */
export function portableMigrationSql(sql: string, hasVector: boolean): string {
  let out = sql;
  if (!hasVector) {
    out = out.replace(/^\s*CREATE EXTENSION IF NOT EXISTS "vector";\s*$/gim, '');
    out = out.replace(/vector\(1536\)/g, 'jsonb');
  }
  // The runner owns the transaction so migration tracking is atomic.
  out = out.replace(/^\s*BEGIN;\s*$/gim, '').replace(/^\s*COMMIT;\s*$/gim, '');
  return out;
}

/** SHA-256 over the raw migration source, independent of embedding-mode rewriting. */
export function migrationChecksum(sql: string): string {
  return createHash('sha256').update(sql, 'utf8').digest('hex');
}

/** Migrations are a local/test operation in this prototype; production is blocked. */
export function assertMigrationEnvironment(): void {
  const profile = String(config.runtimeBoundary.profile ?? '');
  if (config.isProduction || profile === 'production') {
    throw new Error('Schema migrations are disabled in the production profile');
  }
}

async function ensureMigrationMetadata(pool: RunnerPool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename      text PRIMARY KEY,
      applied_at    timestamptz NOT NULL DEFAULT now(),
      embedding_mode text
    )
  `);
  await pool.query('ALTER TABLE schema_migrations ADD COLUMN IF NOT EXISTS embedding_mode text');
  await pool.query('ALTER TABLE schema_migrations ADD COLUMN IF NOT EXISTS content_sha256 text');
  await pool.query('ALTER TABLE schema_migrations ADD COLUMN IF NOT EXISTS source_bytes integer');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migration_metadata (
      key        text PRIMARY KEY,
      value      jsonb NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);
}

interface MigrationSource {
  filename: string;
  sql: string;
  checksum: string;
}

async function readMigrationSources(migrationsDir: string): Promise<MigrationSource[]> {
  const files = (await readdir(migrationsDir))
    .filter((filename) => filename.endsWith('.sql'))
    .sort();
  return Promise.all(files.map(async (filename) => {
    const sql = await readFile(join(migrationsDir, filename), 'utf8');
    return { filename, sql, checksum: migrationChecksum(sql) };
  }));
}

/** Backfill legacy rows once so future edits to applied files fail closed. */
async function backfillMigrationChecksums(pool: RunnerPool, sources: MigrationSource[]): Promise<number> {
  let backfilled = 0;
  for (const source of sources) {
    const result = await pool.query(
      `UPDATE schema_migrations
          SET content_sha256 = $2, source_bytes = $3
        WHERE filename = $1 AND content_sha256 IS NULL`,
      [source.filename, source.checksum, Buffer.byteLength(source.sql, 'utf8')],
    );
    if (result.rowCount) backfilled += 1;
  }
  return backfilled;
}

async function physicalStorageMode(pool: RunnerPool): Promise<ObservedEmbeddingMode> {
  const result = await pool.query<{ udt_name: string }>(`
    SELECT udt_name
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'skus'
      AND column_name = 'embedding'
  `);
  const udt = result.rows[0]?.udt_name;
  if (udt === 'vector') return 'pgvector';
  if (udt === 'jsonb') return 'jsonb';
  return 'unknown';
}

async function readRecordedMode(pool: RunnerPool): Promise<ObservedEmbeddingMode> {
  try {
    const result = await pool.query<{ mode: string }>(`
      SELECT value->>'mode' AS mode FROM schema_migration_metadata WHERE key = 'embedding_mode'
    `);
    const mode = result.rows[0]?.mode;
    if (mode === 'pgvector' || mode === 'jsonb') return mode;
  } catch {
    // Metadata table predates this check; physical column inspection still works.
  }
  return 'unknown';
}

export async function embeddingModeHealth(
  pool: RunnerPool = defaultPool,
): Promise<EmbeddingModeHealth> {
  const configuredMode = parseEmbeddingMode(config.EMBEDDING_MODE);
  let extensionAvailable = false;
  let extensionVersion: string | null = null;
  try {
    const capability = await inspectVector(pool);
    extensionAvailable = capability.available;
    extensionVersion = capability.version;
  } catch {
    // Health remains observable even when the capability query is unavailable.
  }

  const [recordedMode, storageMode] = await Promise.all([
    readRecordedMode(pool),
    physicalStorageMode(pool),
  ]);
  const mode = recordedMode !== 'unknown' ? recordedMode : storageMode;
  const consistent = mode !== 'unknown'
    && storageMode !== 'unknown'
    && mode === storageMode
    && (configuredMode === 'auto' || configuredMode === mode);

  const detail = mode === 'unknown'
    ? 'migrations have not recorded an embedding mode on this database'
    : consistent
      ? `migrations and skus.embedding both use ${mode}`
      : `recorded=${recordedMode}, storage=${storageMode}, configured=${configuredMode}`;
  return {
    configuredMode,
    mode,
    recordedMode,
    storageMode,
    extensionAvailable,
    extensionVersion,
    consistent,
    detail,
  };
}

export async function migrate(options: MigrationOptions = {}): Promise<MigrationRunSummary> {
  assertMigrationEnvironment();
  const runnerPool = options.pool ?? defaultPool;
  const migrationsDir = options.migrationsDir ?? defaultMigrationsDir;
  const configuredMode = parseEmbeddingMode(options.configuredMode ?? config.EMBEDDING_MODE);
  const { mode, capability } = await detectVector(runnerPool, configuredMode);

  await ensureMigrationMetadata(runnerPool);

  // Older databases predate mode recording. Backfill from the physical column
  // type, which is the source of truth for how earlier migrations were written.
  const priorStorage = await physicalStorageMode(runnerPool);
  if (priorStorage !== 'unknown') {
    await runnerPool.query(
      'UPDATE schema_migrations SET embedding_mode = $1 WHERE embedding_mode IS NULL',
      [priorStorage],
    );
  }

  const sources = await readMigrationSources(migrationsDir);
  const backfilledChecksums = await backfillMigrationChecksums(runnerPool, sources);

  const applied: string[] = [];
  let skipped = 0;
  let verifiedChecksums = 0;

  for (const source of sources) {
    const existing = await runnerPool.query<{ content_sha256: string | null }>(
      'SELECT content_sha256 FROM schema_migrations WHERE filename = $1',
      [source.filename],
    );
    if (existing.rowCount) {
      const recorded = existing.rows[0]?.content_sha256 ?? null;
      if (recorded && recorded !== source.checksum) {
        throw new Error(
          `Migration checksum mismatch: ${source.filename} was applied with ${recorded} but the source is now ${source.checksum}. ` +
          'Do not edit applied migrations; create a reviewed forward migration or recreate the disposable database.',
        );
      }
      if (recorded) verifiedChecksums += 1;
      skipped += 1;
      continue;
    }

    const sql = portableMigrationSql(source.sql, mode === 'pgvector');
    const client = await runnerPool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query(
        `INSERT INTO schema_migrations (filename, embedding_mode, content_sha256, source_bytes)
         VALUES ($1, $2, $3, $4)`,
        [source.filename, mode, source.checksum, Buffer.byteLength(source.sql, 'utf8')],
      );
      await client.query('COMMIT');
      applied.push(source.filename);
    } catch (err) {
      await client.query('ROLLBACK');
      throw new Error(`Migration ${source.filename} failed: ${shortReason(err)}`);
    } finally {
      client.release();
    }
  }

  const finalStorage = await physicalStorageMode(runnerPool);
  if (finalStorage !== 'unknown' && finalStorage !== mode) {
    throw new Error(
      `Embedding mode mismatch: migrations selected ${mode} but skus.embedding is ${finalStorage}. ` +
      'Use a fresh disposable database or align EMBEDDING_MODE with the existing schema.',
    );
  }

  await runnerPool.query(`
    INSERT INTO schema_migration_metadata (key, value)
    VALUES ('embedding_mode', $1::jsonb)
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
  `, [JSON.stringify({
    mode,
    configuredMode,
    extensionAvailable: capability.available,
    extensionVersion: capability.version,
    extensionError: capability.reason,
    appliedCount: applied.length,
    skippedCount: skipped,
    checksumAlgorithm: 'sha256',
    verifiedChecksums,
    backfilledChecksums,
    recordedAt: new Date().toISOString(),
  })]);

  console.log(
    `[db] embedding mode: ${mode} (configured=${configuredMode}, pgvector=${capability.version ?? 'unavailable'})`,
  );
  console.log(`[db] migration checksums: ${verifiedChecksums} verified, ${backfilledChecksums} backfilled`);
  if (mode === 'jsonb') {
    console.warn('[db] jsonb fallback has no vector index or cosine operators; see SETUP.md for prototype limitations');
  }

  return {
    applied,
    skipped,
    embeddingMode: mode,
    configuredMode,
    extensionAvailable: capability.available,
    extensionVersion: capability.version,
    verifiedChecksums,
    backfilledChecksums,
  };
}
