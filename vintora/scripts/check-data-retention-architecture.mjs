#!/usr/bin/env node
/**
 * Data retention architecture gate.
 *
 * Verifies that the design-state retention register mirrors the data inventory
 * and lifecycle workflow contract. It does not implement or evidence retention,
 * deletion, crypto-shredding or legal-hold behaviour.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(ROOT, path), 'utf8');
const policy = JSON.parse(read('config/data-retention-architecture.json'));
const governance = JSON.parse(read('config/data-governance-policy.json'));
const errors = [];
const fail = (message) => errors.push(message);
const requireText = (haystack, needle, label) => {
  if (!haystack.includes(needle)) fail(`${label} must contain ${JSON.stringify(needle)}`);
};

if (policy.status !== 'prototype-data-retention-architecture' || policy.prototypeMode !== true || policy.publicLaunch !== false) {
  fail('retention architecture must remain a prototype design register');
}
if (policy.sourceOfTruth !== 'config/data-governance-policy.json#dataInventory') {
  fail('retention architecture source of truth has drifted');
}
for (const ref of policy.architectureRefs ?? []) {
  if (!existsSync(join(ROOT, ref))) fail(`missing retention architecture reference: ${ref}`);
}
if (!Array.isArray(policy.principles) || policy.principles.length < 5) fail('retention principles are incomplete');
requireText(policy.principles?.join(' ') ?? '', 'Legal hold pauses deletion', 'retention principles');
requireText(policy.principles?.join(' ') ?? '', 'Retention expiry is a deny signal', 'retention principles');

const inventory = governance.dataInventory ?? [];
if (!Array.isArray(policy.classes) || policy.classes.length !== inventory.length) {
  fail(`retention class count must mirror all ${inventory.length} inventory classes`);
}
const byId = new Map((policy.classes ?? []).map((entry) => [entry.id, entry]));
for (const item of inventory) {
  const entry = byId.get(item.id);
  if (!entry) {
    fail(`missing retention class: ${item.id}`);
    continue;
  }
  if (entry.retentionDays !== item.retentionDays) fail(`${item.id}: retentionDays differs from inventory`);
  if (!entry.deletionBehaviour) fail(`${item.id}: deletion behaviour is required`);
  if (!['design_only', 'not_collected'].includes(entry.enforcement)) fail(`${item.id}: unknown enforcement state`);
  if (item.retentionDays === 0 && entry.enforcement !== 'not_collected') fail(`${item.id}: zero-retention data must be not_collected`);
  if (item.retentionDays > 0 && entry.enforcement !== 'design_only') fail(`${item.id}: collection data must be design_only in prototype`);
}
if (new Set((policy.classes ?? []).map((entry) => entry.id)).size !== (policy.classes ?? []).length) {
  fail('retention class ids must be unique');
}

const contracts = governance.lifecycleWorkflows ?? {};
for (const [name, fields] of Object.entries({
  export: ['endpoint', 'implemented', 'slaDays'],
  deletion: ['endpoint', 'implemented', 'slaDays'],
  optOut: ['endpoint', 'implemented'],
  revocation: ['endpoint', 'implemented', 'propagationWindowHours'],
})) {
  for (const field of fields) {
    if (policy.workflows?.[name]?.[field] !== contracts[name]?.[field]) {
      fail(`${name}.${field} differs from data governance lifecycle contract`);
    }
  }
}
const enforcement = policy.enforcement ?? {};
if (enforcement.retentionJobImplemented !== false || enforcement.cryptoShreddingImplemented !== false ||
    enforcement.externalAuditSink !== null || enforcement.legalHoldModel !== governance.retentionSchedule?.legalHoldModel) {
  fail('retention enforcement must remain unimplemented with a null audit sink');
}
if (!Array.isArray(policy.evidenceGaps) || policy.evidenceGaps.length < 3) fail('retention evidence gaps are required');

const doc = read('DATA_RETENTION_ARCHITECTURE.md');
for (const heading of ['## 1. Architecture principles', '## 2. Class schedule', '## 3. Workflows',
  '## 4. Enforcement boundary', '## 5. Evidence gaps']) {
  requireText(doc, heading, 'DATA_RETENTION_ARCHITECTURE.md');
}
for (const marker of ['config/data-retention-architecture.json', 'npm run retention:check', '18 inventory classes',
  '2,190', '2,555', 'not collected', 'No scheduled retention job']) {
  requireText(doc, marker, 'DATA_RETENTION_ARCHITECTURE.md');
}
for (const ref of ['03-technical-architecture.md', '04-database-design.md', 'DATA_GOVERNANCE.md', 'REGULATORY_DOCUMENTATION.md']) {
  if (!existsSync(join(ROOT, ref))) fail(`missing retention document reference: ${ref}`);
}

if (errors.length) {
  console.error(`Data retention architecture check failed: ${errors.length} finding(s).`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}
console.log(`Data retention architecture check passed: ${policy.classes.length} classes and ${Object.keys(policy.workflows).length} workflows mapped.`);
console.log('Retention, deletion, legal hold and crypto-shredding remain design-only with no production evidence.');
