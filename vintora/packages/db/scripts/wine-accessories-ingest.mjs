#!/usr/bin/env node
/* =========================================================
   Vintora Wine Accessories ingestion CLI.

   Reads licensed supplier/brand feeds and optional test fixtures,
   normalises to the canonical import contract, validates asset
   authorisation and moderation, and emits PostgreSQL/Supabase
   ready JSON plus coverage, validation and audit reports.
   ========================================================= */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  loadWineAccessoriesFeed,
  loadWineAccessoriesFixture,
  hashId,
} from './wine-accessories-adapters.mjs';
import { normalizeAccessory } from './wine-accessories-normalize.mjs';
import { validateAccessory, validateBatch, VALIDATION_RULES } from './wine-accessories-validate.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = path.resolve(HERE, '..');
const DEFAULT_TAXONOMY = path.join(PACKAGE_ROOT, 'config', 'wine-accessories-taxonomy.json');

function parseArgs(argv) {
  const options = {
    feed: process.env.VINTORA_WINE_ACCESSORIES_FEED_PATH || null,
    fixture: null,
    out: path.join(PACKAGE_ROOT, 'output', 'wine-accessories.import.json'),
    coverage: path.join(PACKAGE_ROOT, 'output', 'wine-accessories.coverage.json'),
    validation: path.join(PACKAGE_ROOT, 'output', 'wine-accessories.validation.json'),
    audit: path.join(PACKAGE_ROOT, 'output', 'wine-accessories.audit.json'),
    minConfidence: Number(process.env.VINTORA_WINE_ACCESSORIES_MIN_CONFIDENCE || 0),
    requireApprovedImages: true,
    allowTestFixtures: false,
    strict: false,
    requireCategories: false,
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') options.help = true;
    else if (arg === '--feed' || arg === '--licensed-feed') options.feed = argv[++i];
    else if (arg === '--fixture') options.fixture = argv[++i];
    else if (arg === '--out') options.out = argv[++i];
    else if (arg === '--coverage') options.coverage = argv[++i];
    else if (arg === '--validation') options.validation = argv[++i];
    else if (arg === '--audit') options.audit = argv[++i];
    else if (arg === '--min-confidence') options.minConfidence = Number(argv[++i]);
    else if (arg === '--allow-pending-moderation') options.requireApprovedImages = false;
    else if (arg === '--allow-test-fixtures') options.allowTestFixtures = true;
    else if (arg === '--strict') options.strict = true;
    else if (arg === '--require-categories') options.requireCategories = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

async function loadEnvFile(startDir) {
  let dir = startDir;
  while (dir && dir !== path.dirname(dir)) {
    const candidate = path.join(dir, '.env');
    try {
      const text = await fs.readFile(candidate, 'utf8');
      for (const line of text.split(/\r?\n/)) {
        const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
        if (!match) continue;
        const [, key, raw] = match;
        if (process.env[key] === undefined) {
          process.env[key] = raw.replace(/^["']|["']$/g, '');
        }
      }
      return;
    } catch { /* keep walking */ }
    dir = path.dirname(dir);
  }
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

function buildCoverage(rows, taxonomy, generatedAt) {
  const categories = taxonomy.categories.map((category) => {
    const matches = rows.filter((row) => row.category === category);
    const valid = matches.filter((row) => row.validation.valid).length;
    return {
      category,
      count: matches.length,
      validCount: valid,
      invalidCount: matches.length - valid,
      status: !matches.length ? 'missing' : valid === matches.length ? 'ok' : 'needs-review',
    };
  });
  const bySource = {};
  for (const row of rows) {
    const source = row.provenance?.source || 'unknown';
    bySource[source] = (bySource[source] || 0) + 1;
  }
  const missingCategories = categories.filter((entry) => entry.count === 0).map((entry) => entry.category);
  return {
    generatedAt,
    domain: taxonomy.domain,
    notice: 'Category coverage is descriptive. No synthetic products are generated for missing categories.',
    totals: {
      records: rows.length,
      categoriesPresent: categories.length - missingCategories.length,
      categoriesConfigured: categories.length,
      validRecords: rows.filter((row) => row.validation.valid).length,
    },
    categories,
    missingCategories,
    bySource,
  };
}

function usage() {
  return `Vintora Wine Accessories ingestion\n\nUsage:\n` +
    `  node scripts/wine-accessories-ingest.mjs [options]\n\n` +
    `Sources:\n` +
    `  --feed <path>              Licensed JSON/CSV feed (or VINTORA_WINE_ACCESSORIES_FEED_PATH)\n` +
    `  --fixture <path>           Local synthetic fixture; excluded from import by default\n\n` +
    `Quality gates:\n` +
    `  --allow-pending-moderation Emit rows whose assets are not yet approved\n` +
    `  --allow-test-fixtures      Allow reserved test URLs for local fixture validation\n` +
    `  --strict                   Exit non-zero on invalid rows\n` +
    `  --require-categories       Exit non-zero if any configured category is absent\n` +
    `  --min-confidence <0..1>    Filter emitted rows by provenance score\n\n` +
    `Outputs:\n` +
    `  --out <path>               Import JSON object with rows, audit_log and reports\n` +
    `  --coverage <path>          Category coverage report\n` +
    `  --validation <path>        Validation summary and rule catalogue\n` +
    `  --audit <path>             Append-ready audit entries\n`;
}

async function main() {
  await loadEnvFile(HERE);
  const options = parseArgs(process.argv.slice(2));
  if (options.help) { process.stdout.write(usage()); return; }

  const taxonomy = JSON.parse(await fs.readFile(DEFAULT_TAXONOMY, 'utf8'));
  const generatedAt = new Date().toISOString();
  const envelopes = [];

  if (options.feed) {
    const feed = await loadWineAccessoriesFeed({
      filePath: options.feed,
      license: process.env.VINTORA_LICENSED_FEED_LICENSE,
      retrievedAt: generatedAt,
    });
    envelopes.push(...feed);
    console.log(`[licensed-feed] ${feed.length} records`);
  }
  if (options.fixture) {
    const fixture = await loadWineAccessoriesFixture(options.fixture, generatedAt);
    envelopes.push(...fixture);
    console.log(`[fixture] ${fixture.length} records (not for production import)`);
  }

  const normalized = envelopes.map((envelope) => normalizeAccessory(envelope, taxonomy, generatedAt));
  const bySku = new Map();
  for (const row of [...normalized].sort((a, b) =>
    (b.provenance.source_priority || 0) - (a.provenance.source_priority || 0))) {
    if (bySku.has(row.sku)) {
      const existing = bySku.get(row.sku);
      existing.audit_log.push({
        action: 'deduplicated',
        sku: row.sku,
        at: generatedAt,
        actor: 'catalogue-ingest',
        source: row.provenance.source,
        reason: 'lower-priority duplicate retained source metadata only',
        row_hash: hashId(JSON.stringify(row.provenance)),
      });
      continue;
    }
    bySku.set(row.sku, row);
  }

  const validationOptions = {
    requireApprovedImages: options.requireApprovedImages,
    allowTestFixtures: options.allowTestFixtures,
  };
  const rows = [...bySku.values()];
  for (const row of rows) {
    row.validation = validateAccessory(row, taxonomy, validationOptions);
    row.audit_log.push({
      action: 'ingested',
      sku: row.sku,
      at: generatedAt,
      actor: 'catalogue-ingest',
      source: row.provenance.source,
      reason: row.validation.valid ? 'validated for import' : 'validation failed; import blocked',
      row_hash: hashId(JSON.stringify(row)),
    });
  }

  const emitted = rows.filter((row) =>
    (row.provenance.overall_confidence ?? 0) >= options.minConfidence);
  const coverage = buildCoverage(rows, taxonomy, generatedAt);
  const validationSummary = {
    generatedAt,
    rulesVersion: taxonomy.version,
    validationOptions,
    rules: VALIDATION_RULES,
    ...validateBatch(rows, taxonomy, validationOptions),
  };
  const auditLog = rows.flatMap((row) => row.audit_log.map((entry) => ({
    ...entry,
    source: entry.source || row.provenance.source,
  })));

  const importPayload = {
    meta: {
      domain: taxonomy.domain,
      marketModule: taxonomy.marketModule,
      generatedAt,
      notice: 'Source-backed rows only. Licensed/authorised assets and approved moderation are required by default.',
      validationOptions,
    },
    validation_rules: VALIDATION_RULES,
    rows: emitted,
    audit_log: auditLog,
    coverage,
    validation: validationSummary,
  };

  await writeJson(options.out, importPayload);
  await fs.mkdir(path.dirname(options.out), { recursive: true });
  await fs.writeFile(
    options.out.replace(/\.json$/i, '.jsonl'),
    emitted.map((row) => JSON.stringify(row)).join('\n') + (emitted.length ? '\n' : ''),
    'utf8',
  );
  await writeJson(options.coverage, coverage);
  await writeJson(options.validation, validationSummary);
  await writeJson(options.audit, { generatedAt, domain: taxonomy.domain, entries: auditLog });

  console.log(`[normalize] ${normalized.length} source rows; ${rows.length} unique; ${emitted.length} emitted`);
  console.log(`[validate] ${validationSummary.validRecords}/${validationSummary.records} valid; ${validationSummary.invalidRecords} invalid`);
  console.log(`[coverage] ${coverage.totals.categoriesPresent}/${coverage.totals.categoriesConfigured} categories present`);
  console.log(`[write] ${options.out}`);
  console.log(`[write] ${options.coverage}`);
  console.log(`[write] ${options.validation}`);
  console.log(`[write] ${options.audit}`);

  if (options.strict && validationSummary.invalidRecords > 0) {
    throw new Error('Strict quality gate failed: invalid Wine Accessories rows found.');
  }
  if (options.requireCategories && coverage.missingCategories.length) {
    throw new Error(`Category gate failed: missing ${coverage.missingCategories.join(', ')}.`);
  }
}

main().catch((error) => {
  console.error(`[wine-accessories-ingest] ${error.message}`);
  process.exitCode = 1;
});
