#!/usr/bin/env node
/**
 * Dependabot triage consistency gate.
 *
 * Verifies the static triage register's internal counts and Phase 1 boundary.
 * It does not contact GitHub or assert that advisories are remediated.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(ROOT, path), 'utf8');
const triage = JSON.parse(read('security/dependabot-triage.json'));
const errors = [];
const fail = (message) => errors.push(message);
const requireText = (haystack, needle, label) => {
  if (!haystack.includes(needle)) fail(`${label} must contain ${JSON.stringify(needle)}`);
};
const isoDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value ?? ''));

if (triage.status !== 'prototype-dependabot-triage' || triage.prototypeMode !== true ||
    triage.publicLaunch !== false || triage.verdict !== 'NO-GO' || triage.ownerRole !== 'Platform Security') {
  fail('triage register must remain a NO-GO prototype record owned by Platform Security');
}
if (!isoDate(triage.triageDate)) fail('triageDate must be an ISO date');

const counts = triage.counts ?? {};
const hostedSeveritySum = (counts.hostedCritical ?? 0) + (counts.hostedHigh ?? 0) + (counts.hostedMedium ?? 0);
if (hostedSeveritySum !== counts.hostedOpenAlerts) {
  fail('hosted severity counts must sum to hostedOpenAlerts');
}
const npmSeveritySum = (counts.npmCriticalPackages ?? 0) + (counts.npmHighPackages ?? 0) + (counts.npmModeratePackages ?? 0);
if (npmSeveritySum !== counts.npmVulnerablePackages) {
  fail('npm package severity counts must sum to npmVulnerablePackages');
}
if (counts.hostedOpenAlerts !== 39 || counts.hostedCritical !== 1 || counts.hostedHigh !== 28 || counts.hostedMedium !== 10) {
  fail('hosted Dependabot counts drifted from the triaged baseline; re-triage before changing them');
}
if (counts.npmVulnerablePackages !== 22 || counts.npmCriticalPackages !== 1 ||
    counts.npmHighPackages !== 8 || counts.npmModeratePackages !== 13) {
  fail('npm audit package counts drifted from the triaged baseline; re-triage before changing them');
}
if (counts.productionScopedCritical !== 0 || counts.productionScopedHigh !== 1 || counts.productionScopedPackages !== 1) {
  fail('production gate must show one high zod record and no critical record');
}

const groups = triage.groups ?? [];
const production = groups.find((group) => group.id === 'production-gate');
const nonProduction = groups.find((group) => group.id === 'non-production-shared-lockfile');
if (!production || !nonProduction) {
  fail('production-gate and non-production-shared-lockfile groups are required');
} else {
  if ((production.hostedAlertCount ?? 0) + (nonProduction.hostedAlertCount ?? 0) !== counts.hostedOpenAlerts) {
    fail('group hosted alert counts must sum to hostedOpenAlerts');
  }
  const packageSum = Object.values(nonProduction.hostedAlertPackages ?? {}).reduce((sum, value) => sum + value, 0);
  if (packageSum !== nonProduction.hostedAlertCount) {
    fail('non-production package alert counts must sum to the group alert count');
  }
  if ((production.packages ?? []).join(',') !== 'zod') {
    fail('production group must contain only zod');
  }
  if (!isoDate(production.expires) || production.expires <= triage.triageDate) {
    fail('production exception expiry must be an ISO date after triageDate');
  }
  if (!production.exceptionRef || !production.remediation) {
    fail('production group requires an exception reference and remediation plan');
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
}

if (errors.length) {
  console.error(`Dependabot triage check failed: ${errors.length} finding(s).`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}
console.log(`Dependabot triage check passed: ${counts.hostedOpenAlerts} hosted alerts (1 critical, 28 high, 10 medium), 1 scoped production exception.`);
console.log('Phase 1 gate parity only; hosted alerts and shell advisories remain unresolved.');
