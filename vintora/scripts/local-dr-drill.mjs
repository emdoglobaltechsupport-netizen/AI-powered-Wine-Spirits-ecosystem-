#!/usr/bin/env node
/**
 * Local prototype backup/restore drill.
 *
 * Takes a logical pg_dump of the public schema, restores it into a throwaway
 * schema in the same disposable local database, compares SHA-256 fingerprints
 * of all table row counts and the applied migration rows, then drops the
 * throwaway schema. No CREATEDB privilege, production data or offsite copy is
 * involved. The recorded result is prototype evidence only.
 *
 * Passwords are supplied to libpq through PGPASSWORD and redacted from output.
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import pg from 'pg';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ENV_PATH = join(ROOT, '.env');
if (existsSync(ENV_PATH)) config({ path: ENV_PATH, override: false });

const RESULT_PATH = join(ROOT, 'evidence', 'local-dr-drill.json');
const DUMP_PATH = join(ROOT, '.local-dr-drill.dump');
const RESTORE_SQL_PATH = join(ROOT, '.local-dr-drill-restore.sql');
const errors = [];
const fail = (message) => { errors.push(message); };

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('Local DR drill failed: DATABASE_URL is not configured. Run npm run db:configure first.');
  process.exit(1);
}

let url;
try {
  url = new URL(databaseUrl);
} catch {
  console.error('Local DR drill failed: DATABASE_URL is not a valid URL.');
  process.exit(1);
}

const sourceName = decodeURIComponent(url.pathname.slice(1));
const host = url.hostname || '127.0.0.1';
const port = url.port || '5432';
const user = decodeURIComponent(url.username);
const password = url.password ? decodeURIComponent(url.password) : '';
if (!sourceName || !user) {
  console.error('Local DR drill failed: DATABASE_URL must include a database name and user.');
  process.exit(1);
}

const runtimeProfile = String(process.env.RUNTIME_PROFILE ?? 'local').toLowerCase();
if (runtimeProfile !== 'local' && runtimeProfile !== 'test') {
  console.error(`Local DR drill failed: RUNTIME_PROFILE=${runtimeProfile} is not a disposable local/test profile.`);
  process.exit(1);
}
if (String(process.env.NODE_ENV ?? '').toLowerCase() === 'production') {
  console.error('Local DR drill failed: NODE_ENV=production is not permitted for the local drill.');
  process.exit(1);
}
if (!['localhost', '127.0.0.1', '::1'].includes(host.toLowerCase())) {
  console.error('Local DR drill failed: DATABASE_URL must point to a loopback host; remote databases are not permitted.');
  process.exit(1);
}
if (process.env.POSTGRES_DB && sourceName !== process.env.POSTGRES_DB) {
  console.error('Local DR drill failed: DATABASE_URL database must match the generated POSTGRES_DB value.');
  process.exit(1);
}

const schema = `dr_${new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14).toLowerCase()}`;
if (!/^[a-z0-9_]+$/.test(schema)) {
  console.error('Local DR drill failed: generated restore schema name is invalid.');
  process.exit(1);
}

const redact = (value) => {
  const text = String(value ?? '');
  return password ? text.split(password).join('[REDACTED]') : text;
};

const toolPath = (name) => {
  const executable = process.platform === 'win32' ? `${name}.exe` : name;
  const candidates = [
    process.env.PG_BIN_DIR ? join(process.env.PG_BIN_DIR, executable) : null,
    process.platform === 'win32' ? join('C:\\Program Files\\PostgreSQL\\16\\bin', executable) : null,
    name,
  ].filter(Boolean);
  for (const candidate of candidates) {
    if (candidate === name || existsSync(candidate)) return candidate;
  }
  return name;
};
const toolVersion = (name) => {
  const result = spawnSync(toolPath(name), ['--version'], { encoding: 'utf8' });
  if (result.status !== 0) return null;
  return redact(result.stdout).trim();
};
const runTool = (name, args) => {
  const result = spawnSync(toolPath(name), args, {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env, PGPASSWORD: password },
  });
  if (result.error) fail(`${name} could not start: ${redact(result.error.message)}`);
  if (result.status !== 0) {
    fail(`${name} exited ${result.status}: ${redact(result.stderr || result.stdout).trim()}`);
  }
  return result;
};

const fingerprint = async (client, targetSchema) => {
  const tables = await client.query(
    'select table_name from information_schema.tables where table_schema = $1 and table_type = \'BASE TABLE\' order by table_name',
    [targetSchema]
  );
  const counts = {};
  for (const row of tables.rows) {
    const table = row.table_name;
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(table)) {
      fail(`unexpected table identifier in ${targetSchema}: ${table}`);
      continue;
    }
    const counted = await client.query(`select count(*)::bigint as n from "${targetSchema}"."${table}"`);
    counts[table] = Number(counted.rows[0].n);
  }
  const migrationColumns = await client.query(
    'select column_name from information_schema.columns where table_schema = $1 and table_name = \'schema_migrations\' order by ordinal_position',
    [targetSchema]
  );
  const allowedMigrationColumns = new Set(['filename', 'applied_at', 'embedding_mode', 'content_sha256']);
  const columns = migrationColumns.rows
    .map((row) => row.column_name)
    .filter((name) => allowedMigrationColumns.has(name));
  if (!columns.includes('filename')) fail(`${targetSchema}.schema_migrations has no filename column`);
  const selected = columns.map((name) => `"${name}"`).join(', ');
  const migrations = await client.query(`select ${selected} from "${targetSchema}".schema_migrations order by filename`);
  const migrationRows = migrations.rows;
  const digest = createHash('sha256')
    .update(JSON.stringify({ counts, migrationRows }))
    .digest('hex');
  return { digest, tableCount: Object.keys(counts).length, migrationRowCount: migrationRows.length };
};

const client = new pg.Client({ connectionString: databaseUrl });
let schemaCreated = false;
let schemaDropped = false;
let forcedRlsTables = [];

if (existsSync(RESULT_PATH)) rmSync(RESULT_PATH, { force: true });

try {
  await client.connect();

  const existing = await client.query('select 1 from information_schema.schemata where schema_name = $1', [schema]);
  if (existing.rowCount) fail(`throwaway restore schema already exists: ${schema}`);

  const rls = await client.query(
    "select relname from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r' and relforcerowsecurity order by relname"
  );
  forcedRlsTables = rls.rows.map((row) => row.relname);
  for (const table of forcedRlsTables) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(table)) {
      fail(`unexpected forced-RLS table identifier: ${table}`);
      continue;
    }
    await client.query(`alter table "public"."${table}" no force row level security`);
  }

  if (!errors.length) {
    runTool('pg_dump', [
      '--format=plain', '--schema=public', '--no-owner', '--no-privileges',
      '--host', host, '--port', port, '--username', user,
      '--dbname', sourceName, '--file', DUMP_PATH,
    ]);
  }
  if (!errors.length && !existsSync(DUMP_PATH)) fail('pg_dump did not create a backup file');

  if (!errors.length) {
    const dumpLines = readFileSync(DUMP_PATH, 'utf8').split(/\r?\n/);
    const dumpedObjects = new Set();
    for (const line of dumpLines) {
      const match = line.match(/\b(?:CREATE TABLE|CREATE SEQUENCE|CREATE TYPE|CREATE DOMAIN|CREATE FUNCTION|CREATE VIEW|CREATE MATERIALIZED VIEW|COPY)\s+public\.([A-Za-z_][A-Za-z0-9_]*)/i);
      if (match) dumpedObjects.add(match[1]);
    }
    const restoreSql = dumpLines
      .filter((line) => !/^\s*(CREATE SCHEMA\b|CREATE EXTENSION\b|COMMENT ON EXTENSION\b|ALTER .* OWNER TO\b|GRANT\b|REVOKE\b|ALTER DEFAULT PRIVILEGES\b|ALTER TABLE .* ROW LEVEL SECURITY\b)/i.test(line))
      .map((line) => line.replace(/\bpublic\.([A-Za-z_][A-Za-z0-9_]*)/g, (full, name) => dumpedObjects.has(name) ? `${schema}.${name}` : full))
      .join('\n');
    writeFileSync(RESTORE_SQL_PATH, restoreSql);
    await client.query(`create schema "${schema}"`);
    schemaCreated = true;
    runTool('psql', [
      '-v', 'ON_ERROR_STOP=1', '-q',
      '-h', host, '-p', port, '-U', user, '-d', sourceName,
      '-f', RESTORE_SQL_PATH,
    ]);
  }

  if (!errors.length) {
    const source = await fingerprint(client, 'public');
    const restored = await fingerprint(client, schema);
    if (source.migrationRowCount === 0) fail('source database has no applied migration rows');
    if (source.tableCount === 0) fail('source public schema has no base tables');
    if (source.digest !== restored.digest) fail('restored schema fingerprint does not match the source');
    if (source.migrationRowCount !== restored.migrationRowCount) fail('restored migration row count does not match the source');
    if (!errors.length) {
      const result = {
        version: 1,
        status: 'local-prototype-dr-drill',
        prototypeMode: true,
        publicLaunch: false,
        verdict: 'NO-GO',
        executedOn: new Date().toISOString(),
        runtimeProfile,
        scope: 'Local host PostgreSQL logical dump restored into a throwaway schema in the same disposable database; no production data or deployment.',
        sourceLabel: 'public schema of the disposable local prototype database',
        targetLabel: 'throwaway restore schema (dropped after comparison)',
        toolVersions: { pg_dump: toolVersion('pg_dump'), psql: toolVersion('psql') },
        checks: {
          backupCreated: true,
          restoreSchemaCreated: schemaCreated,
          restoreCompleted: true,
          fingerprintsMatch: source.digest === restored.digest,
          migrationRowsMatch: source.migrationRowCount === restored.migrationRowCount,
          restoreSchemaDropped: false,
          forcedRlsRestored: false,
        },
        fingerprint: { algorithm: 'sha256', source: source.digest, restored: restored.digest },
        tableCount: source.tableCount,
        migrationRowCount: source.migrationRowCount,
        forcedRlsTableCount: forcedRlsTables.length,
        productionEvidenceRef: null,
        note: 'Prototype drill only. FORCE RLS was suspended on the disposable source for the dump and restored afterwards; the restore clone omits RLS enforcement so row counts can be verified. No production backup, offsite copy, WORM/immutable sink, point-in-time recovery, RTO/RPO measurement or launch approval is claimed.',
      };
      mkdirSync(dirname(RESULT_PATH), { recursive: true });
      writeFileSync(RESULT_PATH, `${JSON.stringify(result, null, 2)}\n`);
    }
  }
} catch (error) {
  fail(redact(error?.message ?? error));
} finally {
  let forcedRlsRestored = false;
  if (forcedRlsTables.length) {
    try {
      for (const table of forcedRlsTables) {
        await client.query(`alter table "public"."${table}" force row level security`);
      }
      const after = await client.query(
        "select relname from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r' and relforcerowsecurity order by relname"
      );
      forcedRlsRestored = JSON.stringify(after.rows.map((row) => row.relname)) === JSON.stringify(forcedRlsTables);
      if (!forcedRlsRestored) fail('forced row-level security was not fully restored on the source schema');
    } catch (error) {
      fail(`forced row-level security restoration failed: ${redact(error?.message ?? error)}`);
    }
  } else {
    forcedRlsRestored = true;
  }
  if (schemaCreated) {
    try {
      await client.query(`drop schema if exists "${schema}" cascade`);
      schemaDropped = true;
    } catch (error) {
      fail(`throwaway restore schema cleanup failed: ${redact(error?.message ?? error)}`);
    }
  }
  const recorded = existsSync(RESULT_PATH) ? JSON.parse(readFileSync(RESULT_PATH, 'utf8')) : null;
  if (recorded?.status === 'local-prototype-dr-drill') {
    recorded.checks.restoreSchemaDropped = schemaDropped;
    recorded.checks.forcedRlsRestored = forcedRlsRestored;
    writeFileSync(RESULT_PATH, `${JSON.stringify(recorded, null, 2)}\n`);
  }
  await client.end().catch(() => {});
  for (const path of [DUMP_PATH, RESTORE_SQL_PATH]) {
    if (existsSync(path)) rmSync(path, { force: true });
  }
}

if (errors.length) {
  console.error(`Local DR drill failed: ${errors.length} finding(s).`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

const recorded = JSON.parse(readFileSync(RESULT_PATH, 'utf8'));
console.log(`Local DR drill passed: ${recorded.tableCount} public tables, ${recorded.migrationRowCount} migration rows, SHA-256 fingerprints match.`);
console.log('Throwaway schema and dump removed; production recovery evidence remains absent and the verdict remains NO-GO.');
