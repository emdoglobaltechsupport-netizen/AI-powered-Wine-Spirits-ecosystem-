#!/usr/bin/env node
/* =========================================================
   Vintora Africa Marketplace registry builder.

   Converts the user-provided market/brand configuration into a
   PostgreSQL/Supabase-ready registry and draft listing templates.
   It never invents product facts, prices, barcodes, awards or
   image URLs.
   ========================================================= */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { hashId } from './catalogue-adapters.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = path.resolve(HERE, '..');
const DEFAULT_CONFIG = path.join(PACKAGE_ROOT, 'config', 'africa-marketplace.json');
const DEFAULT_BRANDS = path.join(PACKAGE_ROOT, 'config', 'africa-brand-candidates.json');
const DEFAULT_OUT = path.join(PACKAGE_ROOT, 'output', 'africa-marketplace.registry.json');
const PROTOTYPE_SNAPSHOT = path.resolve(
  PACKAGE_ROOT, '..', '..', 'apps', 'prototype', 'src', 'africa-snapshot.js',
);

export function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96);
}

function unavailablePrice(currency = null) {
  return {
    amount: null,
    currency,
    source: null,
    source_url: null,
    effective_date: null,
    status: 'not_supplied',
  };
}

function buildTemplate(candidate, config, generatedAt) {
  const brandId = `BR-${hashId(candidate.brandName)}`;
  const templateId = `TPL-${hashId(brandId)}`;
  const category = candidate.categoryHint || null;
  const markets = config.targetMarkets.map((market) => ({
    country_code: market.code,
    country_name: market.name,
    currency: market.currency,
    status: 'unverified',
    legal_review_required: true,
    evidence: null,
  }));

  return {
    template_id: templateId,
    brand_id: brandId,
    brand_name: candidate.brandName,
    product_name: null,
    category,
    subcategory: null,
    country_of_origin: null,
    country_of_origin_hint: candidate.originHint || null,
    region: null,
    abv_pct: null,
    bottle_size: null,
    product_description: null,
    tasting_notes: null,
    food_pairings: [],
    awards: [],
    sku: null,
    barcode: null,
    wholesale_price: unavailablePrice(),
    retail_price: unavailablePrice(),
    distributor_price: unavailablePrice(),
    african_market_price: {
      status: 'not_supplied',
      entries: config.targetMarkets.map((market) => unavailablePrice(market.currency)),
    },
    product_availability_by_country: markets,
    official_website: null,
    official_product_url: null,
    official_product_images: [],
    lifestyle_images: [],
    seo_metadata: {
      status: 'template',
      title_template: `${candidate.brandName} ${category || ''} — Vintora Africa Marketplace`.replace(/\s+/g, ' ').trim(),
      description_template: 'Verified product listing pending. Do not publish until source-backed data, licensed assets and local compliance review are complete.',
      slug_hint: slugify(candidate.brandName),
      language_variants: Object.fromEntries(config.languages.map((language) => [language.code, null])),
    },
    ai_recommendation_tags: [
      `category:${slugify(category || 'unclassified')}`,
      `source_group:${slugify(candidate.sourceGroup)}`,
      'market:africa',
      'status:verification-required',
    ],
    assets_policy: {
      official_images: 'licensed_or_authorised_only',
      lifestyle_images: 'licensed_or_authorised_only',
      moderation_status: 'not_submitted',
    },
    listing_status: 'draft_template',
    provenance: {
      source: 'user_provided_candidate_brand_list',
      captured_from: 'marketplace brief',
      captured_at: generatedAt,
      source_url: null,
      identity_verified: false,
      rights_verified: false,
      source_product_record: null,
      notes: [
        'Brand name was supplied in the marketplace brief; no supplier feed or official record was attached.',
        'All product, price, barcode, award and image fields remain null or empty until verified by a source.',
        'AI recommendation tags and SEO templates are rule-derived and labelled as such.',
      ],
    },
    validation: {
      valid: false,
      errors: [
        'AM-003: brand identity evidence not attached',
        'AM-004: no verified product source attached',
        'AM-005: no licensed or authorised assets submitted',
        ...(candidate.needsBrandResolution ? ['AM-003: category group is not a resolvable brand'] : []),
      ],
      warnings: ['AM-011: SEO and recommendation fields are rule-derived templates'],
      rules_version: config.version,
    },
    audit_log: [{
      action: 'create',
      entity: 'product_template',
      id: templateId,
      at: generatedAt,
      actor: 'africa-marketplace-build',
      source: 'user_provided_candidate_brand_list',
      reason: 'draft listing template created from candidate brand name',
      row_hash: hashId(`${templateId}|${candidate.brandName}`),
    }],
  };
}

