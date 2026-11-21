#!/usr/bin/env node
/* Offline regression test for the verified catalogue ingestion pipeline. */

import assertModule from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadFixture, loadLicensedFeed } from './catalogue-adapters.mjs';
import { dedupeAndMerge, normalizeRecord } from './catalogue-normalize.mjs';
import { buildCoverage, buildValidation } from './catalogue-report.mjs';
import { assertGeneratedCount, printGeneratedSummary } from './selftest-counts.mjs';

let checks = 0;
const assert = new Proxy(assertModule, {
  get(target, property) {
    const value = target[property];
    return typeof value === 'function' ? (...args) => { checks += 1; return value(...args); } : value;
  },
});

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const taxonomy = JSON.parse(await fs.readFile(path.join(ROOT, 'config', 'catalogue-taxonomy.json'), 'utf8'));
const fixturePath = path.join(ROOT, 'examples', 'openfoodfacts.fixture.json');
const examplePath = path.join(ROOT, 'examples', 'licensed-feed.example.json');

const fixture = await loadFixture(fixturePath);
assert.equal(fixture.length, 10, 'fixture should contain 10 records');
assert.ok(fixture.every((row) => row.source === 'fixture'), 'fixture provenance must be preserved');

const normalized = dedupeAndMerge(fixture.map((row) => normalizeRecord(row, taxonomy, taxonomy.sourcePriority)));
assert.equal(normalized.length, 10, 'fixture SKUs must be unique');
assert.equal(new Set(normalized.map((row) => row.product_sku)).size, 10, 'no duplicate product SKUs');
assert.ok(normalized.every((row) => !row.official_product_page), 'Open Food Facts rows must not invent official pages');
assert.ok(normalized.every((row) => !row.official_product_image_url), 'Open Food Facts rows must not invent official images');

const red = normalized.find((row) => row.subcategory === 'Red Wine');
assert.equal(red.bottle_size_ml, 750, '75 cl must normalise to 750 ml');
assert.equal(red.abv_pct, 13.5, 'ABV must parse from source string');
assert.equal(red.country_of_origin, 'France', 'country tag must map to a label');

const coverage = buildCoverage(normalized, taxonomy);
assert.equal(coverage.totals.targetMinimum, 1850, 'requested target minimum must be preserved');
assert.equal(coverage.totals.observedAgainstTargets, 10, 'coverage must count only verified source rows');
assert.equal(coverage.unclassified, 0, 'all fixture rows must classify');

const validation = buildValidation(normalized);
assert.equal(validation.records, 10);
assert.equal(validation.validRecords, 10);
assert.equal(validation.invalidRecords, 0);
assert.equal(validation.unclassifiedRecords, 0);

const example = await loadLicensedFeed({ filePath: examplePath });
assert.equal(example.length, 2, 'licensed feed adapter must read the contract example');
const exampleNormalized = example.map((row) => normalizeRecord(row, taxonomy, taxonomy.sourcePriority));
assert.ok(exampleNormalized.every((row) => !row.brand_name), 'REPLACE ME example values must not become facts');

const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'vintora-catalogue-'));
await fs.writeFile(path.join(tmp, 'import.json'), JSON.stringify(normalized, null, 2));
await assertGeneratedCount('catalogue', checks);
printGeneratedSummary('catalogue', checks);
console.log(`temporary output: ${tmp}`);
