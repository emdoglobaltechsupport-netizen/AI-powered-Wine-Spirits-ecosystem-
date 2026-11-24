#!/usr/bin/env node
/**
 * Static status dashboard and release-gate gate.
 *
 * Verifies the Phase 1 status register, health command contract, release
 * stages and null external evidence references. It is not a status page,
 * hosted CI result or promotion approval.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(ROOT, path), 'utf8');
const dashboard = JSON.parse(read('config/status-dashboard.json'));
const gates = JSON.parse(read('config/release-gates.json'));
const pkg = JSON.parse(read('package.json'));
const errors = [];
const fail = (message) => errors.push(message);
const requireText = (haystack, needle, label) => {
  if (!haystack.includes(needle)) fail(`${label} must contain ${JSON.stringify(needle)}`);
};
const runRefs = (value) => [...String(value ?? '').matchAll(/npm run ([a-zA-Z0-9:_-]+)/g)].map((match) => match[1]);
const checkScripts = (value, label) => {
  for (const script of runRefs(value)) {
    if (!pkg.scripts?.[script]) fail(`${label}: missing package script ${script}`);
  }
};

if (dashboard.status !== 'prototype-status-dashboard' || dashboard.prototypeMode !== true || dashboard.publicLaunch !== false ||
    dashboard.verdict !== 'NO-GO' || dashboard.scope !== 'Phase 1 gates only') {
  fail('status dashboard must remain a NO-GO Phase 1 register');
}
for (const field of ['databaseCommand', 'apiCommand', 'endpoint', 'contractDoc']) {
  if (!dashboard.health?.[field]) fail(`health contract field missing: ${field}`);
}
checkScripts(`${dashboard.health.databaseCommand} ${dashboard.health.apiCommand} npm run health:check`, 'status health contract');
if (dashboard.health.endpoint !== 'GET /health' || dashboard.health.externalStatusPage !== null) {
  fail('health endpoint or external status page boundary has drifted');
}
if (!existsSync(join(ROOT, dashboard.health.contractDoc))) fail('health contract document is missing');
if (!pkg.scripts?.['health:check']) fail('package.json must expose health:check');
if (!Array.isArray(dashboard.checks) || dashboard.checks.length < 6) fail('status dashboard must register at least six checks');
for (const check of dashboard.checks ?? []) {
  if (!check.id || !check.label || !check.command) fail('status check id, label and command are required');
  if (check.evidenceRef !== null && typeof check.evidenceRef !== 'string') fail(`${check.id}: evidenceRef must be null or a string evidence reference`);
  if (typeof check.evidenceRef === 'string' && !/^https?:\/\/\S+/.test(check.evidenceRef)) fail(`${check.id}: evidenceRef must be an absolute http(s) URL`);
  checkScripts(check.command, check.id);
}
for (const field of ['sloPipelineImplemented', 'errorBudgetMeasured', 'hostedCiResultAttached', 'p95P99ByRouteAttached']) {
  if (typeof dashboard.measurement?.[field] !== 'boolean') fail(`measurement field must be boolean: ${field}`);
}
if (dashboard.measurement.sloPipelineImplemented !== false || dashboard.measurement.errorBudgetMeasured !== false || dashboard.measurement.p95P99ByRouteAttached !== false) {
  fail('SLO/error-budget/p95p99 measurements must remain false until externally evidenced');
}
const attachedDashboardRefs = (dashboard.checks ?? []).filter((check) => check.evidenceRef !== null).length;
if (dashboard.measurement.hostedCiResultAttached !== (attachedDashboardRefs > 0)) {
  fail('hostedCiResultAttached must reflect whether hosted CI evidence refs are attached');
}
if (!Array.isArray(dashboard.evidenceGaps) || dashboard.evidenceGaps.length < 3) fail('status dashboard evidence gaps are required');
for (const source of dashboard.sources ?? []) {
  if (!existsSync(join(ROOT, source))) fail(`missing status source: ${source}`);
}

if (gates.status !== 'prototype-release-gates' || gates.prototypeMode !== true || gates.publicLaunch !== false ||
    gates.verdict !== 'NO-GO' || gates.promotionAllowed !== false) {
  fail('release gates must remain NO-GO with promotionAllowed false');
}
if (!Array.isArray(gates.stages) || gates.stages.length < 6) fail('release gate stages are incomplete');
for (const stage of gates.stages ?? []) {
  if (!stage.id || !stage.label || stage.required !== true) fail(`release stage requires id, label and required=true: ${stage.id}`);
  for (const command of stage.commands ?? []) checkScripts(command, stage.id);
  for (const ref of stage.workflowRefs ?? []) {
    if (!existsSync(join(ROOT, ref))) fail(`${stage.id}: missing workflow ${ref}`);
  }
  if (stage.hostedEvidenceRef !== null && typeof stage.hostedEvidenceRef !== 'string') fail(`${stage.id}: hostedEvidenceRef must be null or a string evidence reference`);
  if (typeof stage.hostedEvidenceRef === 'string' && !/^https?:\/\/\S+/.test(stage.hostedEvidenceRef)) fail(`${stage.id}: hostedEvidenceRef must be an absolute http(s) URL`);
}
if (!Array.isArray(gates.blockingRules) || gates.blockingRules.length < 3) fail('release blocking rules are incomplete');
if (!Array.isArray(gates.evidenceGaps) || gates.evidenceGaps.length < 2) fail('release evidence gaps are required');

const statusDoc = read('STATUS_DASHBOARD.md');
for (const heading of ['## 1. Overall status', '## 2. Check register', '## 3. Health checks',
  '## 4. Measurement boundary', '## 5. Review']) {
  requireText(statusDoc, heading, 'STATUS_DASHBOARD.md');
}
for (const marker of ['config/status-dashboard.json', 'npm run status:check', 'not a running status page',
  'NO-GO', 'npm run health:check', 'p95/p99']) {
  requireText(statusDoc, marker, 'STATUS_DASHBOARD.md');
}
for (const check of dashboard.checks ?? []) {
  if (check.evidenceRef && !statusDoc.includes(check.evidenceRef)) fail(`STATUS_DASHBOARD.md must reference ${check.id} evidence`);
}
for (const check of dashboard.checks ?? []) requireText(statusDoc, check.id, 'STATUS_DASHBOARD.md');

const releaseDoc = read('RELEASE_GATES.md');
for (const heading of ['## 1. Gate stages', '## 2. Blocking rules', '## 3. Workflow definitions', '## 4. Evidence gaps']) {
  requireText(releaseDoc, heading, 'RELEASE_GATES.md');
}
for (const marker of ['config/release-gates.json', 'npm run status:check', '`promotionAllowed` remains false',
  'documentation-only change', 'ci-governance.yml']) {
  requireText(releaseDoc, marker, 'RELEASE_GATES.md');
}
for (const stage of gates.stages ?? []) {
  if (stage.hostedEvidenceRef && !releaseDoc.includes(stage.hostedEvidenceRef)) fail(`RELEASE_GATES.md must reference ${stage.id} hosted evidence`);
}
for (const stage of gates.stages ?? []) requireText(releaseDoc, `\`${stage.id}\``, 'RELEASE_GATES.md');
for (const workflow of (gates.stages ?? []).flatMap((stage) => stage.workflowRefs ?? [])) {
  requireText(releaseDoc, workflow.split('/').pop(), 'RELEASE_GATES.md');
}

if (errors.length) {
  console.error(`Status and release-gate check failed: ${errors.length} finding(s).`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}
console.log(`Status and release-gate check passed: ${dashboard.checks.length} dashboard checks, ${gates.stages.length} release stages.`);
const attachedStageRefs = (gates.stages ?? []).filter((stage) => stage.hostedEvidenceRef !== null).length;
console.log(`Hosted evidence refs attached: ${attachedStageRefs}/${gates.stages.length} stages; promotionAllowed remains false and verdict remains NO-GO.`);