export function buildRegistry(config, brandConfig, generatedAt = new Date().toISOString()) {
  const brands = brandConfig.brands.map((candidate) => ({
    brand_id: `BR-${hashId(candidate.brandName)}`,
    brand_name: candidate.brandName,
    category_hint: candidate.categoryHint || null,
    origin_hint: candidate.originHint || null,
    source_group: candidate.sourceGroup || 'unspecified',
    is_brand: candidate.isBrand !== false,
    needs_brand_resolution: candidate.needsBrandResolution === true,
    verification_status: 'candidate',
    official_website: null,
    source: 'user_provided_candidate_brand_list',
    source_url: null,
    created_at: generatedAt,
  }));

  const productTemplates = brandConfig.brands.map((candidate) =>
    buildTemplate(candidate, config, generatedAt));

  return {
    meta: {
      domain: config.domain,
      marketModule: config.marketModule,
      generatedAt,
      notice: config.notice,
      productDataPolicy: 'No product facts, prices, barcodes, awards or image URLs are generated.',
      scope: config.scope,
    },
    scaleTargets: config.scaleTargets,
    features: config.features,
    complianceChecklist: config.complianceChecklist,
    currencies: config.currencies,
    languages: config.languages,
    countries: config.targetMarkets.map((market) => ({
      country_code: market.code,
      name: market.name,
      region: market.region,
      currency_code: market.currency,
      default_language_code: market.languages[0] || null,
      age_gate_required: market.ageGateRequired,
      regulatory_profile: market.regulatoryProfile,
      regulator_reference: market.regulatorReference,
      scope_class: market.scopeClass,
      activation_state: market.activationState,
      licensing_owner: market.licensingOwner,
      effective_date: market.effectiveDate,
      counsel_review_ref: market.counselReviewRef,
      compliance_review_required: true,
      languages: market.languages,
    })),
    paymentGatewayCandidates: config.paymentGatewayCandidates,
    workflows: config.workflows,
    validationRules: config.validationRules,
    brands,
    productTemplates,
  };
}

export function buildPrototypeSnapshot(registry) {
  const brandGroups = Object.entries(
    registry.brands.reduce((groups, brand) => {
      const key = brand.source_group || 'unspecified';
      if (!groups[key]) groups[key] = [];
      groups[key].push(brand.brand_name);
      return groups;
    }, {}),
  ).map(([id, names]) => ({ id, names }));

  return {
    notice: registry.meta.notice,
    productDataPolicy: registry.meta.productDataPolicy,
    scope: registry.meta.scope,
    scaleTargets: registry.scaleTargets,
    markets: registry.countries.map((country) => ({
      code: country.country_code,
      name: country.name,
      region: country.region,
      currency: country.currency_code,
      languages: country.languages,
      ageGateRequired: country.age_gate_required,
    })),
    languages: registry.languages,
    brandGroups,
    candidateBrandCount: registry.brands.length,
    draftTemplateCount: registry.productTemplates.length,
    gatewayCandidates: registry.paymentGatewayCandidates.map((gateway) => ({
      code: gateway.code,
      name: gateway.name,
      countries: gateway.countries,
      integrationStatus: gateway.integrationStatus,
    })),
    workflowCount: registry.workflows.length,
    validationRuleCount: registry.validationRules.length,
  };
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

async function writePrototypeSnapshot(registry) {
  const snapshot = buildPrototypeSnapshot(registry);
  const source = '/* Generated by npm run africa:build from packages/db/config/africa-marketplace.json. Do not edit by hand. */\n' +
    'export const AFRICA_MARKETPLACE = ' + JSON.stringify(snapshot, null, 2) + ';\n';
  await fs.mkdir(path.dirname(PROTOTYPE_SNAPSHOT), { recursive: true });
  await fs.writeFile(PROTOTYPE_SNAPSHOT, source, 'utf8');
  return PROTOTYPE_SNAPSHOT;
}

async function main() {
  const config = JSON.parse(await fs.readFile(DEFAULT_CONFIG, 'utf8'));
  const brandConfig = JSON.parse(await fs.readFile(DEFAULT_BRANDS, 'utf8'));
  const registry = buildRegistry(config, brandConfig);
  const snapshotPath = await writePrototypeSnapshot(registry);
  await writeJson(DEFAULT_OUT, registry);
  await fs.mkdir(path.dirname(DEFAULT_OUT), { recursive: true });
  await fs.writeFile(
    DEFAULT_OUT.replace(/\.json$/i, '.jsonl'),
    registry.productTemplates.map((row) => JSON.stringify(row)).join('\n') + '\n',
    'utf8',
  );
  console.log(`[africa-marketplace] ${registry.countries.length} design-target markets`);
  console.log(`[africa-marketplace] ${registry.brands.length} candidate brands`);
  console.log(`[africa-marketplace] ${registry.productTemplates.length} draft listing templates`);
  console.log(`[africa-marketplace] ${registry.validationRules.length} validation rules`);
  console.log(`[write] ${DEFAULT_OUT}`);
  console.log(`[write] ${snapshotPath}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`[africa-marketplace-build] ${error.message}`);
    process.exitCode = 1;
  });
}
