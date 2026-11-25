#!/usr/bin/env node
/**
 * Dependabot triage consistency gate.
 *
 * Verifies the historical triage baseline, the recorded local remediation and
 * the Phase 1 NO-GO boundary. It does not contact GitHub or independently run
 * npm audit; hosted alert closure needs a separately recorded rescan.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(ROOT, path), 'utf8');
const triage = JSON.parse(read('security/dependabot-triage.json'));
const exceptions = JSON.parse(read('security/audit-exceptions.json'));
const errors = [];
const fail = (message) => errors.push(message);
const requireText = (haystack, needle, label) => {
  if (!haystack.includes(needle)) fail(`${label} must contain ${JSON.stringify(needle)}`);
};
const isoDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value ?? ''));

if (triage.status !== 'prototype-dependency-remediation' || triage.prototypeMode !== true ||
    triage.publicLaunch !== false || triage.verdict !== 'NO-GO' || triage.ownerRole !== 'Platform Security') {
  fail('triage register must remain a remediated NO-GO prototype record owned by Platform Security');
}
if (!isoDate(triage.triageDate) || !isoDate(triage.remediationDate)) {
  fail('triageDate and remediationDate must be ISO dates');
}

const baseline = triage.baseline ?? {};
const hostedSeveritySum = (baseline.hostedCritical ?? 0) + (baseline.hostedHigh ?? 0) + (baseline.hostedMedium ?? 0);
if (hostedSeveritySum !== baseline.hostedOpenAlerts) {
  fail('baseline hosted severity counts must sum to baseline hostedOpenAlerts');
}
const npmSeveritySum = (baseline.npmCriticalPackages ?? 0) + (baseline.npmHighPackages ?? 0) + (baseline.npmModeratePackages ?? 0);
if (npmSeveritySum !== baseline.npmVulnerablePackages) {
  fail('baseline npm package severity counts must sum to baseline npmVulnerablePackages');
}
if (baseline.hostedOpenAlerts !== 39 || baseline.hostedCritical !== 1 || baseline.hostedHigh !== 28 || baseline.hostedMedium !== 10) {
  fail('historical hosted alert baseline drifted from the triaged values');
}
if (baseline.npmVulnerablePackages !== 22 || baseline.npmCriticalPackages !== 1 ||
    baseline.npmHighPackages !== 8 || baseline.npmModeratePackages !== 13) {
  fail('historical npm audit baseline drifted from the triaged values');
}
if (baseline.productionScopedCritical !== 0 || baseline.productionScopedHigh !== 1 || baseline.productionScopedPackages !== 1) {
  fail('historical production gate must show one high zod record and no critical record');
}

const remediation = triage.remediation ?? {};
if (!isoDate(remediation.verifiedOn)) fail('remediation.verifiedOn must be an ISO date');
const full = remediation.localFullAudit ?? {};
const scoped = remediation.localScopedAudit ?? {};
if ((full.npmCriticalPackages ?? 0) + (full.npmHighPackages ?? 0) + (full.npmModeratePackages ?? 0) !== (full.npmVulnerablePackages ?? -1) ||
    full.npmVulnerablePackages !== 0 || full.npmCriticalPackages !== 0 || full.npmHighPackages !== 0 || full.npmModeratePackages !== 0) {
  fail('local full audit remediation must record zero vulnerable packages');
}
if ((scoped.productionScopedCritical ?? 0) + (scoped.productionScopedHigh ?? 0) !== (scoped.productionScopedPackages ?? -1) ||
    scoped.productionScopedPackages !== 0 || scoped.productionScopedCritical !== 0 || scoped.productionScopedHigh !== 0) {
  fail('local scoped audit remediation must record zero production packages');
}
if (exceptions.exceptions?.length !== 0) {
  fail('remediated Zod exception must be removed from security/audit-exceptions.json');
}

const hosted = remediation.hostedVerification ?? {};
if (!['pending-rescan', 'verified'].includes(hosted.status)) {
  fail('remediation.hostedVerification.status must be pending-rescan or verified');
}
if (hosted.status === 'pending-rescan' && hosted.evidenceRef !== null) {
  fail('pending hosted verification must have a null evidenceRef');
}
if (hosted.status === 'verified') {
  if (typeof hosted.evidenceRef !== 'string' || !hosted.evidenceRef.startsWith('https://github.com/')) {
    fail('verified hosted verification requires a GitHub evidence URL');
  }
  if ((hosted.hostedCritical ?? 0) + (hosted.hostedHigh ?? 0) + (hosted.hostedMedium ?? 0) !== (hosted.hostedOpenAlerts ?? -1)) {
    fail('verified hosted severity counts must sum to hostedOpenAlerts');
  }
}

const upgradeVersions = new Map((remediation.upgrades ?? []).map((item) => [item.package, item.to]));
for (const [name, version] of [['zod', '4.6.7'], ['next', '16.4.6'], ['expo', '58.0.26'], ['react-native', '0.88.1']]) {
  if (upgradeVersions.get(name) !== version) fail(`${name} remediation must record ${version}`);
}
const minimatchOverride = (remediation.overrides ?? []).find((item) => item.parent === '@expo/fingerprint' && item.package === 'minimatch');
if (minimatchOverride?.to !== '11.0.9') {
  fail('remediation must record the @expo/fingerprint minimatch 11.0.9 override');
}

const groups = triage.groups ?? [];
const production = groups.find((group) => group.id === 'production-gate');
const nonProduction = groups.find((group) => group.id === 'non-production-shared-lockfile');
if (!production || !nonProduction) {
  fail('production-gate and non-production-shared-lockfile groups are required');
} else {
  if ((production.baselineHostedAlertCount ?? 0) + (nonProduction.baselineHostedAlertCount ?? 0) !== baseline.hostedOpenAlerts) {
    fail('group baseline hosted alert counts must sum to baseline hostedOpenAlerts');
  }
  const packageSum = Object.values(nonProduction.baselineHostedAlertPackages ?? {}).reduce((sum, value) => sum + value, 0);
  if (packageSum !== nonProduction.baselineHostedAlertCount) {
    fail('non-production baseline package alert counts must sum to the group alert count');
  }
  if ((production.packages ?? []).join(',') !== 'zod') {
    fail('production group must contain only zod');
  }
  if (production.status !== 'remediated-locally' || nonProduction.status !== 'remediated-locally') {
    fail('both triage groups must record local remediation');
  }
  if (!isoDate(production.baselineExpires) || production.baselineExpires <= triage.triageDate) {
    fail('baseline exception expiry must be an ISO date after triageDate');
  }
  if (!production.baselineExceptionRef || !production.remediation) {
    fail('production group requires a baseline exception reference and remediation record');
  }
  for (const rule of triage.blockingRules ?? []) {
    if (/critical.*except|exception.*critical/i.test(rule) && /\ballowed\b/i.test(rule)) {
      fail('blocking rules must never allow a critical exception');
    }
  }
}

for (const ref of ['SECURITY.md', 'DEPENDENCY_MANAGEMENT.md', 'security/audit-exceptions.json', 'security/dependabot-triage.json']) {
  if (!existsSync(join(ROOT, ref))) fail(`missing triage reference: ${ref}`);
}
for (const doc of ['SECURITY.md', 'DEPENDENCY_MANAGEMENT.md']) {
  requireText(read(doc), 'security/dependabot-triage.json', doc);
  requireText(read(doc), 'NO-GO', doc);
  requireText(read(doc), 'zod@4.6.7', doc);
}

if (errors.length) {
  console.error(`Dependabot triage check failed: ${errors.length} finding(s).`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}
console.log(`Dependabot triage check passed: baseline ${baseline.hostedOpenAlerts} hosted alerts, local audit 0 vulnerabilities.`);
console.log(`Hosted verification: ${hosted.status}; promotionAllowed remains false and verdict remains NO-GO.`);
