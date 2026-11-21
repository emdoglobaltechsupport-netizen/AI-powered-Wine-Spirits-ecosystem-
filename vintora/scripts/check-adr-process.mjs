#!/usr/bin/env node
/**
 * Architecture decision record gate.
 *
 * Verifies the repository-wide ADR index, registry, template and required
 * sections. It proves document structure only; it is not an architecture
 * review, approval record or launch clearance.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(ROOT, path), 'utf8');
const policy = JSON.parse(read('config/adr-process.json'));
const errors = [];
const fail = (message) => errors.push(message);
const requireText = (haystack, needle, label) => {
  if (!haystack.includes(needle)) fail(`${label} must contain ${JSON.stringify(needle)}`);
};

if (policy.status !== 'prototype-adr-process' || policy.prototypeMode !== true || policy.publicLaunch !== false) {
  fail('ADR policy must remain a prototype process with no public launch');
}
for (const status of ['Accepted for prototype scope', 'Proposed', 'Blocked', 'Superseded', 'Rejected']) {
  if (!policy.statuses?.includes(status)) fail(`ADR status vocabulary is missing ${status}`);
}
for (const section of ['## Status', '## Context', '## Decision', '## Consequences', '## Alternatives considered',
  '## Compliance/guardrail implications', '## Verification/evidence', '## Review triggers']) {
  if (!policy.requiredSections?.includes(section)) fail(`required section missing from policy: ${section}`);
}
if (policy.review?.distinctApproverRequired !== true || !/^\d{4}-\d{2}-\d{2}$/.test(policy.review?.lastReviewed ?? '')) {
  fail('ADR review must require a distinct approver and dated review');
}
if (!Array.isArray(policy.registry) || policy.registry.length < 6) fail('ADR registry must contain at least six decisions');

const index = read('adr/README.md');
const template = read('adr/TEMPLATE.md');
const processDoc = read('ADR_PROCESS.md');
for (let i = 0; i < (policy.registry ?? []).length; i += 1) {
  const record = policy.registry[i];
  const expectedId = `ADR-${String(i + 1).padStart(4, '0')}`;
  if (record.id !== expectedId) fail(`ADR registry id ${record.id} should be ${expectedId}`);
  if (!existsSync(join(ROOT, record.file))) {
    fail(`${record.file}: ADR file is missing`);
    continue;
  }
  if (!policy.statuses.includes(record.status)) fail(`${record.id}: unknown status ${record.status}`);
  const source = read(record.file);
  for (const section of policy.requiredSections) requireText(source, section, record.file);
  requireText(source, 'Prototype mode — no real orders are placed', record.file);
  requireText(source, 'NO-GO', record.file);
  requireText(index, record.id, 'adr/README.md');
}
for (const section of policy.requiredSections) requireText(template, section, 'adr/TEMPLATE.md');
for (const heading of ['## 1. Scope and authority', '## 2. Status vocabulary', '## 3. Workflow', '## 4. Guardrails', '## 5. Evidence gaps']) {
  requireText(processDoc, heading, 'ADR_PROCESS.md');
}
for (const label of ['Superseded', 'Rejected']) requireText(index, label, 'adr/README.md');
requireText(index, '../ADR_PROCESS.md', 'adr/README.md');
requireText(index, 'TEMPLATE.md', 'adr/README.md');
for (const ref of policy.requiredFileRefs ?? []) {
  if (!existsSync(join(ROOT, ref))) fail(`missing ADR reference: ${ref}`);
}

if (errors.length) {
  console.error(`ADR process check failed: ${errors.length} finding(s).`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}
console.log(`ADR process check passed: ${policy.registry.length} indexed decisions, template and required sections present.`);
console.log('All ADRs remain prototype-scope; no architecture approval or hosted review is implied.');
