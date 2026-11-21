#!/usr/bin/env node
/**
 * Cross-platform focused health checks. Both modes exit non-zero on failure.
 *   node scripts/service-health.mjs db
 *   node scripts/service-health.mjs api
 */
import { config } from 'dotenv';
import pg from 'pg';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ENV_PATH = join(ROOT, '.env');
const mode = process.argv[2];

if (existsSync(ENV_PATH)) config({ path: ENV_PATH, override: false });

function fail(message) {
  console.error(message);
  process.exit(1);
}

async function checkDatabase() {
  const url = String(process.env.DATABASE_URL ?? '').trim();
  if (!url) fail('Database health failed: DATABASE_URL is missing; run npm run setup:env');

  const client = new pg.Client({
    connectionString: url,
    connectionTimeoutMillis: 5_000,
    query_timeout: 8_000,
  });

  try {
    await client.connect();
    const version = await client.query('SHOW server_version');
    const extensions = await client.query('SELECT extname FROM pg_extension');
    const installed = new Set(extensions.rows.map((row) => row.extname));
    const missing = ['citext', 'pgcrypto', 'pg_trgm'].filter((extension) => !installed.has(extension));
    if (missing.length) fail(`Database health failed: missing extension(s): ${missing.join(', ')}`);

    console.log(`Database health: PostgreSQL ${version.rows[0].server_version} ready; required extensions present.`);
    let recordedMode = 'unrecorded';
    try {
      const modeResult = await client.query(
        "SELECT value->>'mode' AS mode FROM schema_migration_metadata WHERE key = 'embedding_mode'",
      );
      if (modeResult.rows[0]?.mode) recordedMode = modeResult.rows[0].mode;
    } catch {
      // Metadata is created by migrations; absence is reported, not hidden.
    }
    console.log(`Embedding mode: ${recordedMode} (pgvector ${installed.has('vector') ? 'available' : 'absent'}).`);
    if (!installed.has('vector')) {
      console.warn('WARN pgvector absent; migrations use jsonb (no vector index or cosine operators)');
    }
  } catch (error) {
    fail(`Database health failed: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    await client.end().catch(() => {});
  }
}

async function checkApi() {
  const port = process.env.API_PORT ?? process.env.PORT ?? '4000';
  const base = String(process.env.API_BASE_URL ?? `http://127.0.0.1:${port}`).replace(/\/$/, '');
  try {
    const response = await fetch(`${base}/health`, { signal: AbortSignal.timeout(5_000) });
    const body = await response.json();
    if (!response.ok || body?.db?.ok !== true) {
      fail(`API health failed: ${base}/health returned HTTP ${response.status} with degraded database status`);
    }
    console.log(`API health: ok (runtimeProfile=${body.runtimeProfile ?? 'unknown'}, runtimeBoundaryOk=${body.runtimeBoundaryOk ?? 'unknown'}).`);
    if (body?.embedding?.mode) {
      console.log(`Embedding mode: ${body.embedding.mode} (configured=${body.embedding.configuredMode ?? 'auto'}, consistent=${body.embedding.consistent ?? 'unknown'}).`);
      if (body.embedding.consistent === false) console.warn(`WARN embedding mode mismatch: ${body.embedding.detail ?? 'see /health'}`);
    } else {
      console.warn('WARN API health has no embedding mode field; rerun npm run db:setup and restart the API');
    }
  } catch (error) {
    if (error?.message?.startsWith('API health failed:')) throw error;
    fail(`API health failed: ${base}/health is not reachable; start npm run dev:api or npm run setup (${error instanceof Error ? error.message : String(error)})`);
  }
}

try {
  if (mode === 'db') await checkDatabase();
  else if (mode === 'api') await checkApi();
  else fail('Usage: node scripts/service-health.mjs <db|api>');
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
