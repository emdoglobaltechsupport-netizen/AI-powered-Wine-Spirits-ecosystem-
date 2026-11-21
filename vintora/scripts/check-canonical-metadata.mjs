#!/usr/bin/env node
/**
 * Canonical metadata gate.
 *
 * Verifies that the machine-readable module, region, currency, language and
 * count index is derived from its named authoritative sources. It validates
 * metadata parity, not the realism or activation of any target.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(ROOT, path), 'utf8');
const meta = JSON.parse(read('config/canonical-metadata.json'));
const docs = JSON.parse(read('config/docs-governance.json'));
const testCounts = JSON.parse(read('config/test-counts.json'));
const jurisdiction = JSON.parse(read('config/jurisdiction-compliance.json'));
const africa = JSON.parse(read('packages/db/config/africa-marketplace.json'));
const catalogue = JSON.parse(read('config/catalogue-provenance.json'));
const shared = read('packages/shared/src/index.ts');
const errors = [];
const fail = (message) => errors.push(message);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const requireText = (haystack, needle, label) => {
  if (!haystack.includes(needle)) fail(`${label} must contain ${JSON.stringify(needle)}`);
};
const listFromType = (name) => {
  const match = shared.match(new RegExp(`export type ${name} = ([^;]+);`));
  return match ? [...match[1].matchAll(/'([^']+)'/g)].map((item) => item[1]) : [];
};

if (meta.status !== 'prototype-canonical-metadata' || meta.prototypeMode !== true || meta.publicLaunch !== false) {
  fail('canonical metadata must remain a prototype register with no public launch');
}
if (meta.validation?.deriveModulesFromSharedCanon !== true || meta.validation?.failOnDrift !== true) {
  fail('canonical metadata must derive values from sources and fail on drift');
}

const modulesBlock = shared.slice(shared.indexOf('modules: ['), shared.indexOf('scale: {'));
const canonicalModules = [...modulesBlock.matchAll(/'Vintora [^']+'/g)].map((match) => match[0].slice(1, -1));
if (!same(canonicalModules, meta.modules?.names)) fail('module names differ from CANON.modules');
if (meta.modules?.count !== canonicalModules.length || canonicalModules.length !== 10) fail('module count must be 10');
if (!same(meta.modules?.internalLayers, docs.schemas?.internalLayers?.names)) fail('internal layers differ from docs governance');
if (meta.modules?.internalLayers?.length !== 4) fail('internal layer count must be 4');

if (!same(meta.regions?.phase1Codes, jurisdiction.scopeClasses?.phase1)) fail('phase-1 regions differ from jurisdiction register');
if (!same(meta.regions?.africaTargetCodes, jurisdiction.scopeClasses?.target)) fail('Africa target regions differ from jurisdiction register');
if (!same(meta.regions?.africaTargetCodes, africa.targetMarkets?.map((market) => market.code))) fail('Africa target regions differ from Africa registry');
if (meta.regions?.africaScopeStatus !== 'design_target' || meta.regions?.africaActivationState !== 'blocked' ||
    jurisdiction.globalScope?.activeCountries !== 0) {
  fail('regions must remain design-target, blocked and with zero active countries');
}
if (africa.scope?.activeLanguagesByEnvironment?.staging?.length || africa.scope?.activeLanguagesByEnvironment?.production?.length ||
    africa.scope?.activeCurrenciesByEnvironment?.local?.length || africa.scope?.activeCurrenciesByEnvironment?.staging?.length ||
    africa.scope?.activeCurrenciesByEnvironment?.production?.length) {
  fail('Africa registry must have no active languages or currencies in promoted environments');
}

const currencyCodes = listFromType('CurrencyCode');
const localeCodes = listFromType('LocaleCode');
if (!same(meta.currencies?.prototypeCodes, currencyCodes)) fail('prototype currency codes differ from CurrencyCode');
if (!same(meta.languages?.prototypeLocaleCodes, localeCodes)) fail('prototype locale codes differ from LocaleCode');
if (!same(meta.languages?.africaRegistryCodes, africa.languages?.map((language) => language.code))) fail('Africa language codes differ from Africa registry');
const currencyTarget = Number(String(jurisdiction.globalScope?.currencies ?? '').match(/(\d+)\+/)?.[1]);
const languageTarget = Number(String(jurisdiction.globalScope?.languages ?? '').match(/(\d+)\s+launch languages/)?.[1]);
if (!currencyTarget || meta.currencies?.targetCount !== currencyTarget) fail('currency target count differs from jurisdiction register');
if (!languageTarget || meta.languages?.targetCount !== languageTarget) fail('language target count differs from jurisdiction register');
if (meta.languages?.targetCodes?.length !== languageTarget || new Set(meta.languages.targetCodes).size !== languageTarget) {
  fail('language target code list must contain one unique code per target language');
}
if (!same(meta.currencies?.stagingActiveCodes, []) || !same(meta.currencies?.productionActiveCodes, []) ||
    !same(meta.languages?.stagingActiveCodes, jurisdiction.globalScope?.activeLanguages) ||
    !same(meta.languages?.productionActiveCodes, jurisdiction.globalScope?.activeLanguages)) {
  fail('no currency or language may be active in staging or production');
}

const n = docs.schemas?.numbers ?? {};
const t = testCounts.totals ?? {};
const expectedCounts = {
  modules: canonicalModules.length,
  internalLayers: docs.schemas?.internalLayers?.count,
  adminWorkspaces: n.adminWorkspaces,
  techopsAgents: n.techopsAgents,
  deliverables: n.deliverables,
  demoSkuRows: catalogue.currentRecordCount,
  licensedFeeds: catalogue.licensedSourceCount,
  verifiedRows: catalogue.verifiedRecordCount,
  skuAcquisitionTarget: catalogue.acquisitionTargetCount,
  browserChecks: t.browserChecks,
  browserStaticCheckSites: testCounts.suites?.browser?.staticCheckSites,
  offlineAssertions: t.offlineAssertions,
  independentPhase1Checks: t.independentPhase1Checks,
};
for (const [key, value] of Object.entries(expectedCounts)) {
  if (meta.counts?.[key] !== value) fail(`count ${key} differs from source (${meta.counts?.[key]} vs ${value})`);
}

const doc = read('CANONICAL_METADATA.md');
for (const heading of ['## 1. Authority chain', '## 2. Modules and internal layers', '## 3. Regions, currencies and languages',
  '## 4. Counts', '## 5. Evidence gaps']) {
  requireText(doc, heading, 'CANONICAL_METADATA.md');
}
requireText(doc, 'config/canonical-metadata.json', 'CANONICAL_METADATA.md');
requireText(doc, 'no active languages or currencies', 'CANONICAL_METADATA.md');
for (const ref of ['_canon.md', 'packages/shared/src/index.ts', 'config/jurisdiction-compliance.json',
  'config/docs-governance.json', 'config/test-counts.json']) {
  if (!existsSync(join(ROOT, ref))) fail(`missing canonical source: ${ref}`);
}

if (errors.length) {
  console.error(`Canonical metadata check failed: ${errors.length} finding(s).`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}
console.log(`Canonical metadata check passed: ${meta.modules.count} modules, ${meta.regions.africaTargetCodes.length} Africa targets, ${meta.currencies.prototypeCodes.length} demo currencies, ${meta.languages.targetCodes.length} language targets.`);
console.log('Counts derive from registers; no region, language or currency is active in staging or production.');
