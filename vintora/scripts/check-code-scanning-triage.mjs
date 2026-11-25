#!/usr/bin/env node
/**
 * Code-scanning triage consistency gate.
 *
 * Verifies the historical baseline, the recorded base-image/code remediation,
 * the explicit no-critical-exception rule and the Phase 1 NO-GO boundary.
 * It does not contact GitHub or run Trivy/CodeQL; hosted closure needs a
 * separately recorded rescan.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(ROOT, path), 'utf8');
const triage = JSON.parse(read('security/code-scanning-triage.json'));
const policy = JSON.parse(read('config/artifact-policy.json'));
const dockerfile = read('Dockerfile');
const errors = [];
const fail = (message) => errors.push(message);
const requireText = (haystack, needle, label) => {
  if (!haystack.includes(needle)) fail(`${label} must contain ${JSON.stringify(needle)}`);
};
const isoDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value ?? ''));
const sum = (values) => Object.values(values ?? {}).reduce((total, value) => total + Number(value), 0);

if (triage.status !== 'prototype-code-scanning-triage' || triage.prototypeMode !== true ||
    triage.publicLaunch !== false || triage.promotionAllowed !== false || triage.verdict !== 'NO-GO' ||
    triage.ownerRole !== 'Platform Security' || triage.criticalExceptionsAllowed !== false) {
  fail('triage register must remain a remediated NO-GO prototype record that forbids critical exceptions');
}
if (!isoDate(triage.triageDate) || !isoDate(triage.remediationDate)) {
  fail('triageDate and remediationDate must be ISO dates');
}

const baseline = triage.baseline ?? {};
if (sum(baseline.byTool) !== baseline.hostedOpenAlerts) {
  fail('baseline byTool counts must sum to hostedOpenAlerts');
}
if (sum(baseline.bySeverity) !== baseline.hostedOpenAlerts) {
  fail('baseline bySeverity counts must sum to hostedOpenAlerts');
}
if (sum(baseline.byCategory) !== baseline.hostedOpenAlerts) {
  fail('baseline byCategory counts must sum to hostedOpenAlerts');
}
if (sum(baseline.codeqlRules) !== (baseline.byTool?.CodeQL ?? -1)) {
  fail('baseline CodeQL rule counts must sum to the CodeQL tool count');
}
if (baseline.hostedOpenAlerts !== 143 || baseline.byTool?.CodeQL !== 38 || baseline.byTool?.Trivy !== 105 ||
    baseline.bySeverity?.critical !== 5 || baseline.bySeverity?.high !== 73 ||
    baseline.bySeverity?.medium !== 49 || baseline.bySeverity?.low !== 11 || baseline.bySeverity?.unscored !== 5) {
  fail('historical code-scanning baseline drifted from the triaged values');
}
if ((baseline.criticalImageAdvisories ?? []).length !== baseline.bySeverity?.critical) {
  fail('every baseline critical image advisory must be listed individually');
}
for (const advisory of baseline.criticalImageAdvisories ?? []) {
  if (!advisory.id || !advisory.package) fail('critical image advisories require an id and package');
}

const remediation = triage.remediation ?? {};
if (!isoDate(remediation.verifiedOn ?? triage.remediationDate)) {
  fail('remediation date must be an ISO date');
}
const image = remediation.baseImage ?? {};
if (image.from !== 'node:20-bookworm-slim@sha256:2cf067cfed83d5ea958367df9f966191a942351a2df77d6f0193e162b5febfc0' ||
    image.to !== 'node:24-trixie-slim@sha256:4d00acb4bcc42c454c4eb801526f7ad7f772ea3bd4fd168c5cc2e384abcbb9d4') {
  fail('base-image remediation must record the Node 20 Bookworm to Node 24 Trixie upgrade');
}
const [imageName, imageDigest] = String(image.to).split('@');
if (policy.images?.[imageName] !== imageDigest || !dockerfile.includes(`FROM ${image.to}`)) {
  fail('remediated base image must match Dockerfile and config/artifact-policy.json');
}
if (!dockerfile.includes('HEALTHCHECK')) {
  fail('Dockerfile must retain the container HEALTHCHECK added by this remediation');
}
if ((remediation.localTrivyScan?.critical ?? -1) !== 0) {
  fail('local Trivy scan of the remediated base image must record zero critical findings');
}
for (const path of ['Dockerfile', 'services/api/src/index.ts', 'scripts/with-env.mjs', 'scripts/serve-prototype.mjs']) {
  if (!(remediation.codeChanges ?? []).some((change) => change.file === path && change.change)) {
    fail(`remediation must record the code change in ${path}`);
  }
}

const decisions = new Set(['accepted-prototype-control', 'mitigated-prototype-risk', 'false-positive-mitigated', 'remediated']);
const dispositionSum = (remediation.dispositions ?? []).reduce((total, item) => total + Number(item.count), 0);
if (dispositionSum !== (baseline.byTool?.CodeQL ?? -1)) {
  fail('CodeQL dispositions must account for every baseline CodeQL alert');
}
for (const item of remediation.dispositions ?? []) {
  if (!baseline.codeqlRules?.[item.rule]) fail(`unknown CodeQL rule in dispositions: ${item.rule}`);
  if (baseline.codeqlRules?.[item.rule] !== item.count) {
    fail(`disposition count for ${item.rule} must match the baseline rule count`);
  }
  if (!decisions.has(item.decision) || !item.owner || !item.rationale || !item.followUp) {
    fail(`disposition for ${item.rule} requires decision, owner, rationale and followUp`);
  }
}
for (const rule of Object.keys(baseline.codeqlRules ?? {})) {
  if (!(remediation.dispositions ?? []).some((item) => item.rule === rule)) {
    fail(`missing disposition for CodeQL rule ${rule}`);
  }
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
  if (sum(hosted.bySeverity ?? {}) !== (hosted.hostedOpenAlerts ?? -1)) {
    fail('verified hosted severity counts must sum to hostedOpenAlerts');
  }
  if ((hosted.bySeverity?.critical ?? -1) !== 0) {
    fail('verified hosted verification cannot record open critical findings');
  }
}

for (const rule of triage.blockingRules ?? []) {
  if (/critical.*except|exception.*critical/i.test(rule) && /\ballowed\b/i.test(rule)) {
    fail('blocking rules must never allow a critical exception');
  }
}
for (const ref of ['SECURITY.md', 'DEPENDENCY_MANAGEMENT.md', 'security/code-scanning-triage.json']) {
  if (!existsSync(join(ROOT, ref))) fail(`missing triage reference: ${ref}`);
}
for (const doc of ['SECURITY.md', 'DEPENDENCY_MANAGEMENT.md']) {
  requireText(read(doc), 'security/code-scanning-triage.json', doc);
  requireText(read(doc), 'NO-GO', doc);
}

if (errors.length) {
  console.error(`Code-scanning triage check failed: ${errors.length} finding(s).`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}
console.log(`Code-scanning triage check passed: baseline ${baseline.hostedOpenAlerts} alerts, ${baseline.bySeverity?.critical} critical, CodeQL ${baseline.byTool?.CodeQL}.`);
console.log(`Hosted verification: ${hosted.status}; promotionAllowed remains false and verdict remains NO-GO.`);
