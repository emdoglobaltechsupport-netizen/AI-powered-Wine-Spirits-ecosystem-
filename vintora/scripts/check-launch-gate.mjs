#!/usr/bin/env node
/**
 * Public-launch gate. This is intentionally fail-closed for the prototype.
 *
 * A green Phase 1 verification run is not launch approval. This checker proves
 * that no launch manifest or commercial-licence record is asserting approval
 * that the repository cannot evidence.
 */
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (name) => JSON.parse(readFileSync(join(ROOT, 'config', name), 'utf8'));

const manifest = readJson('launch-manifest.json');
const licensing = readJson('commercial-licensing-policy.json');
const highRisk = readJson('high-risk-features.json');
const configSource = readFileSync(join(ROOT, 'services', 'api', 'src', 'config.ts'), 'utf8');
const readme = readFileSync(join(ROOT, 'README.md'), 'utf8');
const featureStatus = readFileSync(join(ROOT, 'FEATURE_STATUS.md'), 'utf8');

const errors = [];
const fail = (message) => errors.push(message);

if (manifest.publicLaunch !== false) fail('launch-manifest.publicLaunch must be false in this prototype');
if (manifest.environment !== 'prototype') fail('launch-manifest.environment must be "prototype"');
if (!Array.isArray(manifest.enabledHighRiskFeatures) || manifest.enabledHighRiskFeatures.length) {
  fail('launch-manifest.enabledHighRiskFeatures must be empty');
}
if (!manifest.licenceEvidenceRefs || Object.keys(manifest.licenceEvidenceRefs).length) {
  fail('launch-manifest.licenceEvidenceRefs must be empty until commercial evidence exists');
}
for (const field of ['legalApprover', 'complianceApprover', 'guardRemovalApprovalRef']) {
  if (manifest[field] !== null) fail(`launch-manifest.${field} must be null`);
}
if (manifest.phase1GatesOnlyBanner !== true) fail('launch-manifest.phase1GatesOnlyBanner must be true');

if (licensing.publicLaunch !== false) fail('commercial-licensing-policy.publicLaunch must be false');
if (!Array.isArray(licensing.domains) || licensing.domains.length < 6) {
  fail('commercial-licensing-policy must enumerate all six commercial licence domains');
} else {
  for (const domain of licensing.domains) {
    if (domain.required !== true) fail(`${domain.id}: required must be true`);
    if (domain.status !== 'not_obtained') fail(`${domain.id}: status must be not_obtained`);
    if (domain.evidenceRef !== null) fail(`${domain.id}: evidenceRef must be null`);
  }
}

const highRiskFeatures = Array.isArray(highRisk.features) ? highRisk.features : [];
if (highRiskFeatures.length < 14) {
  fail('high-risk-features.json must retain the full blocked register');
} else {
  for (const feature of highRiskFeatures) {
    if (feature.status !== 'blocked') fail(`${feature.id}: must remain blocked`);
    if (feature.legalSignoff !== null || feature.complianceSignoff !== null) {
      fail(`${feature.id}: sign-offs must remain null`);
    }
  }
}

if (!configSource.includes('Production startup is disabled')) {
  fail('API production startup guard was removed from services/api/src/config.ts');
}
if (!configSource.includes('Runtime boundary self-test failed')) {
  fail('API runtime boundary self-test was removed from services/api/src/config.ts');
}
if (!readme.includes('Phase 1 gates only')) {
  fail('README.md must state that Phase 1 gates only are verified');
}
if (!featureStatus.includes('Phase 1 gates only')) {
  fail('FEATURE_STATUS.md must state that Phase 1 gates only are verified');
}

if (errors.length) {
  console.error(`Launch gate failed: ${errors.length} finding(s).`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log(`Launch gate check passed: public launch disabled, 6 commercial licence domains unobtained, ${highRiskFeatures.length} high-risk features blocked and unsigned.`);
console.log('A green Phase 1 verification run is not launch approval.');
