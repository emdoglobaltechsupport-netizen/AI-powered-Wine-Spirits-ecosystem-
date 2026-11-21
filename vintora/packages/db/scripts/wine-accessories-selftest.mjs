#!/usr/bin/env node
/* Offline regression test for the Wine Accessories catalogue pipeline. */

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadWineAccessoriesFixture } from './wine-accessories-adapters.mjs';
import { normalizeAccessory } from './wine-accessories-normalize.mjs';
import { validateAccessory, VALIDATION_RULES } from './wine-accessories-validate.mjs';
import { assertGeneratedCount, printGeneratedSummary } from './selftest-counts.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const taxonomy = JSON.parse(await fs.readFile(path.join(ROOT, 'config', 'wine-accessories-taxonomy.json'), 'utf8'));
const schema = JSON.parse(await fs.readFile(path.join(ROOT, 'schemas', 'wine-accessories.import.schema.json'), 'utf8'));
const sql = await fs.readFile(path.join(ROOT, 'sql', 'wine_accessories.sql'), 'utf8');

let checks = 0;
function check(condition, message) {
  assert.ok(condition, message);
  checks++;
}
function equal(actual, expected, message) {
  assert.equal(actual, expected, message);
  checks++;
}

const envelopes = await loadWineAccessoriesFixture(path.join(ROOT, 'examples', 'wine-accessories.fixture.json'));
equal(envelopes.length, 9, 'fixture should contain one row per configured category');
check(envelopes.every((row) => row.source === 'fixture'), 'fixture provenance must be preserved');

const rows = envelopes.map((envelope) => normalizeAccessory(envelope, taxonomy));
equal(rows.length, 9, 'all fixture rows should normalise');
equal(new Set(rows.map((row) => row.sku)).size, 9, 'SKUs must be unique');
equal(new Set(rows.map((row) => row.category)).size, 9, 'all nine categories must be represented');
check(rows.every((row) => taxonomy.categories.includes(row.category)), 'categories must be in the approved taxonomy');
check(rows.every((row) => row.brand && row.product_name), 'brand and product name must be populated');
check(rows.every((row) => Array.isArray(row.materials) && row.materials.length), 'materials must be populated');
check(rows.every((row) => Object.values(row.dimensions).some((value) => typeof value === 'number')), 'dimensions must be populated');
check(rows.every((row) => row.care_instructions.length), 'care instructions must be populated');
check(rows.every((row) => row.tags.length), 'tags must be populated');
check(rows.every((row) => row.compliance_notes.length), 'compliance notes must be populated');
check(rows.every((row) => row.msrp_usd > 0), 'MSRP must be populated');
check(rows.every((row) => row.regional_prices.length), 'regional prices must be populated');
check(rows.every((row) => row.official_image_url), 'official image URL must be populated');
check(rows.every((row) => row.backup_image_urls.length), 'backup image URLs must be populated');
check(rows.every((row) => row.assets.every((asset) => asset.licence === 'SUPPLIER_AUTHORIZED')), 'asset licences must be preserved');
check(rows.every((row) => row.image_moderation.status === 'approved'), 'moderation summary must be approved');

const glass = rows.find((row) => row.category === 'Glassware');
check(glass.search_index.search_document.includes('FIXTURE Crystal Wine Glass Set'), 'search document must include product name');
check(glass.search_index.search_keywords.includes('Glassware'), 'search keywords must include category');
check(glass.ai_enrichment.seo.title.includes('Vintora'), 'SEO title must be deterministic');
equal(glass.ai_enrichment.confidence, 'derived', 'AI enrichment must be labelled derived');
check(glass.cross_sells.some((entry) => entry.type === 'category' && entry.value === 'Decanters'), 'cross-sells must include taxonomy category');
check(glass.bundles.some((entry) => entry.origin === 'derived'), 'bundle suggestions must be labelled derived');
check(glass.audit_log.some((entry) => entry.action === 'create'), 'rows must carry a create audit entry');

const validationOptions = { requireApprovedImages: true, allowTestFixtures: true };
check(rows.every((row) => validateAccessory(row, taxonomy, validationOptions).valid), 'fixture rows should pass with test URL allowance');
const strictValidation = rows.map((row) => validateAccessory(row, taxonomy, { requireApprovedImages: true }));
check(strictValidation.every((result) => !result.valid), 'reserved test URLs must be rejected by default');

const badLicence = structuredClone(glass);
badLicence.assets[0].licence = 'UNLICENSED';
badLicence.assets[0].authorized = false;
const badLicenceResult = validateAccessory(badLicence, taxonomy, validationOptions);
check(badLicenceResult.errors.some((error) => error.rule === 'WA-009'), 'unlicensed assets must fail WA-009');

const pending = structuredClone(glass);
for (const asset of pending.assets) asset.moderation.status = 'pending';
pending.image_moderation.status = 'pending';
const pendingResult = validateAccessory(pending, taxonomy, validationOptions);
check(pendingResult.errors.some((error) => error.rule === 'WA-010'), 'pending moderation must fail WA-010');
check(
  validateAccessory(pending, taxonomy, { requireApprovedImages: false, allowTestFixtures: true }).valid,
  'pending moderation should pass only with an explicit override',
);

const missingOfficial = structuredClone(glass);
missingOfficial.assets = missingOfficial.assets.filter((asset) => asset.role !== 'official');
missingOfficial.official_image_url = null;
check(
  validateAccessory(missingOfficial, taxonomy, validationOptions).errors.some((error) => error.rule === 'WA-008'),
  'missing official asset must fail WA-008',
);

equal(VALIDATION_RULES.length, 12, 'validation rule catalogue must contain 12 rules');
check(schema.title.includes('Wine Accessories'), 'JSON schema must describe the import payload');
check(schema.$defs.row.required.includes('ai_enrichment'), 'schema must require AI enrichment');
check(sql.includes('wine_accessory_audit_immutable_trg'), 'DDL must include append-only audit trigger');
check(sql.includes('wine_accessories_search_tsv_idx'), 'DDL must include a full-text search index');

const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'vintora-wine-accessories-'));
const payload = {
  meta: { domain: taxonomy.domain, generatedAt: new Date().toISOString() },
  rows,
};
await fs.writeFile(path.join(tmp, 'wine-accessories.import.json'), JSON.stringify(payload, null, 2));

await assertGeneratedCount('accessories', checks);
printGeneratedSummary('accessories', checks);
console.log(`temporary output: ${tmp}`);
