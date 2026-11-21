#!/usr/bin/env node
/* Offline regression test for the Africa Marketplace registry builder. */

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildPrototypeSnapshot, buildRegistry } from './africa-marketplace-build.mjs';
import { assertGeneratedCount, printGeneratedSummary } from './selftest-counts.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const config = JSON.parse(await fs.readFile(path.join(ROOT, 'config', 'africa-marketplace.json'), 'utf8'));
const brandConfig = JSON.parse(await fs.readFile(path.join(ROOT, 'config', 'africa-brand-candidates.json'), 'utf8'));
const schema = JSON.parse(await fs.readFile(path.join(ROOT, 'schemas', 'africa-marketplace.registry.schema.json'), 'utf8'));
const sql = await fs.readFile(path.join(ROOT, 'sql', 'africa_marketplace.sql'), 'utf8');

let checks = 0;
function check(condition, message) {
  assert.ok(condition, message);
  checks++;
}
function equal(actual, expected, message) {
  assert.equal(actual, expected, message);
  checks++;
}

const registry = buildRegistry(config, brandConfig);
const expectedMarketCodes = ['ZA', 'NG', 'KE', 'GH', 'TZ', 'UG', 'RW', 'MA', 'EG', 'AO', 'BW', 'NA', 'ZM', 'MZ'];
equal(registry.countries.length, 14, 'all 14 design-target markets must be present');
check(expectedMarketCodes.every((code) => registry.countries.some((country) => country.country_code === code)), 'market codes must match the brief');
equal(registry.languages.length, 5, 'five languages must be configured');
check(['en', 'fr', 'ar', 'pt', 'sw'].every((code) => registry.languages.some((lang) => lang.code === code)), 'language codes must match the brief');
check(registry.languages.find((lang) => lang.code === 'ar').rtl === true, 'Arabic must be configured as RTL');

const expectedBrands = [
  'Moët & Chandon', 'Dom Pérignon', 'Penfolds', 'Robert Mondavi', 'Yellow Tail',
  "Jacob's Creek", 'Barefoot', 'Antinori', 'Johnnie Walker', 'Chivas Regal',
  'Macallan', 'Glenfiddich', 'Jameson', 'Hennessy', 'Rémy Martin', 'Martell',
  'Bacardi', 'Captain Morgan', 'Don Julio', 'Patrón', 'Absolut', 'Grey Goose',
  'Belvedere', 'Tanqueray', 'Bombay Sapphire', 'KWV', 'Nederburg',
  'Durbanville Hills', 'Robertson Winery', 'Four Cousins', 'Stellenbosch Vineyards',
  'Amarula', "Bain's Whisky", 'Three Ships Whisky', 'Viceroy Brandy', 'Kenya Cane',
  'Nigeria-produced spirits', 'Ghana premium spirits',
];
equal(registry.brands.length, 38, 'all 38 supplied brand/category names must be registered');
check(expectedBrands.every((name) => registry.brands.some((brand) => brand.brand_name === name)), 'every supplied name must be present');
check(registry.brands.find((brand) => brand.brand_name === 'Nigeria-produced spirits').needs_brand_resolution === true, 'Nigeria category must be flagged for brand resolution');
check(registry.brands.find((brand) => brand.brand_name === 'Ghana premium spirits').needs_brand_resolution === true, 'Ghana category must be flagged for brand resolution');
check(registry.brands.every((brand) => brand.verification_status === 'candidate'), 'no candidate brand may be marked verified');
check(registry.brands.every((brand) => brand.official_website === null), 'official websites must not be invented');

