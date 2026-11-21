#!/usr/bin/env node
/**
 * Evidence index gate.
 *
 * Verifies that evidence registers and definition links resolve, and that
 * external result references remain explicit nulls until actual evidence is
 * attached. This is a link/gap check, not an audit result.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(ROOT, path), 'utf8');
const policy = JSON.parse(read('config/evidence-index.json'));
const errors = [];
const fail = (message) => errors.push(message);
const requireText = (haystack, needle, label) => {
  if (!haystack.includes(needle)) fail(`${label} must contain ${JSON.stringify(needle)}`);
};

if (policy.status !== 'prototype-evidence-index' || policy.prototypeMode !== true || policy.publicLaunch !== false) {
  fail('evidence index must remain a prototype register with no public launch');
}
for (const category of ['tests', 'performance', 'threatModels', 'complianceReviews']) {
  if (!policy.categories?.includes(category)) fail(`evidence category missing: ${category}`);
}
if (policy.categories?.length !== 4) fail('evidence index must declare exactly four categories');
if (!Array.isArray(policy.entries) || policy.entries.length < 5) fail('evidence index must contain at least five entries');
const ids = new Set();
for (const entry of policy.entries ?? []) {
  if (!entry.id || ids.has(entry.id)) fail(`duplicate or missing evidence id: ${entry.id}`);
  ids.add(entry.id);
  if (!policy.categories.includes(entry.category)) fail(`${entry.id}: unknown category ${entry.category}`);
  if (!existsSync(join(ROOT, entry.registerRef ?? ''))) fail(`${entry.id}: missing register ${entry.registerRef}`);
  for (const ref of entry.definitionRefs ?? []) {
    if (!existsSync(join(ROOT, ref))) fail(`${entry.id}: missing definition ${ref}`);
  }
  if (entry.resultRef !== null) fail(`${entry.id}: resultRef must be null until external evidence is attached`);
  if (!entry.status || !entry.ownerRole) fail(`${entry.id}: status and owner role are required`);
}
for (const category of policy.categories) {
  if (!(policy.entries ?? []).some((entry) => entry.category === category)) fail(`no evidence entry for ${category}`);
}

const doc = read('EVIDENCE_INDEX.md');
for (const heading of ['## 1. Tests', '## 2. Performance', '## 3. Threat models', '## 4. Compliance reviews', '## 5. Review']) {
  requireText(doc, heading, 'EVIDENCE_INDEX.md');
}
requireText(doc, 'config/evidence-index.json', 'EVIDENCE_INDEX.md');
for (const marker of ['`null`', 'not externally audited', 'Targets, not measurements', 'Design threat model only', 'Blocked register only']) {
  requireText(doc, marker, 'EVIDENCE_INDEX.md');
}
for (const gap of policy.evidenceGaps ?? []) {
  if (!doc.includes('penetration test') && gap.includes('penetration test')) fail('EVIDENCE_INDEX.md must state the penetration-test gap');
}

if (errors.length) {
  console.error(`Evidence index check failed: ${errors.length} finding(s).`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}
console.log(`Evidence index check passed: ${policy.entries.length} entries across ${policy.categories.length} categories.`);
console.log('All definition links resolve and every external result reference is an explicit null evidence gap.');
