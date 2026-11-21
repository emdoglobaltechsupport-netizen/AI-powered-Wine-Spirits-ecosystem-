import { Pool, type PoolClient, type QueryResultRow } from 'pg';
import { config } from '../config.js';
import { internal } from '../lib/errors.js';

/** One shared pool for the process. Never construct per-request pools. */
export const pool = new Pool({
  connectionString: config.DATABASE_URL,
  max: config.isTest ? 5 : 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
  application_name: 'vintora-api',
});

pool.on('error', (err) => {
  // An idle client error must not crash the process.
  console.error('[db] unexpected idle client error', err);
});

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: readonly unknown[] = [],
): Promise<T[]> {
  try {
    const result = await pool.query<T>(text, params as unknown[]);
    return result.rows;
  } catch (err) {
    console.error('[db] query failed', { text, err });
    throw internal('Database query failed');
  }
}

export async function one<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: readonly unknown[] = [],
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

/** Run a unit of work in a single transaction with automatic rollback. */
export async function transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function databaseHealth(): Promise<{ ok: boolean; latencyMs: number }> {
  const started = Date.now();
  await pool.query('SELECT 1');
  return { ok: true, latencyMs: Date.now() - started };
}