equal(registry.productTemplates.length, 38, 'one draft template per candidate name');
const requiredFields = [
  'brand_name', 'product_name', 'category', 'subcategory', 'country_of_origin',
  'region', 'abv_pct', 'bottle_size', 'product_description', 'tasting_notes',
  'food_pairings', 'awards', 'sku', 'barcode', 'wholesale_price', 'retail_price',
  'distributor_price', 'african_market_price', 'product_availability_by_country',
  'official_website', 'official_product_url', 'official_product_images',
  'lifestyle_images', 'seo_metadata', 'ai_recommendation_tags',
];
check(registry.productTemplates.every((template) => requiredFields.every((field) => Object.hasOwn(template, field))), 'every listing template must expose all requested fields');
check(registry.productTemplates.every((template) => template.listing_status === 'draft_template'), 'templates must remain drafts');
check(registry.productTemplates.every((template) => template.validation.valid === false), 'templates must fail validation until sourced');
check(registry.productTemplates.every((template) => template.product_name === null), 'product names must not be invented');
check(registry.productTemplates.every((template) => template.sku === null && template.barcode === null), 'SKUs and barcodes must not be invented');
check(registry.productTemplates.every((template) => template.abv_pct === null && template.bottle_size === null), 'ABV and bottle size must not be invented');
check(registry.productTemplates.every((template) => template.awards.length === 0), 'awards must not be invented');
check(registry.productTemplates.every((template) => template.official_website === null && template.official_product_url === null), 'official URLs must not be invented');
check(registry.productTemplates.every((template) => template.official_product_images.length === 0 && template.lifestyle_images.length === 0), 'image URLs must not be invented');
check(registry.productTemplates.every((template) => template.wholesale_price.amount === null && template.retail_price.amount === null && template.distributor_price.amount === null), 'prices must not be invented');
check(registry.productTemplates.every((template) => template.african_market_price.entries.length === 14), 'African market price entries must cover all design-target markets');
check(registry.productTemplates.every((template) => template.product_availability_by_country.length === 14), 'availability must cover all design-target markets');
check(registry.productTemplates.every((template) => template.product_availability_by_country.every((entry) => entry.status === 'unverified')), 'availability must default to unverified');
check(registry.productTemplates.every((template) => template.seo_metadata.status === 'template'), 'SEO metadata must be labelled template');
check(registry.productTemplates.every((template) => template.ai_recommendation_tags.includes('status:verification-required')), 'AI tags must signal verification requirement');
check(registry.productTemplates.every((template) => template.audit_log.some((entry) => entry.action === 'create')), 'templates must carry audit entries');

equal(registry.workflows.length, 10, 'ten system workflows must be defined');
check(registry.workflows.every((workflow) => workflow.states.length >= 2 && workflow.guards.length >= 1), 'workflows must define states and guards');
equal(registry.validationRules.length, 12, 'validation rule catalogue must contain 12 rules');
equal(registry.scaleTargets.brands, 10000, 'brand scale target must be preserved');
equal(registry.scaleTargets.products, 500000, 'product scale target must be preserved');
equal(registry.scaleTargets.africanCountries, 54, '54-country scale target must be preserved');
equal(registry.meta.scope.scopeStatus, 'design_target', 'registry must classify Africa as a design target');
equal(registry.meta.scope.phaseAssignment, 'unassigned', 'Africa must not be assigned to a canonical launch phase');
equal(registry.meta.scope.activationStatus, 'blocked', 'country activation must remain blocked');
equal(registry.meta.scope.countryActivationGate, 'africa-country-activation', 'registry must reference the blocked activation gate');
equal(registry.meta.scope.scopeClassCounts.target, 14, 'all 14 registry markets must be classified as target');
check(config.targetMarkets.every((market) => market.scopeClass === 'target' && market.activationState === 'blocked' && market.licensingOwner === null && market.effectiveDate === null && market.counselReviewRef === null), 'every market must be target, blocked and unsigned');
check(Object.values(registry.meta.scope.activeCurrenciesByEnvironment).every((currencies) => currencies.length === 0), 'no environment may activate Africa currencies');
check(schema.properties.meta.properties.scope.properties.scopeStatus.const === 'design_target', 'schema must enforce design-target scope');

check(schema.$defs.productTemplate.required.includes('african_market_price'), 'schema must require African market price field');
check(sql.includes('ENABLE ROW LEVEL SECURITY') || sql.includes('ENABLE ROW LEVEL SECURITY'), 'DDL must enable RLS');
check(sql.includes('am_search_idx') || sql.includes('am_products_search_idx'), 'DDL must include full-text search index');
check(sql.includes('am_audit is append-only'), 'DDL must enforce append-only audit');
check(sql.includes('am_product_templates_review'), 'DDL must include a review view for templates');
check(sql.includes('am_products_approved'), 'DDL must include an approved-products view');

const snapshot = buildPrototypeSnapshot(registry);
equal(snapshot.markets.length, 14, 'storefront snapshot must include all design-target markets');
equal(snapshot.candidateBrandCount, 38, 'storefront snapshot must expose the candidate brand count');
equal(snapshot.draftTemplateCount, 38, 'storefront snapshot must expose the draft template count');
equal(snapshot.scope.phaseAssignment, 'unassigned', 'storefront snapshot must expose the unassigned phase');
check(snapshot.brandGroups.length === 4, 'snapshot must group candidates by source group');
const prototypeSnapshotPath = path.resolve(ROOT, '..', '..', 'apps', 'prototype', 'src', 'africa-snapshot.js');
const prototypeSnapshotSource = await fs.readFile(prototypeSnapshotPath, 'utf8');
check(prototypeSnapshotSource.includes('export const AFRICA_MARKETPLACE'), 'generated storefront snapshot must be present');

const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'vintora-africa-'));
await fs.writeFile(path.join(tmp, 'africa-marketplace.registry.json'), JSON.stringify(registry, null, 2));

await assertGeneratedCount('africa', checks);
printGeneratedSummary('africa', checks);
console.log(`temporary output: ${tmp}`);
