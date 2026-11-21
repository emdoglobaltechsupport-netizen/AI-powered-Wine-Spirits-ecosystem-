#!/usr/bin/env node
/**
 * Claims change-management gate.
 *
 * Verifies the machine-readable approval requirements for financial, safety
 * and regulatory claim changes. It records required controls; it is not a
 * signed approval log or evidence that a claim is true.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(ROOT, path), 'utf8');
const policy = JSON.parse(read('config/claims-change-management.json'));
const pkg = JSON.parse(read('package.json'));
const errors = [];
const fail = (message) => errors.push(message);
const requireText = (haystack, needle, label) => {
  if (!haystack.includes(needle)) fail(`${label} must contain ${JSON.stringify(needle)}`);
};
const isoDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value ?? ''));

if (policy.status !== 'prototype-claims-change-management' || policy.prototypeMode !== true || policy.publicLaunch !== false) {
  fail('claims change management must remain a prototype process with no public launch');
}
if (policy.processDoc !== 'CLAIMS_CHANGE_MANAGEMENT.md' || policy.canonGovernanceRef !== 'CANON_GOVERNANCE.md') {
  fail('claims change management document references have drifted');
}
if (policy.changeRecordPrefix !== 'CCR-2026-') fail('change record prefix must be CCR-2026-');
for (const field of ['id', 'date', 'category', 'claim', 'priorValue', 'newValue', 'sourceRef', 'ownerRole',
  'approverRole', 'evidenceRef', 'reviewDate', 'decision']) {
  if (!policy.requiredFields?.includes(field)) fail(`required change-record field missing: ${field}`);
}
if (policy.selfApprovalAllowed !== false || policy.distinctApproverRequired !== true) {
  fail('claim changes require a distinct approver and prohibit self-approval');
}
for (const category of ['financial', 'safety', 'regulatory']) {
  const rule = policy.categories?.[category];
  if (!rule) {
    fail(`missing claim category: ${category}`);
    continue;
  }
  if (!rule.ownerRole || !rule.approverRole) fail(`${category}: owner and approver roles are required`);
  if (rule.ownerRole === rule.approverRole) fail(`${category}: owner and approver roles must be distinct`);
  if (rule.evidenceRef !== null) fail(`${category}: evidenceRef must remain null until evidence is attached`);
  if (!Array.isArray(rule.rules) || rule.rules.length < 2) fail(`${category}: substantive change rules are required`);
}
if (!Array.isArray(policy.requiredChecks) || policy.requiredChecks.length < 6) fail('required checks list is incomplete');
for (const script of policy.requiredChecks ?? []) {
  if (!pkg.scripts?.[script]) fail(`required claims check script is missing: ${script}`);
}
if (policy.review?.cadence !== 'every financial, safety or regulatory claim change and quarterly' || !isoDate(policy.review?.lastReviewed)) {
  fail('claims review cadence and dated last review are required');
}
if (!Array.isArray(policy.changeLog)) fail('changeLog must be an array');
for (const [index, entry] of (policy.changeLog ?? []).entries()) {
  for (const field of policy.requiredFields) {
    if (!(field in entry)) fail(`changeLog[${index}]: missing ${field}`);
  }
  if (!String(entry.id ?? '').startsWith(policy.changeRecordPrefix)) fail(`changeLog[${index}]: invalid change id`);
  if (!isoDate(entry.date) || !isoDate(entry.reviewDate)) fail(`changeLog[${index}]: ISO dates are required`);
  if (entry.ownerRole === entry.approverRole) fail(`changeLog[${index}]: self-approval is not permitted`);
  if (!entry.decision) fail(`changeLog[${index}]: decision is required`);
}
if (!Array.isArray(policy.evidenceGaps) || policy.evidenceGaps.length < 2) fail('explicit evidence gaps are required');

for (const ref of ['CLAIMS_CHANGE_MANAGEMENT.md', 'CANON_GOVERNANCE.md', 'INVESTOR_DOCUMENTATION.md', 'REGULATORY_DOCUMENTATION.md']) {
  if (!existsSync(join(ROOT, ref))) fail(`missing claims reference: ${ref}`);
}
const doc = read('CLAIMS_CHANGE_MANAGEMENT.md');
for (const heading of ['## 1. Scope', '## 2. Approval matrix', '## 3. Required change record',
  '## 4. Required checks', '## 5. Retention of decision records', '## 6. Evidence gaps']) {
  requireText(doc, heading, 'CLAIMS_CHANGE_MANAGEMENT.md');
}
for (const marker of ['config/claims-change-management.json', 'CCR-2026-NNN', 'not a signed approval log',
  'Self-approval is not permitted', 'No populated change record', 'npm run claims:check']) {
  requireText(doc, marker, 'CLAIMS_CHANGE_MANAGEMENT.md');
}
for (const match of doc.matchAll(/\[[^\]]*\]\((\.\.?\/[^)]+)\)/g)) {
  const target = match[1].split('#')[0];
  if (!existsSync(join(ROOT, target))) fail(`CLAIMS_CHANGE_MANAGEMENT.md link does not resolve: ${match[1]}`);
}

if (errors.length) {
  console.error(`Claims change-management check failed: ${errors.length} finding(s).`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}
console.log(`Claims change-management check passed: ${Object.keys(policy.categories).length} categories, ${policy.changeLog.length} populated change records.`);
console.log('Distinct approval, required checks and null evidence references are present; no approval is implied.');
