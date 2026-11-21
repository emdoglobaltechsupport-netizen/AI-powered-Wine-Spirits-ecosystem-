#!/usr/bin/env node
/**
 * Catalogue provenance gate.
 *
 * Demo/seed rows must be labelled as demo at the API boundary. A verified
 * source is never silently substituted for demo rows; it requires a separate
 * adapter, rights evidence and confidence threshold.
 */
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => readFileSync(join(ROOT, relativePath), 'utf8');
const policy = JSON.parse(read('config/catalogue-provenance.json'));

const routes = read('services/api/src/modules/catalog/catalog.routes.ts');
const apiConfig = read('services/api/src/config.ts');
const envExample = read('.env.example');
const compose = read('docker-compose.yml');
const importer = read('packages/db/scripts/catalogue-import.mjs');
const verifiedSql = read('packages/db/sql/catalogue_import.sql');
const smoke = read('services/api/scripts/smoke.mjs');
const checkoutRoutes = read('services/api/src/modules/checkout/checkout.routes.ts');
const staticData = read('apps/prototype/data.js');
const uiCore = read('apps/prototype/src/core.js');
const productView = read('apps/prototype/src/views/catalog.js');
const checkoutView = read('apps/prototype/src/views/checkout.js');
const selftest = read('apps/prototype/selftest.js');
const seedSql = read(policy.demoSourceRef);
const taxonomy = JSON.parse(read('packages/db/config/catalogue-taxonomy.json'));

const errors = [];
const requireText = (haystack, needle, label) => {
  if (!haystack.includes(needle)) errors.push(`${label} must contain ${JSON.stringify(needle)}`);
};

if (policy.servedSource !== 'demo') errors.push('config/catalogue-provenance.json servedSource must be "demo"');
if (policy.demoSourceRef !== 'packages/db/seed/001_seed.sql') errors.push('demoSourceRef must point to the seed catalogue');
if (policy.verifiedSourceRef !== 'catalogue_import_verified') errors.push('verifiedSourceRef must point to catalogue_import_verified');
if (policy.requireLicenceEvidence !== true) errors.push('verified catalogue must require licence evidence');
if (policy.fixturesExcludedFromVerified !== true) errors.push('fixtures must be excluded from verified output');
if (JSON.stringify(policy.recordClasses) !== JSON.stringify(['seed', 'licensed', 'verified', 'live'])) {
  errors.push('recordClasses must be seed, licensed, verified, live');
}
if (policy.servedRecordClass !== 'seed' || policy.staticFallbackRecordClass !== 'seed' ||
    JSON.stringify(policy.purchasableClasses) !== JSON.stringify([]) ||
    policy.externalCheckoutBlocked !== true || policy.simulationOnly !== true) {
  errors.push('only seed rows are served; no class is purchasable and external checkout must be blocked');
}
if (policy.staticFallback?.sourceRef !== 'apps/prototype/data.js' ||
    policy.staticFallback?.purchasable !== false || policy.staticFallback?.verified !== false ||
    !policy.staticFallback?.freshnessAsOf) {
  errors.push('static fallback must carry source, freshness and non-purchasable labels');
}
if (policy.checkoutEligibility?.requireRecordClass !== 'live' ||
    policy.checkoutEligibility?.allowedWhenPaymentProvider !== 'simulated' ||
    policy.checkoutEligibility?.blockedMessage !== 'Live checkout is disabled for unverified catalogue rows') {
  errors.push('checkout eligibility must block live payment for unverified rows');
}
if (policy.minConfidence !== 0.7) errors.push('minConfidence must be 0.7');
if (policy.publicLaunchRequiresVerified !== true) errors.push('public launch must require verified catalogue');
if (policy.currentCountLabel !== 'current demo data') errors.push('current catalogue counts must be labelled "current demo data"');
if (policy.licensedSourceCount !== 0) errors.push('licensedSourceCount must remain 0 until a licensed feed is evidenced');
if (policy.verifiedRecordCount !== 0) errors.push('verifiedRecordCount must remain 0 until verified rows are imported');
if (policy.acquisitionTargetCount !== 1850) errors.push('acquisitionTargetCount must match the 1,850 coverage goal');
if (!/10M\+ SKU target/i.test(policy.catalogueScaleTarget)) errors.push('catalogueScaleTarget must carry the 10M+ SKU target label');
const seedSkuCount = (seedSql.match(/'sku-\d+'/g) ?? []).length;
if (policy.currentRecordCount !== seedSkuCount) {
  errors.push(`currentRecordCount is ${policy.currentRecordCount} but ${policy.demoSourceRef} contains ${seedSkuCount} SKU rows`);
}
const taxonomyTarget = taxonomy.targets.reduce((sum, target) => sum + target.target, 0);
if (taxonomyTarget !== policy.acquisitionTargetCount) {
  errors.push(`taxonomy target total ${taxonomyTarget} differs from acquisitionTargetCount ${policy.acquisitionTargetCount}`);
}

