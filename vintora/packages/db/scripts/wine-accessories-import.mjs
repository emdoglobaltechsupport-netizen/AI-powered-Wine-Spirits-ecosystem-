#!/usr/bin/env node
/* =========================================================
   Vintora Wine Accessories catalogue loader.

   Applies the RLS-enabled staging schema, persists validation
   rules, then upserts only authorised, moderated, source-backed
   rows. Every write is captured by an append-only DB trigger.
   ========================================================= */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import pg from 'pg';

import { VALIDATION_RULES, validateAccessory } from './wine-accessories-validate.mjs';

const { Client } = pg;
const HERE = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = path.resolve(HERE, '..');

const COLUMNS = [
  'sku', 'category', 'brand', 'product_name', 'materials', 'dimensions',
  'care_instructions', 'tags', 'compliance_notes', 'msrp_usd',
  'regional_prices', 'assets', 'official_image_url', 'backup_image_urls',
  'image_moderation', 'search_document', 'search_keywords', 'search_index',
  'ai_enrichment', 'cross_sells', 'bundles', 'provenance', 'validation', 'audit_log',
];

const JSON_COLUMNS = new Set([
  'dimensions', 'compliance_notes', 'regional_prices', 'assets',
  'image_moderation', 'search_index', 'ai_enrichment', 'cross_sells',
  'bundles', 'provenance', 'validation', 'audit_log',
]);
const ARRAY_COLUMNS = new Set([
  'materials', 'care_instructions', 'tags', 'backup_image_urls', 'search_keywords',
]);

function parseArgs(argv) {
  const options = {
    input: path.join(PACKAGE_ROOT, 'output', 'wine-accessories.import.json'),
    sql: path.join(PACKAGE_ROOT, 'sql', 'wine_accessories.sql'),
    taxonomy: path.join(PACKAGE_ROOT, 'config', 'wine-accessories-taxonomy.json'),
    databaseUrl: process.env.DATABASE_URL || '',
    minConfidence: 0.7,
    includeFixtures: false,
    allowTestFixtures: false,
    allowPendingModeration: false,
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') options.help = true;
    else if (arg === '--input') options.input = argv[++i];
    else if (arg === '--sql') options.sql = argv[++i];
    else if (arg === '--taxonomy') options.taxonomy = argv[++i];
    else if (arg === '--database-url') options.databaseUrl = argv[++i];
    else if (arg === '--min-confidence') options.minConfidence = Number(argv[++i]);
    else if (arg === '--include-fixtures') options.includeFixtures = true;
    else if (arg === '--allow-test-fixtures') options.allowTestFixtures = true;
    else if (arg === '--allow-pending-moderation') options.allowPendingModeration = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

async function loadRows(input) {
  const text = await fs.readFile(path.resolve(input), 'utf8');
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith('{')) {
    const payload = JSON.parse(trimmed);
    if (!Array.isArray(payload.rows)) throw new Error('Import object must contain rows[].');
    return payload.rows;
  }
  if (trimmed.startsWith('[')) return JSON.parse(trimmed);
  return trimmed.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
}

function upsertSql() {
  const placeholders = COLUMNS.map((_, index) => `$${index + 1}`).join(', ');
  const updates = COLUMNS.filter((column) => column !== 'sku')
    .map((column) => `${column} = EXCLUDED.${column}`)
    .join(', ');
  return `INSERT INTO wine_accessories (${COLUMNS.join(', ')})
          VALUES (${placeholders})
          ON CONFLICT (sku) DO UPDATE SET ${updates}`;
}

function valuesFor(row) {
  return COLUMNS.map((column) => {
    if (column === 'search_document') return row.search_index?.search_document || '';
    if (column === 'search_keywords') return row.search_index?.search_keywords || [];
    const value = row[column];
    if (JSON_COLUMNS.has(column)) return JSON.stringify(value ?? (column === 'validation' ? {} : []));
    if (ARRAY_COLUMNS.has(column)) return value ?? [];
    return value ?? null;
  });
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(`Vintora Wine Accessories catalogue loader\n\n` +
      `node scripts/wine-accessories-import.mjs --input output/wine-accessories.import.json \\\n` +
      `  --database-url "$DATABASE_URL" [--include-fixtures] [--allow-test-fixtures] \\\n` +
      `  [--allow-pending-moderation] [--min-confidence 0.7]\n`);
    return;
  }
  if (!options.databaseUrl) throw new Error('DATABASE_URL is required.');

  const taxonomy = JSON.parse(await fs.readFile(path.resolve(options.taxonomy), 'utf8'));
  const rows = await loadRows(options.input);
  const validationOptions = {
    requireApprovedImages: !options.allowPendingModeration,
    allowTestFixtures: options.allowTestFixtures,
  };

  const skipped = { fixture: 0, confidence: 0, validation: 0 };
  const eligible = [];
  for (const row of rows) {
    const source = row.provenance?.source || 'unknown';
    if (source === 'fixture' && !options.includeFixtures) { skipped.fixture++; continue; }
    if ((row.provenance?.overall_confidence ?? 0) < options.minConfidence) {
      skipped.confidence++;
      continue;
    }
    const validation = validateAccessory(row, taxonomy, validationOptions);
    if (!validation.valid) { skipped.validation++; continue; }
    row.validation = validation;
    eligible.push(row);
  }

  const ddl = await fs.readFile(path.resolve(options.sql), 'utf8');
  const upsert = upsertSql();
  const ruleUpsert = `INSERT INTO wine_accessory_validation_rules
      (rule_id, severity, description, config, updated_at)
      VALUES ($1, $2, $3, $4::jsonb, now())
      ON CONFLICT (rule_id) DO UPDATE SET
        severity = EXCLUDED.severity,
        description = EXCLUDED.description,
        config = EXCLUDED.config,
        updated_at = now()`;
  const batchAudit = `INSERT INTO wine_accessory_audit
      (sku, action, actor, source, reason, after)
      VALUES ('BATCH', 'import', 'catalogue-import', 'wine-accessories', $1::jsonb, $2::jsonb)`;

  const client = new Client({
    connectionString: options.databaseUrl,
    application_name: 'vintora-wine-accessories-import',
  });
  await client.connect();
  try {
    await client.query('BEGIN');
    await client.query(ddl);
    for (const rule of VALIDATION_RULES) {
      await client.query(ruleUpsert, [
        rule.id,
        rule.severity,
        rule.description,
        JSON.stringify({ taxonomyVersion: taxonomy.version, ...(taxonomy.validation || {}) }),
      ]);
    }
    for (const row of eligible) await client.query(upsert, valuesFor(row));
    await client.query(batchAudit, [
      JSON.stringify({ at: new Date().toISOString(), validationOptions }),
      JSON.stringify({
        inputRows: rows.length,
        eligibleRows: eligible.length,
        skipped,
        minConfidence: options.minConfidence,
      }),
    ]);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }

  console.log(`[wine-accessories-import] ${eligible.length} rows upserted.`);
  console.log(`[wine-accessories-import] skipped: ${skipped.fixture} fixture, ${skipped.confidence} confidence, ${skipped.validation} validation.`);
  console.log(`[wine-accessories-import] ${VALIDATION_RULES.length} validation rules persisted.`);
  console.log('[wine-accessories-import] Use wine_accessories_verified for downstream reads.');
}

main().catch((error) => {
  console.error(`[wine-accessories-import] ${error.message}`);
  process.exitCode = 1;
});
