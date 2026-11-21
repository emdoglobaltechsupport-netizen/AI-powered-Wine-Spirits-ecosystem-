#!/usr/bin/env node
/**
 * Create/align the local PostgreSQL role and database from generated .env
 * values. This command never prints the generated database password.
 *
 * It needs a temporary superuser DSN in VINTORA_PG_ADMIN_URL. That value is a
 * shell-only credential: it is not a .env key and must never be committed.
 */
import { config } from 'dotenv';
import pg from 'pg';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ENV_PATH = join(ROOT, '.env');

const quoteIdentifier = (value) => `"${String(value).replace(/"/g, '""')}"`;
const quoteLiteral = (value) => `'${String(value).replace(/'/g, "''")}'`;

async function main() {
  if (!existsSync(ENV_PATH)) throw new Error('.env is missing; run npm run setup:env first');
  config({ path: ENV_PATH, override: false });

  const adminUrl = String(process.env.VINTORA_PG_ADMIN_URL ?? '').trim();
  const user = String(process.env.POSTGRES_USER ?? 'vintora');
  const database = String(process.env.POSTGRES_DB ?? 'vintora');
  const password = String(process.env.POSTGRES_PASSWORD ?? '');

  if (!adminUrl) throw new Error('VINTORA_PG_ADMIN_URL is required for local DB role configuration');
  if (!password) throw new Error('POSTGRES_PASSWORD is missing; run npm run setup:env first');

  const admin = new pg.Client({
    connectionString: adminUrl,
    connectionTimeoutMillis: 10_000,
    query_timeout: 10_000,
  });

  try {
    await admin.connect();

    const role = await admin.query('SELECT 1 FROM pg_roles WHERE rolname = $1', [user]);
    if (role.rowCount) {
      await admin.query(`ALTER ROLE ${quoteIdentifier(user)} WITH LOGIN PASSWORD ${quoteLiteral(password)}`);
    } else {
      await admin.query(`CREATE ROLE ${quoteIdentifier(user)} LOGIN PASSWORD ${quoteLiteral(password)}`);
    }

    const target = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [database]);
    if (!target.rowCount) {
      await admin.query(`CREATE DATABASE ${quoteIdentifier(database)} OWNER ${quoteIdentifier(user)}`);
    }
  } finally {
    await admin.end().catch(() => {});
  }

  const app = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 10_000,
    query_timeout: 10_000,
  });
  const warnings = [];

  try {
    await app.connect();
    for (const extension of ['citext', 'pgcrypto', 'pg_trgm']) {
      await app.query(`CREATE EXTENSION IF NOT EXISTS ${extension}`);
    }
    try {
      await app.query('CREATE EXTENSION IF NOT EXISTS vector');
    } catch {
      warnings.push('optional pgvector extension unavailable; migrations will use the jsonb fallback');
    }
  } finally {
    await app.end().catch(() => {});
  }

  console.log(`Local DB configured: role=${user} database=${database} extensions=citext,pgcrypto,pg_trgm ready`);
  for (const warning of warnings) console.warn(`WARN ${warning}`);
  console.log('Generated password was not printed. Run npm run db:health to verify the connection.');
}

try {
  await main();
} catch (error) {
  console.error(`Local DB configuration failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
