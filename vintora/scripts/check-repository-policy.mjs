#!/usr/bin/env node
/**
 * Repository licence and contribution-policy gate.
 *
 * Verifies the selected first-party licence, trademark/data reservations,
 * contribution and rejection rules, asset provenance terms and the private
 * security-reporting path. This is policy metadata parity, not legal advice.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(ROOT, path), 'utf8');
const policy = JSON.parse(read('config/repository-policy.json'));
const securityReporting = JSON.parse(read('config/security-reporting.json'));
const pkg = JSON.parse(read('package.json'));
const errors = [];
const fail = (message) => errors.push(message);
const requireText = (haystack, needle, label) => {
  if (!haystack.includes(needle)) fail(`${label} must contain ${JSON.stringify(needle)}`);
};

if (policy.status !== 'prototype-repository-policy' || policy.prototypeMode !== true || policy.publicLaunch !== false) {
  fail('repository policy must remain a prototype design with no public launch');
}
if (policy.licence?.spdx !== 'Apache-2.0' || policy.licence?.noticeFileRequired !== true ||
    policy.licence?.trademarkGrant !== false || policy.licence?.patentGrant !== true) {
  fail('first-party licence must be Apache-2.0 with NOTICE and no trademark grant');
}
if (pkg.license !== 'Apache-2.0') fail('package.json license must be Apache-2.0');
for (const file of policy.requiredFiles ?? []) {
  if (!existsSync(join(ROOT, file))) fail(`missing required repository policy file: ${file}`);
}
if ((policy.rejectionRules?.length ?? 0) < 7) fail('repository policy must record at least seven rejection rules');
const contribution = policy.contribution ?? {};
if (contribution.dcoSignOffRequired !== true || contribution.distinctReviewerRequired !== true ||
    contribution.noSelfApproval !== true || contribution.secretFreeRequired !== true ||
    contribution.generatedCountsRequired !== true || contribution.canonicalClaimsReviewRequired !== true ||
    contribution.externalCallsRequireDesignReview !== true) {
  fail('contribution policy has drifted');
}
for (const check of contribution.requiredChecks ?? []) {
  if (!pkg.scripts?.[check.replace(/^npm run /, '')]) fail(`contribution policy requires missing script: ${check}`);
}
const enforcement = policy.githubEnforcement ?? {};
if (enforcement.visibility !== 'public' || enforcement.defaultBranch !== 'main' ||
    enforcement.verifiedOn !== '2026-11-25') {
  fail('GitHub enforcement metadata drifted from the verified public-repository baseline');
}
const protection = enforcement.branchProtection ?? {};
if (protection.enabled !== true || protection.strictRequiredChecks !== true ||
    protection.requiredCheckCount !== 15 || protection.enforceAdmins !== false ||
    protection.requiredApprovingReviewCount !== 1 || protection.allowForcePushes !== false ||
    protection.allowDeletions !== false) {
  fail('branch protection metadata must record 15 strict checks, one review, no force pushes and no admin enforcement');
}
const scanning = enforcement.codeScanning ?? {};
if (scanning.enabled !== true || scanning.defaultSetupState !== 'configured' || scanning.sarifUploadsBlocking !== true) {
  fail('code scanning metadata must record configured default setup and blocking SARIF uploads');
}
if (enforcement.evidenceRef !== null &&
    !(typeof enforcement.evidenceRef === 'string' && /^https?:\/\/\S+/.test(enforcement.evidenceRef))) {
  fail('GitHub enforcement evidenceRef must be null or an absolute http(s) URL');
}
const assets = policy.assetSubmission ?? {};
for (const key of ['provenanceRecordRequired', 'authorOrRightsHolderRequired', 'licenceOrPermissionRequired',
  'aiGeneratedAssetsMustBeReviewed', 'thirdPartyTrademarksProhibitedWithoutWrittenPermission',
  'personalDataProhibited', 'licensedCatalogueDataProhibitedInPrototype']) {
  if (assets[key] !== true) fail(`asset submission policy requires ${key}`);
}

const license = read('LICENSE');
requireText(license, 'Apache License', 'LICENSE');
requireText(license, 'Version 2.0, January 2004', 'LICENSE');
requireText(license, 'END OF TERMS AND CONDITIONS', 'LICENSE');
const notice = read('NOTICE');
requireText(notice, 'Copyright 2026 Vintora', 'NOTICE');
requireText(notice, 'No trademark, service mark', 'NOTICE');
requireText(notice, '10M+ SKUs by 2034 is an unmeasured target', 'NOTICE');

const contributing = read('CONTRIBUTING.md');
for (const needle of [
  'Signed-off-by:',
  'distinct reviewer',
  'npm run ci:verify',
  'npm run claims:check',
  'will be rejected',
  'secret-free',
]) {
  requireText(contributing, needle, 'CONTRIBUTING.md');
}
requireText(read('CODE_OF_CONDUCT.md'), '## Reporting', 'CODE_OF_CONDUCT.md');
const assetsDoc = read('ASSET_PROVENANCE.md');
for (const needle of ['author or rights holder', 'licence or written permission', 'AI tooling was used', 'Prohibited in this prototype']) {
  requireText(assetsDoc, needle, 'ASSET_PROVENANCE.md');
}

if (securityReporting.status !== 'prototype-security-reporting-process' || securityReporting.prototypeMode !== true ||
    securityReporting.publicIssuesForVulnerabilities !== false) {
  fail('security reporting policy must require private disclosure in prototype state');
}
if (securityReporting.acknowledgementSlaBusinessDays !== 5 || securityReporting.triageSlaBusinessDays !== 5 ||
    securityReporting.coordinatedDisclosureDefaultDays !== 90) {
  fail('security reporting SLA contract has drifted');
}
if (!String(securityReporting.privateChannels ?? []).includes('GitHub Security Advisories private vulnerability reporting') ||
    !(securityReporting.privateChannels ?? []).some((channel) => String(channel).includes('security@vintora.invalid'))) {
  fail('security reporting must define private advisory and placeholder mailbox paths');
}
const security = read('SECURITY.md');
for (const needle of [
  'GitHub Security Advisories private vulnerability reporting',
  'security@vintora.invalid',
  'reserved placeholder',
  'config/security-reporting.json',
  'Signed-release caveat',
  'not executed in this local workspace',
  'GitHub branch protection is enabled on `main`',
]) {
  requireText(security, needle, 'SECURITY.md');
}
requireText(read('config/security-reporting.json'), 'Trivy container and IaC scans', 'config/security-reporting.json');

const readme = read('README.md');
for (const link of ['[`LICENSE`](./LICENSE)', '[`CONTRIBUTING.md`](./CONTRIBUTING.md)',
  '[`ASSET_PROVENANCE.md`](./ASSET_PROVENANCE.md)', '[`SECURITY.md`](./SECURITY.md)']) {
  requireText(readme, link, 'README.md');
}
requireText(read('package.json'), '"license": "Apache-2.0"', 'package.json');
if (!existsSync(join(ROOT, '.github', 'workflows', 'ci-security.yml'))) fail('ci-security.yml is missing');
if (!existsSync(join(ROOT, '.github', 'workflows', 'ci-supply-chain.yml'))) fail('ci-supply-chain.yml is missing');

if (errors.length) {
  console.error(`Repository policy check failed: ${errors.length} finding(s).`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}
console.log('Repository policy check passed: Apache-2.0 with trademark/data reservations, DCO and rejection rules.');
console.log('Asset provenance and private security reporting paths are present; hosted repository settings are enabled with documented limits.');
console.log('This gate is policy parity only; it is not legal advice or repository-setting evidence.');
