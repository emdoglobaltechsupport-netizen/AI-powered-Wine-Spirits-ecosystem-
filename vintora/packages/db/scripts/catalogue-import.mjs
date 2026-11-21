#!/usr/bin/env node
/* =========================================================
   Vintora catalogue import loader.

   Inserts verified-source catalogue rows into the internal
   catalogue_import staging table. Fixtures and low-confidence
   rows are excluded unless explicitly allowed.
   ========================================================= */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import pg from 'pg';

const { Client } = pg;
const HERE = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = path.resolve(HERE, '..');

const COLUMNS = [
  'product_sku', 'category', 'subcategory', 'brand_name', 'product_name',
  'country_of_origin', 'region', 'producer_distillery', 'abv_pct',
  'bottle_size', 'bottle_size_ml', 'tasting_notes', 'food_pairing', 'awards',
  'product_description', 'msrp_price_usd', 'average_global_retail_price_usd',
  'barcode', 'official_brand_website', 'official_product_page',
  'official_product_image_url', 'additional_gallery_images', 'product_tags',
  'premium_luxury_segment', 'popularity_score', 'ai_recommendation_tags',
  'provenance',
];

function parseArgs(argv) {
  const options = {
    input: path.join(PACKAGE_ROOT, 'output', 'catalogue.import.json'),
    sql: path.join(PACKAGE_ROOT, 'sql', 'catalogue_import.sql'),
    databaseUrl: process.env.DATABASE_URL || '',
    minConfidence: 0.7,
    includeFixtures: false,
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') options.help = true;
    else if (arg === '--input') options.input = argv[++i];
    else if (arg === '--sql') options.sql = argv[++i];
    else if (arg === '--database-url') options.databaseUrl = argv[++i];
    else if (arg === '--min-confidence') options.minConfidence = Number(argv[++i]);
    else if (arg === '--include-fixtures') options.includeFixtures = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

async function loadRows(input) {
  const text = await fs.readFile(path.resolve(input), 'utf8');
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith('[')) return JSON.parse(trimmed);
  return trimmed.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
}

function upsertSql() {
  const placeholders = COLUMNS.map((_, index) => `$${index + 1}`).join(', ');
  const updates = COLUMNS.filter((column) => column !== 'product_sku')
    .map((column) => `${column} = EXCLUDED.${column}`)
    .join(', ');
  return `INSERT INTO catalogue_import (${COLUMNS.join(', ')})
          VALUES (${placeholders})
          ON CONFLICT (product_sku) DO UPDATE SET ${updates}, imported_at = now()`;
}

function valuesFor(row) {
  return COLUMNS.map((column) => {
    const value = row[column];
    if (column === 'awards' || column === 'additional_gallery_images' || column === 'provenance') {
      return JSON.stringify(value ?? (column === 'provenance' ? {} : []));
    }
    if (column === 'product_tags' || column === 'ai_recommendation_tags') return value ?? [];
    return value ?? null;
  });
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(`Vintora catalogue import loader\n\n` +
      `node scripts/catalogue-import.mjs --input output/catalogue.import.json \\\n` +
      `  --database-url "$DATABASE_URL" [--min-confidence 0.7] [--include-fixtures]\n`);
    return;
  }
  if (!options.databaseUrl) throw new Error('DATABASE_URL is required.');

  const rows = await loadRows(options.input);
  const eligible = rows.filter((row) => {
    const source = row.provenance?.source || 'unknown';
    if (!options.includeFixtures && source === 'fixture') return false;
    return (row.provenance?.overall_confidence ?? 0) >= options.minConfidence;
  });
  const skipped = rows.length - eligible.length;

  const sql = await fs.readFile(path.resolve(options.sql), 'utf8');
  const upsert = upsertSql();
  const client = new Client({
    connectionString: options.databaseUrl,
    application_name: 'vintora-catalogue-import',
  });
  await client.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    for (const row of eligible) await client.query(upsert, valuesFor(row));
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }

  console.log(`[catalogue-import] ${eligible.length} rows upserted; ${skipped} skipped by quality gate.`);
  console.log('[catalogue-import] Use catalogue_import_verified for downstream reads.');
}

main().catch((error) => {
  console.error(`[catalogue-import] ${error.message}`);
  process.exitCode = 1;
});