requireText(apiConfig, "CATALOGUE_SOURCE: z.enum(['demo', 'verified']).default('demo')", 'services/api/src/config.ts');
requireText(routes, 'config.CATALOGUE_SOURCE', 'catalog.routes.ts');
requireText(routes, 'dataClass', 'catalog.routes.ts');
requireText(routes, 'sourceRef', 'catalog.routes.ts');
requireText(routes, 'sourceLabel', 'catalog.routes.ts');
requireText(routes, 'sourceClass', 'catalog.routes.ts');
requireText(routes, "fixtureClass: 'demo'", 'catalog.routes.ts');
requireText(routes, 'purchasable: false', 'catalog.routes.ts');
requireText(routes, 'CATALOGUE_CHECKOUT_ELIGIBILITY', 'catalog.routes.ts');
requireText(routes, 'Verified catalogue adapter is not enabled in the prototype', 'catalog.routes.ts');
requireText(checkoutRoutes, 'Live checkout is disabled for unverified catalogue rows', 'checkout.routes.ts');
requireText(checkoutRoutes, 'CATALOGUE_CHECKOUT_ELIGIBILITY', 'checkout.routes.ts');
requireText(checkoutRoutes, 'config.PAYMENT_PROVIDER !== \'simulated\'', 'checkout.routes.ts');
requireText(envExample, 'CATALOGUE_SOURCE=demo', '.env.example');
requireText(compose, 'CATALOGUE_SOURCE: ${CATALOGUE_SOURCE:-demo}', 'docker-compose.yml');
requireText(importer, '--include-fixtures', 'catalogue-import.mjs');
requireText(importer, 'minConfidence', 'catalogue-import.mjs');
requireText(verifiedSql, 'CREATE OR REPLACE VIEW catalogue_import_verified', 'catalogue_import.sql');
requireText(smoke, 'not verified inventory', 'smoke.mjs');
requireText(smoke, "all.body.catalogueSource.sourceClass, 'seed'", 'smoke.mjs');
requireText(smoke, 'body.catalogueEligibility.externalCheckoutBlocked', 'smoke.mjs');
requireText(staticData, "sourceClass: 'seed'", 'apps/prototype/data.js');
requireText(staticData, "fixtureClass: 'demo'", 'apps/prototype/data.js');
requireText(staticData, 'purchasable: false', 'apps/prototype/data.js');
requireText(staticData, 'freshnessAsOf', 'apps/prototype/data.js');
requireText(uiCore, 'Seed demo record', 'apps/prototype/src/core.js');
requireText(uiCore, 'not licensed or verified · not purchasable', 'apps/prototype/src/core.js');
requireText(productView, 'Demo record · not purchasable', 'apps/prototype/src/views/catalog.js');
requireText(productView, 'Illustrative provenance chain (demo data)', 'apps/prototype/src/views/catalog.js');
requireText(checkoutView, 'Simulation only:', 'apps/prototype/src/views/checkout.js');
requireText(checkoutView, 'not purchasable', 'apps/prototype/src/views/checkout.js');
requireText(selftest, 'every product has isolated catalogue provenance', 'apps/prototype/selftest.js');
requireText(selftest, 'cart labels checkout as simulation only', 'apps/prototype/selftest.js');

if (errors.length) {
  console.error(`Catalogue provenance check failed: ${errors.length} finding(s).`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log('Catalogue provenance check passed: API serves labelled demo rows; verified source remains a separate evidence-bound adapter.');
