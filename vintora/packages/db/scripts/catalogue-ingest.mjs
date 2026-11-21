#!/usr/bin/env node
/* =========================================================
   Vintora verified catalogue ingestion CLI.

   Reads only configured sources, normalises to the canonical
   import contract, emits JSON + coverage/validation reports.
   It never fabricates products, prices, images or URLs.
   ========================================================= */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  loadFixture,
  loadLicensedFeed,
  fetchOpenFoodFacts,
} from './catalogue-adapters.mjs';
import { dedupeAndMerge, normalizeRecord } from './catalogue-normalize.mjs';
import { buildCoverage, buildValidation } from './catalogue-report.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = path.resolve(HERE, '..');
const DEFAULT_TAXONOMY = path.join(PACKAGE_ROOT, 'config', 'catalogue-taxonomy.json');

function parseArgs(argv) {
  const options = {
    sources: [],
    licensedFeed: process.env.VINTORA_LICENSED_FEED_PATH || null,
    fixture: null,
    openFoodFacts: false,
    offQueries: [],
    out: path.join(PACKAGE_ROOT, 'output', 'catalogue.import.json'),
    coverage: path.join(PACKAGE_ROOT, 'output', 'catalogue.coverage.json'),
    validation: path.join(PACKAGE_ROOT, 'output', 'catalogue.validation.json'),
    minConfidence: Number(process.env.VINTORA_CATALOGUE_MIN_CONFIDENCE || 0),
    strict: false,
    requireTargets: false,
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') options.help = true;
    else if (arg === '--licensed-feed') options.licensedFeed = argv[++i];
    else if (arg === '--fixture') { options.fixture = argv[++i]; options.sources.push('fixture'); }
    else if (arg === '--openfoodfacts' || arg === '--off') { options.openFoodFacts = true; options.sources.push('openfoodfacts'); }
    else if (arg === '--off-query') options.offQueries.push(argv[++i]);
    else if (arg === '--out') options.out = argv[++i];
    else if (arg === '--coverage') options.coverage = argv[++i];
    else if (arg === '--validation') options.validation = argv[++i];
    else if (arg === '--min-confidence') options.minConfidence = Number(argv[++i]);
    else if (arg === '--strict') options.strict = true;
    else if (arg === '--require-targets') options.requireTargets = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (options.licensedFeed && !options.sources.includes('licensed-feed')) options.sources.unshift('licensed-feed');
  if (!options.sources.length && options.licensedFeed) options.sources.push('licensed-feed');
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

function usage() {
  return `Vintora verified catalogue ingestion

Usage:
  node scripts/catalogue-ingest.mjs [options]

Sources (choose one or more; no network access unless --openfoodfacts):
  --licensed-feed <path>   JSON/CSV supplier or brand feed (or VINTORA_LICENSED_FEED_PATH)
  --fixture <path>         Local test fixture; flagged as non-verifiable
  --openfoodfacts          Fetch barcodes/labels/images from Open Food Facts

Output:
  --out <path>             Import JSON array (default packages/db/output/catalogue.import.json)
  --coverage <path>        Target coverage report
  --validation <path>      Field-coverage and integrity report

Quality:
  --min-confidence <0..1>  Filter emitted rows by provenance score
  --strict                 Fail on invalid/unclassified rows
  --require-targets        Fail when requested coverage targets are unmet

Environment:
  VINTORA_LICENSED_FEED_PATH, VINTORA_LICENSED_FEED_LICENSE,
  VINTORA_OFF_BASE_URL, VINTORA_OFF_USER_AGENT,
  VINTORA_OFF_PAGE_SIZE, VINTORA_OFF_PAGES, VINTORA_OFF_DELAY_MS,
  VINTORA_CATALOGUE_MIN_CONFIDENCE
`;
}

async function main() {
  await loadEnvFile(HERE);
  const options = parseArgs(process.argv.slice(2));
  if (options.help) { process.stdout.write(usage()); return; }

  const taxonomy = JSON.parse(await fs.readFile(DEFAULT_TAXONOMY, 'utf8'));
  const envelopes = [];

  if (options.sources.includes('licensed-feed')) {
    const feed = await loadLicensedFeed({
      filePath: options.licensedFeed,
      license: process.env.VINTORA_LICENSED_FEED_LICENSE,
      retrievedAt: new Date().toISOString(),
    });
    envelopes.push(...feed);
    console.log(`[licensed-feed] ${feed.length} records`);
  }

  if (options.sources.includes('fixture')) {
    const fixture = await loadFixture(options.fixture);
    envelopes.push(...fixture);
    console.log(`[fixture] ${fixture.length} records (not for import)`);
  }

  if (options.openFoodFacts) {
    const queries = options.offQueries.length ? options.offQueries : taxonomy.openFoodFacts.queries;
    let count = 0;
    for await (const envelope of fetchOpenFoodFacts({
      baseUrl: process.env.VINTORA_OFF_BASE_URL || taxonomy.openFoodFacts.baseUrl,
      userAgent: process.env.VINTORA_OFF_USER_AGENT,
      pageSize: Number(process.env.VINTORA_OFF_PAGE_SIZE || taxonomy.openFoodFacts.pageSize),
      pagesPerQuery: Number(process.env.VINTORA_OFF_PAGES || taxonomy.openFoodFacts.pagesPerQuery),
      delayMs: Number(process.env.VINTORA_OFF_DELAY_MS || taxonomy.openFoodFacts.delayMs),
      queries,
    })) {
      envelopes.push(envelope);
      count++;
    }
    console.log(`[openfoodfacts] ${count} records`);
  }

  if (!envelopes.length) {
    console.warn('No source records were read. Nothing to ingest.');
  }

  const normalized = envelopes.map((envelope) => normalizeRecord(
    envelope,
    taxonomy,
    taxonomy.sourcePriority,
  ));
  const deduped = dedupeAndMerge(normalized);
  const emitted = deduped.filter((record) =>
    (record.provenance?.overall_confidence ?? 0) >= options.minConfidence,
  );

  const generatedAt = new Date().toISOString();
  const coverage = buildCoverage(deduped, taxonomy, generatedAt);
  const validation = buildValidation(deduped, generatedAt);

  await writeJson(options.out, emitted);
  await fs.mkdir(path.dirname(options.out), { recursive: true });
  await fs.writeFile(
    options.out.replace(/\.json$/i, '.jsonl'),
    emitted.map((record) => JSON.stringify(record)).join('\n') + (emitted.length ? '\n' : ''),
    'utf8',
  );
  await writeJson(options.coverage, coverage);
  await writeJson(options.validation, validation);

  console.log(`[normalize] ${deduped.length} unique records; ${emitted.length} emitted`);
  console.log(`[coverage] ${coverage.totals.observedAgainstTargets}/${coverage.totals.targetMinimum} target records (${coverage.totals.coveragePct}%)`);
  console.log(`[validation] ${validation.validRecords}/${validation.records} valid; ${validation.unclassifiedRecords} unclassified`);
  console.log(`[write] ${options.out}`);
  console.log(`[write] ${options.coverage}`);
  console.log(`[write] ${options.validation}`);

  if (options.strict && (validation.invalidRecords > 0 || validation.unclassifiedRecords > 0)) {
    throw new Error('Strict quality gate failed: invalid or unclassified records found.');
  }
  if (options.requireTargets && coverage.targets.some((target) => target.status !== 'met')) {
    throw new Error('Target gate failed: verified sources did not meet requested coverage.');
  }
}

main().catch((error) => {
  console.error(`[catalogue-ingest] ${error.message}`);
  process.exitCode = 1;
});
