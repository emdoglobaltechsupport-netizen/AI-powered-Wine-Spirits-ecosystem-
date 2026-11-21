#!/usr/bin/env node
/**
 * Documentation claim gate.
 *
 * Reconciles headline claims with machine-readable counts and rejects
 * launch-confusable phrases unless the same line explicitly qualifies them.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => readFileSync(join(ROOT, relativePath), 'utf8');

const highRisk = JSON.parse(read('config/high-risk-features.json'));
const forecasts = JSON.parse(read('config/market-forecasts.json'));
const implementationStatus = JSON.parse(read('config/implementation-status.json'));
const testCounts = JSON.parse(read('config/test-counts.json'));
const smoke = read('services/api/scripts/smoke.mjs');
const forecastChecker = read('scripts/validate-forecasts.mjs');
const readme = read('README.md');
const validation = read('VALIDATION_STATUS.md');
const building = read('BUILDING.md');
const roadmap = read('ROADMAP.md');
const apiPolicy = read('API_POLICY.md');
const featureStatus = read('FEATURE_STATUS.md');
const governance = read('CANON_GOVERNANCE.md');

const smokeChecks = (smoke.match(/await check\(/g) ?? []).length;
const browserChecks = testCounts.totals.browserChecks;
const catalogueAssertions = testCounts.suites.catalogue.count;
const accessoriesAssertions = testCounts.suites.accessories.count;
const africaAssertions = testCounts.suites.africa.count;
const offlineAssertions = testCounts.totals.offlineAssertions;
const allowedOfflineCounts = new Set([catalogueAssertions, accessoriesAssertions, africaAssertions, offlineAssertions]);
const highRiskCount = highRisk.features.length;
const forecastCount = forecasts.forecasts?.length ?? forecasts.records?.length ?? 0;
let sharedTests = 0;
for (const file of readdirSync(join(ROOT, 'packages', 'shared', 'src'))) {
  if (!file.endsWith('.test.ts')) continue;
  sharedTests += (read(`packages/shared/src/${file}`).match(/^test\(/gm) ?? []).length;
}

const errors = [];
const requireText = (haystack, needle, label) => {
  if (!haystack.includes(needle)) errors.push(`${label} must contain ${JSON.stringify(needle)}`);
};

requireText(readme, `${smokeChecks} API checks`, 'README.md');
requireText(readme, 'not investor-ready', 'README.md');
requireText(readme, 'Phase 1 gates only', 'README.md');
requireText(validation, `**Shared domain tests:** ${sharedTests}/${sharedTests}`, 'VALIDATION_STATUS.md');
requireText(validation, `**API smoke checks:** ${smokeChecks}/${smokeChecks}`, 'VALIDATION_STATUS.md');
requireText(building, `(${sharedTests}/${sharedTests})`, 'BUILDING.md');
requireText(building, `(${smokeChecks}/${smokeChecks})`, 'BUILDING.md');
requireText(roadmap, `${smokeChecks} API checks`, 'ROADMAP.md');
requireText(apiPolicy, `${smokeChecks} API checks`, 'API_POLICY.md');

// Generated browser/offline suite counts must appear in every register consumer.
const generatedLine = `Offline pipelines: ${catalogueAssertions} + ${accessoriesAssertions} + ${africaAssertions} = ${offlineAssertions} assertions.`;
const independentLine = `Independent Phase 1 checks: ${browserChecks + offlineAssertions} across ${testCounts.totals.suites} suites.`;
for (const [name, document] of [['README.md', readme], ['BUILDING.md', building], ['VALIDATION_STATUS.md', validation], ['ROADMAP.md', roadmap]]) {
  requireText(document, '<!-- test-counts:start -->', name);
  requireText(document, generatedLine, name);
  requireText(document, independentLine, name);
}
requireText(featureStatus, `${highRiskCount} blocked records`, 'FEATURE_STATUS.md');
requireText(featureStatus, 'Phase 1 gates only', 'FEATURE_STATUS.md');

// Catalogue quantities must be separated into current, target and modelled claims.
const catalogueProvenance = read('CATALOGUE_PROVENANCE.md');
requireText(readme, 'Current catalogue data is **12 demo SKU rows**', 'README.md');
requireText(catalogueProvenance, '| **Current demo** | 12 SKU rows |', 'CATALOGUE_PROVENANCE.md');
requireText(catalogueProvenance, '| **Acquisition target** | 1,850 records |', 'CATALOGUE_PROVENANCE.md');
requireText(catalogueProvenance, '| **Long-term scale target** | 10M+ SKU target by 2034', 'CATALOGUE_PROVENANCE.md');

// Africa registry scope must stay subordinate to Vintora Market and unactivated.
const canon = read('_canon.md');
const africaConfig = JSON.parse(read('packages/db/config/africa-marketplace.json'));
requireText(canon, 'Africa Marketplace is a **Prototype design-target catalogue/expansion domain inside Vintora Market**', '_canon.md');
if (africaConfig.scope?.scopeStatus !== 'design_target' || africaConfig.scope?.phaseAssignment !== 'unassigned' || africaConfig.scope?.activationStatus !== 'blocked') {
  errors.push('Africa registry must be design_target, unassigned and blocked');
}
if (!africaConfig.targetMarkets.every((market) => market.scopeClass === 'target' && market.activationState === 'blocked')) {
  errors.push('every Africa market record must be target and blocked');
}
requireText(forecastChecker, 'Forecast provenance metadata check passed', 'validate-forecasts.mjs');
if (forecastCount !== 16) errors.push(`expected 16 forecast records, found ${forecastCount}`);

// Explicit lifecycle states and module/environment mapping.
const stateNames = Object.keys(implementationStatus.states);
for (const state of stateNames) {
  requireText(readme, `**${state}**`, 'README.md');
  requireText(featureStatus, `**${state}**`, 'FEATURE_STATUS.md');
  requireText(roadmap, `**${state}**`, 'ROADMAP.md');
}
for (const heading of [
  '## Implementation status',
  '### Maturity states',
  '### Module status',
  '### Internal layers and environment status',
  '## What is and is not implemented',
  '## Claim review requirement',
]) {
  requireText(readme, heading, 'README.md');
}
requireText(readme, 'No component in this repository is in the Pilot or Production state.', 'README.md');
requireText(readme, 'not production-ready', 'README.md');
requireText(featureStatus, 'not production-ready', 'FEATURE_STATUS.md');
requireText(governance, 'Investor, roadmap and readiness claims', 'CANON_GOVERNANCE.md');
requireText(governance, 'documentation-only change cannot promote', 'CANON_GOVERNANCE.md');
requireText(roadmap, 'four-eyes review', 'ROADMAP.md');
requireText(readme, 'four-eyes review', 'README.md');

const markdownRows = (document) => document.split(/\r?\n/).filter((line) => line.trimStart().startsWith('|'));
const requireStatusRow = (document, name, state, source) => {
  const row = markdownRows(document).find((line) => line.includes(`**${name}**`) && line.includes(`| ${state} |`));
  if (!row) errors.push(`${source} must map ${name} to the ${state} state`);
};
if (implementationStatus.modules.length !== 10) errors.push(`expected 10 module status records, found ${implementationStatus.modules.length}`);
if (implementationStatus.pilotComponents.length || implementationStatus.productionComponents.length) {
  errors.push('no component may be registered in the Pilot or Production state during Phase 1');
}
for (const module of implementationStatus.modules) {
  requireStatusRow(readme, module.name, module.state, 'README.md');
}
for (const layer of implementationStatus.internalLayers) {
  requireStatusRow(readme, layer.name, layer.state, 'README.md');
}
for (const environment of implementationStatus.environments) {
  requireStatusRow(readme, environment.name, environment.state, 'README.md');
}

// Block unqualified release/validation overclaims in all Markdown documents.
// "investor-ready" and "production-ready" require an explicit adjacent negation;
// a generic same-line word such as "target" must not neutralize them. Other
// banned phrases accept the explicit qualifier list below.
const INVESTOR_READY_PATTERN = /\binvestor-ready\b/i;
const PRODUCTION_READY_PATTERN = /\bproduction-ready\b/i;
const SKU_SCALE_PATTERN = /\b10M\+?\s*SKUs?\b|\b10 million\+?\s*SKUs?\b/i;
const AFRICA_SCOPE_PATTERN = /\bAfrica(?:n)?[^\n]*\blaunch configuration\b|\b(?:Africa|African)[^\n]*\blaunch markets?\b|\b14-market rollout\b|\bAfrica[^\n]*\bactivated\b/i;
const BANNED_PATTERNS = [
  INVESTOR_READY_PATTERN,
  PRODUCTION_READY_PATTERN,
  SKU_SCALE_PATTERN,
  AFRICA_SCOPE_PATTERN,
  /\blaunch approved\b/i,
  /\bverified market data\b/i,
  /\bvalidated forecasts\b/i,
  /\bfully audited\b/i,
  /\bexternally audited\b/i,
];
const ALLOWED_PATTERNS = [
  /\bnot investor-ready\b/i,
  /\bNO-GO\b/i,
  /\bPhase 1 prototype\b/i,
  /\bnot production-ready\b/i,
  /\bBlocked\b/i,
  /\bPrototype-only\b/i,
  /\bnot launch approved\b/i,
  /\bnot verified market data\b/i,
  /\buncited\b/i,
  /\bprojection\b/i,
  /\bnot validated forecasts\b/i,
  /\bmetadata\b/i,
  /\bLow confidence\b/i,
  /\bnot fully audited\b/i,
  /\bdesign target\b/i,
  /\btarget\b/i,
  /\bnot externally audited\b/i,
  /\btarget-market\b/i,
  /\bno country activation\b/i,
  /\bunassigned\b/i,
  /\bcurrent demo\b/i,
  /\bunmeasured\b/i,
  /\bno (?:current |external |production )?(?:certification|audit|legal|launch|PSP|provider|licence|real)/i,
  /\bnever\b/i,
  /\bpending\b/i,
  /\brequired\b/i,
  /\bnot\b/i,
];

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', '.next', 'out', 'coverage', '.turbo', 'sbom']);
function walk(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      walk(path);
      continue;
    }
    if (!entry.isFile() || extname(entry.name) !== '.md') continue;
    if (statSync(path).size > 1_000_000) continue;
    const rel = relative(ROOT, path).replace(/\\/g, '/');
    const lines = readFileSync(path, 'utf8').split(/\r?\n/);
    lines.forEach((line, index) => {
      for (const match of line.matchAll(/\b(\d+)\s+API (?:smoke )?checks\b|\b(\d+)-check smoke suite\b/gi)) {
        const count = Number(match[1] ?? match[2]);
        if (count !== smokeChecks) {
          errors.push(`${rel}:${index + 1} states ${count} API smoke checks; current suite has ${smokeChecks}`);
        }
      }
      for (const match of line.matchAll(/\b(\d+)\s+(?:high-risk\s+(?:features?|records?)|blocked\s+records?)\b|\b(\d+)\s+blocked,\s+all\b/gi)) {
        const count = Number(match[1] ?? match[2]);
        if (count !== highRiskCount) {
          errors.push(`${rel}:${index + 1} states ${match[0]}; high-risk register has ${highRiskCount} blocked features`);
        }
      }
      for (const match of line.matchAll(/\b(\d+)\s*\/\s*(\d+)\s*self-test\b/gi)) {
        if (Number(match[1]) !== browserChecks || Number(match[2]) !== browserChecks) {
          errors.push(`${rel}:${index + 1} states ${match[0]} self-test; generated browser suite has ${browserChecks}`);
        }
      }
      for (const match of line.matchAll(/\b(\d+)\s*passed\s*\/\s*(\d+)\s*failed\b/gi)) {
        if (Number(match[1]) !== browserChecks || Number(match[2]) !== 0) {
          errors.push(`${rel}:${index + 1} states ${match[0]}; generated browser suite is ${browserChecks} passed / 0 failed`);
        }
      }
      for (const match of line.matchAll(/\b(\d+)-check browser self-test\b/gi)) {
        if (Number(match[1]) !== browserChecks) {
          errors.push(`${rel}:${index + 1} states ${match[0]}; generated browser suite has ${browserChecks} checks`);
        }
      }
      for (const match of line.matchAll(/\b(\d+)\s+offline assertions\b/gi)) {
        if (!allowedOfflineCounts.has(Number(match[1]))) {
          errors.push(`${rel}:${index + 1} states ${match[0]}; generated offline suites are ${catalogueAssertions}/${accessoriesAssertions}/${africaAssertions} (${offlineAssertions} total)`);
        }
      }
      for (const match of line.matchAll(/\b(\d+)\s*\+\s*(\d+)\s*\+\s*(\d+)\s*=\s*(\d+)\s+assertions\b/gi)) {
        const values = match.slice(1).map(Number);
        if (values[0] !== catalogueAssertions || values[1] !== accessoriesAssertions || values[2] !== africaAssertions || values[3] !== offlineAssertions) {
          errors.push(`${rel}:${index + 1} states ${match[0]}; generated offline totals differ`);
        }
      }
      const allowed = ALLOWED_PATTERNS.some((pattern) => pattern.test(line));
      for (const pattern of BANNED_PATTERNS) {
        if (!pattern.test(line)) continue;
        if (pattern === INVESTOR_READY_PATTERN && !/\bnot\s+investor-ready\b/i.test(line)) {
          errors.push(`${rel}:${index + 1} uses launch-confusable phrase ${pattern.source} without an explicit negation`);
          continue;
        }
        if (pattern === PRODUCTION_READY_PATTERN && !/\bnot\s+production-ready\b/i.test(line)) {
          errors.push(`${rel}:${index + 1} uses launch-confusable phrase ${pattern.source} without an explicit negation`);
          continue;
        }
        if (allowed) continue;
        errors.push(`${rel}:${index + 1} uses launch-confusable phrase ${pattern.source} without a readiness qualifier`);
      }
    });
  }
}
walk(ROOT);

if (errors.length) {
  console.error(`Documentation claim check failed: ${errors.length} finding(s).`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log(`Documentation claim check passed: ${highRiskCount} blocked features, ${sharedTests} shared tests, ${smokeChecks} API checks, ${browserChecks} browser checks, ${offlineAssertions} offline assertions, ${forecastCount} uncited forecasts, ${stateNames.length} maturity states mapped, Phase 1 gates only.`);
