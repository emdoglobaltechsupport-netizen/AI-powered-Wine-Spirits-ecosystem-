#!/usr/bin/env node
/**
 * Test fixture taxonomy gate.
 *
 * Verifies the demo/mock/synthetic/live data classes, per-fixture labels and
 * checkout isolation. It proves labelling and fail-closed boundaries only; no
 * live fixture or external-effect fixture exists in this prototype.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(ROOT, path), 'utf8');
const parse = (path) => JSON.parse(read(path));
const policy = parse('config/fixture-taxonomy.json');
const catalogue = parse('config/catalogue-provenance.json');
const errors = [];
const fail = (message) => errors.push(message);
const requireText = (haystack, needle, label) => {
  if (!haystack.includes(needle)) fail(`${label} must contain ${JSON.stringify(needle)}`);
};
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

if (policy.status !== 'prototype-fixture-taxonomy' || policy.prototypeMode !== true || policy.publicLaunch !== false) {
  fail('fixture taxonomy must remain a prototype register with no public launch');
}
if (!same(policy.classes, ['demo', 'mock', 'synthetic', 'live'])) fail('fixture classes must be demo, mock, synthetic and live');
for (const field of ['fixtureClass', 'sourceRef', 'sourceLabel', 'freshnessAsOf', 'purchasable', 'externalEffectAllowed']) {
  if (!policy.requiredFields?.includes(field)) fail(`required fixture field missing: ${field}`);
}
for (const name of policy.classes) {
  const definition = policy.definitions?.[name];
  if (!definition) fail(`missing fixture definition: ${name}`);
  if (definition.purchasable !== false || definition.externalEffectAllowed !== false || definition.importAllowed !== false) {
    fail(`${name} fixtures must be non-purchasable with no external effects or import`);
  }
}
if (policy.definitions?.live?.present !== false || policy.liveFixturesPresent !== false) fail('live fixtures must not be present');
if (policy.servedFixtureClass !== 'demo' || policy.staticFallbackFixtureClass !== 'demo') fail('served and static fixtures must be demo class');
if (!same(policy.checkoutEligibility?.allowedFixtureClasses, []) ||
    policy.checkoutEligibility?.blockedMessage !== catalogue.checkoutEligibility?.blockedMessage) {
  fail('no fixture class is checkout-eligible; blocked message must match catalogue policy');
}

if (!Array.isArray(policy.fixtureFiles) || policy.fixtureFiles.length < 2) fail('at least two fixture files must be registered');
for (const entry of policy.fixtureFiles ?? []) {
  if (!existsSync(join(ROOT, entry.path))) {
    fail(`fixture file is missing: ${entry.path}`);
    continue;
  }
  const raw = read(entry.path);
  let fixture;
  try {
    fixture = JSON.parse(raw);
  } catch {
    fail(`${entry.path}: fixture JSON is invalid`);
    continue;
  }
  const metadata = fixture._fixture;
  if (!metadata) {
    fail(`${entry.path}: missing _fixture metadata`);
    continue;
  }
  for (const field of policy.requiredFields) {
    if (!(field in metadata)) fail(`${entry.path}: _fixture.${field} is required`);
  }
  if (metadata.fixtureClass !== entry.fixtureClass) fail(`${entry.path}: fixtureClass must be ${entry.fixtureClass}`);
  if (metadata.purchasable !== false || metadata.externalEffectAllowed !== false) fail(`${entry.path}: fixture must be non-purchasable and effect-free`);
  if (fixture.license !== 'TEST_FIXTURE_NOT_FOR_IMPORT') fail(`${entry.path}: fixture licence marker is missing`);
  for (const marker of entry.noticeMarkers ?? []) requireText(raw, marker, entry.path);
}

const staticData = read('apps/prototype/data.js');
const routes = read('services/api/src/modules/catalog/catalog.routes.ts');
const smoke = read('services/api/scripts/smoke.mjs');
const selftest = read('apps/prototype/selftest.js');
requireText(staticData, "fixtureClass: 'demo'", 'apps/prototype/data.js');
requireText(staticData, 'purchasable: false', 'apps/prototype/data.js');
requireText(routes, "fixtureClass: 'demo'", 'catalog.routes.ts');
requireText(routes, "fixtureClass: 'mock'", 'catalog.routes.ts');
requireText(smoke, "catalogueSource.fixtureClass, 'demo'", 'smoke.mjs');
requireText(smoke, "found.body.fixtureClass, 'demo'", 'smoke.mjs');
requireText(selftest, "p.fixtureClass !== 'demo'", 'apps/prototype/selftest.js');

const doc = read('FIXTURE_TAXONOMY.md');
for (const heading of ['## 1. Required label', '## 2. Classes', '## 3. Fixture files', '## 4. Checkout boundary', '## 5. Evidence gaps']) {
  requireText(doc, heading, 'FIXTURE_TAXONOMY.md');
}
for (const name of policy.classes) requireText(doc, `\`${name}\``, 'FIXTURE_TAXONOMY.md');
requireText(doc, 'config/fixture-taxonomy.json', 'FIXTURE_TAXONOMY.md');
requireText(doc, 'simulationOnly: true', 'FIXTURE_TAXONOMY.md');

if (errors.length) {
  console.error(`Fixture taxonomy check failed: ${errors.length} finding(s).`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}
console.log(`Fixture taxonomy check passed: ${policy.classes.length} classes, ${policy.fixtureFiles.length} labelled fixtures.`);
console.log('No fixture is live, purchasable or able to cause an external effect.');
