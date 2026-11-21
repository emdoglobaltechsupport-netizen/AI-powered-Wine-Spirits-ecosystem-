#!/usr/bin/env node
/* =========================================================
   Vintora Africa Marketplace registry loader.

   Applies the RLS-enabled schema and imports country, language,
   currency, gateway, brand, template, rule and workflow config.
   It never promotes draft templates to approved products.
   ========================================================= */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import pg from 'pg';

const { Client } = pg;
const HERE = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = path.resolve(HERE, '..');

function parseArgs(argv) {
  const options = {
    input: path.join(PACKAGE_ROOT, 'output', 'africa-marketplace.registry.json'),
    sql: path.join(PACKAGE_ROOT, 'sql', 'africa_marketplace.sql'),
    databaseUrl: process.env.DATABASE_URL || '',
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') options.help = true;
    else if (arg === '--input') options.input = argv[++i];
    else if (arg === '--sql') options.sql = argv[++i];
    else if (arg === '--database-url') options.databaseUrl = argv[++i];
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

const UPSERTS = {
  currency: `INSERT INTO am_currencies (code, name, minor_units, fx_source, active)
    VALUES ($1,$2,$3,$4,true)
    ON CONFLICT (code) DO UPDATE SET name=EXCLUDED.name, minor_units=EXCLUDED.minor_units,
      fx_source=EXCLUDED.fx_source, active=true, updated_at=now()`,
  language: `INSERT INTO am_languages (code, name, locale, rtl)
    VALUES ($1,$2,$3,$4)
    ON CONFLICT (code) DO UPDATE SET name=EXCLUDED.name, locale=EXCLUDED.locale, rtl=EXCLUDED.rtl`,
  country: `INSERT INTO am_countries (
      country_code, name, region, currency_code, default_language_code,
      age_gate_required, regulatory_profile, regulator_reference, compliance_review_required
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    ON CONFLICT (country_code) DO UPDATE SET
      name=EXCLUDED.name, region=EXCLUDED.region, currency_code=EXCLUDED.currency_code,
      default_language_code=EXCLUDED.default_language_code,
      age_gate_required=EXCLUDED.age_gate_required,
      regulatory_profile=EXCLUDED.regulatory_profile,
      regulator_reference=EXCLUDED.regulator_reference,
      compliance_review_required=EXCLUDED.compliance_review_required,
      updated_at=now()`,
  countryLanguage: `INSERT INTO am_country_languages (country_code, language_code, is_default)
    VALUES ($1,$2,$3)
    ON CONFLICT (country_code, language_code) DO UPDATE SET is_default=EXCLUDED.is_default`,
  gateway: `INSERT INTO am_payment_gateways (
      code, name, countries, currencies, integration_status, credential_env
    ) VALUES ($1,$2,$3,$4,$5,$6)
    ON CONFLICT (code) DO UPDATE SET
      name=EXCLUDED.name, countries=EXCLUDED.countries, currencies=EXCLUDED.currencies,
      integration_status=EXCLUDED.integration_status, credential_env=EXCLUDED.credential_env`,
  brand: `INSERT INTO am_brands (
      brand_id, brand_name, category_hint, origin_hint, source_group, is_brand,
      needs_brand_resolution, verification_status, official_website, source, source_url
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    ON CONFLICT (brand_id) DO UPDATE SET
      brand_name=EXCLUDED.brand_name, category_hint=EXCLUDED.category_hint,
      origin_hint=EXCLUDED.origin_hint, source_group=EXCLUDED.source_group,
      is_brand=EXCLUDED.is_brand, needs_brand_resolution=EXCLUDED.needs_brand_resolution,
      verification_status=EXCLUDED.verification_status,
      official_website=EXCLUDED.official_website, source=EXCLUDED.source,
      source_url=EXCLUDED.source_url, updated_at=now()`,
  template: `INSERT INTO am_product_templates (
      template_id, brand_id, brand_name, category_hint, listing_status, template
    ) VALUES ($1,$2,$3,$4,$5,$6::jsonb)
    ON CONFLICT (template_id) DO UPDATE SET
      brand_id=EXCLUDED.brand_id, brand_name=EXCLUDED.brand_name,
      category_hint=EXCLUDED.category_hint, listing_status=EXCLUDED.listing_status,
      template=EXCLUDED.template, updated_at=now()`,
  rule: `INSERT INTO am_validation_rules (rule_id, severity, description, config)
    VALUES ($1,$2,$3,$4::jsonb)
    ON CONFLICT (rule_id) DO UPDATE SET
      severity=EXCLUDED.severity, description=EXCLUDED.description,
      config=EXCLUDED.config, updated_at=now()`,
  workflow: `INSERT INTO am_workflow_definitions (workflow_id, name, states, guards, description)
    VALUES ($1,$2,$3,$4::jsonb,$5)
    ON CONFLICT (workflow_id) DO UPDATE SET
      name=EXCLUDED.name, states=EXCLUDED.states, guards=EXCLUDED.guards,
      description=EXCLUDED.description, updated_at=now()`,
};

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(`Vintora Africa Marketplace registry loader\n\n` +
      `node scripts/africa-marketplace-import.mjs --input output/africa-marketplace.registry.json \\\n` +
      `  --database-url "$DATABASE_URL"\n`);
    return;
  }
  if (!options.databaseUrl) throw new Error('DATABASE_URL is required.');

  const registry = JSON.parse(await fs.readFile(path.resolve(options.input), 'utf8'));
  const ddl = await fs.readFile(path.resolve(options.sql), 'utf8');
  const client = new Client({
    connectionString: options.databaseUrl,
    application_name: 'vintora-africa-marketplace-import',
  });
  await client.connect();

  try {
    await client.query('BEGIN');
    await client.query(ddl);

    for (const currency of registry.currencies) {
      await client.query(UPSERTS.currency, [
        currency.code, currency.name, currency.minorUnits, currency.fxSource,
      ]);
    }
    for (const language of registry.languages) {
      await client.query(UPSERTS.language, [
        language.code, language.name, language.locale, language.rtl,
      ]);
    }
    for (const country of registry.countries) {
      await client.query(UPSERTS.country, [
        country.country_code, country.name, country.region, country.currency_code,
        country.default_language_code, country.age_gate_required,
        country.regulatory_profile, country.regulator_reference,
        country.compliance_review_required,
      ]);
      for (const languageCode of country.languages || []) {
        await client.query(UPSERTS.countryLanguage, [
          country.country_code,
          languageCode,
          languageCode === country.default_language_code,
        ]);
      }
    }
    for (const gateway of registry.paymentGatewayCandidates) {
      await client.query(UPSERTS.gateway, [
        gateway.code, gateway.name, gateway.countries, gateway.currencies,
        gateway.integrationStatus, gateway.credentialEnv,
      ]);
    }
    for (const brand of registry.brands) {
      await client.query(UPSERTS.brand, [
        brand.brand_id, brand.brand_name, brand.category_hint, brand.origin_hint,
        brand.source_group, brand.is_brand, brand.needs_brand_resolution,
        brand.verification_status, brand.official_website, brand.source, brand.source_url,
      ]);
    }
    for (const template of registry.productTemplates) {
      await client.query(UPSERTS.template, [
        template.template_id, template.brand_id, template.brand_name,
        template.category, template.listing_status, JSON.stringify(template),
      ]);
    }
    for (const rule of registry.validationRules) {
      await client.query(UPSERTS.rule, [rule.id, rule.severity, rule.description, '{}']);
    }
    for (const workflow of registry.workflows) {
      await client.query(UPSERTS.workflow, [
        workflow.workflowId, workflow.name, workflow.states,
        JSON.stringify(workflow.guards), `${workflow.name} state machine`,
      ]);
    }
    await client.query(`INSERT INTO am_audit
      (table_name, entity_id, action, actor, source, reason, after)
      VALUES ('registry', 'BATCH', 'import', 'africa-marketplace-import', $1, $2, $3::jsonb)`, [
      path.resolve(options.input),
      'Africa Marketplace registry imported; draft templates not promoted to products',
      JSON.stringify({
        countries: registry.countries.length,
        brands: registry.brands.length,
        templates: registry.productTemplates.length,
        rules: registry.validationRules.length,
        workflows: registry.workflows.length,
      }),
    ]);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }

  console.log(`[africa-marketplace-import] ${registry.countries.length} countries, ${registry.brands.length} candidate brands.`);
  console.log(`[africa-marketplace-import] ${registry.productTemplates.length} draft templates, ${registry.validationRules.length} rules, ${registry.workflows.length} workflows.`);
  console.log('[africa-marketplace-import] No draft template was promoted to am_products.');
}

main().catch((error) => {
  console.error(`[africa-marketplace-import] ${error.message}`);
  process.exitCode = 1;
});
