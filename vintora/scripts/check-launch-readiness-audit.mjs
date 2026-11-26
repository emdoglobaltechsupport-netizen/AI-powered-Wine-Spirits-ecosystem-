#!/usr/bin/env node
/**
 * Launch-readiness audit gate.
 *
 * Confirms that the readiness audit remains a NO-GO planning artifact: every
 * gap is open, owned and still lacks attached evidence; the three-phase
 * timeline is unexecuted; and no milestone, document or green Phase 1 check
 * can be read as launch approval. It audits the register, not the controls.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(ROOT, path), 'utf8');
const audit = JSON.parse(read('config/launch-readiness-audit.json'));
const pkg = JSON.parse(read('package.json'));
const release = JSON.parse(read('config/release-gates.json'));
const manifest = JSON.parse(read('config/launch-manifest.json'));
const doc = read('LAUNCH_READINESS_AUDIT.md');
const errors = [];
const fail = (message) => errors.push(message);
const requireText = (haystack, needle, label) => {
  if (!haystack.includes(needle)) fail(`${label} must contain ${JSON.stringify(needle)}`);
};
const isoDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value ?? ''));

if (audit.status !== 'prototype-no-go-audit' || audit.prototypeMode !== true ||
    audit.publicLaunch !== false || audit.verdict !== 'NO-GO' ||
    audit.promotionAllowed !== false || audit.scope !== 'Phase 1 gates only') {
  fail('readiness audit must stay a Phase 1-only NO-GO register with no public launch or promotion');
}
if (audit.launchApproval !== null || !isoDate(audit.auditedOn)) {
  fail('readiness audit must record no launch approval and a valid audit date');
}
if (!existsSync(join(ROOT, audit.processDoc ?? ''))) fail(`missing audit process document: ${audit.processDoc}`);
for (const ref of audit.authorityRefs ?? []) {
  if (!existsSync(join(ROOT, ref))) fail(`missing audit authority reference: ${ref}`);
}
if (!pkg.scripts?.['launch-readiness-audit:check']) fail('package.json must expose launch-readiness-audit:check');
if (release.verdict !== 'NO-GO' || release.promotionAllowed !== false) {
  fail('release gates must keep the NO-GO verdict and promotion disabled');
}
if (manifest.publicLaunch !== false || manifest.legalApprover !== null || manifest.complianceApprover !== null) {
  fail('launch manifest must remain unsigned and non-public');
}

const categories = ['security', 'compliance', 'privacy-data', 'reliability-capacity', 'operations-dr', 'governance-release', 'ai-agents', 'commerce-finance'];
const phases = ['pre-launch', 'launch-week', 'post-launch'];
if (!Array.isArray(audit.gaps) || audit.gaps.length < 20) fail('readiness audit must register at least 20 launch gaps');
const gapIds = new Set();
const gapOwners = new Set();
for (const gap of audit.gaps ?? []) {
  if (!/^LR-\d{2}$/.test(gap.id ?? '') || gapIds.has(gap.id)) fail(`duplicate or malformed gap id: ${gap.id}`);
  gapIds.add(gap.id);
  if (!categories.includes(gap.category)) fail(`${gap.id}: unknown gap category ${gap.category}`);
  if (typeof gap.title !== 'string' || gap.title.length < 8) fail(`${gap.id}: gap title is required`);
  if (typeof gap.ownerRole !== 'string' || gap.ownerRole.length < 3) fail(`${gap.id}: accountable owner role is required`);
  gapOwners.add(gap.ownerRole);
  if (typeof gap.acceptanceEvidence !== 'string' || gap.acceptanceEvidence.length < 12) {
    fail(`${gap.id}: acceptance evidence is required`);
  }
  if (gap.evidenceRef !== null) fail(`${gap.id}: gap evidenceRef must remain null`);
  if (!['open', 'blocked'].includes(gap.status)) fail(`${gap.id}: gap status must be open or blocked`);
  if (gap.blocking !== true) fail(`${gap.id}: a launch-readiness gap must block promotion`);
  if (!phases.includes(gap.phase)) fail(`${gap.id}: gap phase must be one of the three audit phases`);
}

if (!Array.isArray(audit.responsibilities) || audit.responsibilities.length < 6) {
  fail('readiness audit must assign at least six accountable roles');
}
const responsibilityOwners = new Set();
for (const item of audit.responsibilities ?? []) {
  if (typeof item.ownerRole !== 'string' || responsibilityOwners.has(item.ownerRole)) {
    fail(`duplicate or missing responsibility owner: ${item.ownerRole}`);
  }
  responsibilityOwners.add(item.ownerRole);
  if (!Array.isArray(item.accountabilities) || item.accountabilities.length < 2) {
    fail(`${item.ownerRole}: at least two accountabilities are required`);
  }
}
for (const owner of gapOwners) {
  if (!responsibilityOwners.has(owner)) fail(`gap owner ${owner} has no responsibility assignment`);
}

if (audit.timeline?.basis !== 'relative-planning-targets-no-launch-date') {
  fail('timeline basis must state that no launch date is set');
}
const phaseIds = (audit.timeline?.phases ?? []).map((phase) => phase.id);
if (phaseIds.join(',') !== phases.join(',')) fail('timeline must contain exactly pre-launch, launch-week and post-launch phases');
const milestoneIds = new Set();
let milestoneCount = 0;
for (const phase of audit.timeline?.phases ?? []) {
  if (!Array.isArray(phase.entryCriteria) || phase.entryCriteria.length < 1) fail(`${phase.id}: entry criteria required`);
  if (phase.evidenceRef !== null) fail(`${phase.id}: phase evidenceRef must remain null`);
  if (phase.status !== 'planned') fail(`${phase.id}: phase status must remain planned`);
  if (!Array.isArray(phase.milestones) || phase.milestones.length < 2) fail(`${phase.id}: at least two milestones required`);
  for (const milestone of phase.milestones ?? []) {
    if (!/^M-(PL|LW|PO)-\d{2}$/.test(milestone.id ?? '') || milestoneIds.has(milestone.id)) {
      fail(`duplicate or malformed milestone id: ${milestone.id}`);
    }
    milestoneIds.add(milestone.id);
    milestoneCount += 1;
    if (typeof milestone.title !== 'string' || milestone.title.length < 8) fail(`${milestone.id}: title required`);
    if (!responsibilityOwners.has(milestone.ownerRole)) fail(`${milestone.id}: owner must be an assigned responsibility role`);
    if (typeof milestone.exitCriteria !== 'string' || milestone.exitCriteria.length < 12) {
      fail(`${milestone.id}: exit criteria required`);
    }
    if (milestone.evidenceRef !== null || milestone.status !== 'planned') {
      fail(`${milestone.id}: milestone must stay planned with a null evidence ref`);
    }
    if (!Array.isArray(milestone.dependsOn)) fail(`${milestone.id}: dependencies must be a list`);
    for (const dependency of milestone.dependsOn) {
      if (!gapIds.has(dependency) && !milestoneIds.has(dependency)) {
        fail(`${milestone.id}: unknown dependency ${dependency}`);
      }
    }
  }
}

for (const needle of [
  '# Vintora Launch Readiness Audit',
  'Prototype mode — no real orders are placed',
  'NO-GO',
  'config/launch-readiness-audit.json',
  '## 1. Audit result',
  '## 2. Gap register',
  '## 3. Responsibilities',
  '## 4. Timeline',
  '### Pre-launch',
  '### Launch week',
  '### Post-launch',
  '## 5. Boundary',
  `${audit.gaps.length} open gaps`,
  `${milestoneCount} planned milestones`,
]) {
  requireText(doc, needle, 'LAUNCH_READINESS_AUDIT.md');
}
for (const gap of audit.gaps ?? []) requireText(doc, gap.id, 'LAUNCH_READINESS_AUDIT.md');
for (const milestoneId of milestoneIds) requireText(doc, milestoneId, 'LAUNCH_READINESS_AUDIT.md');
for (const owner of responsibilityOwners) requireText(doc, owner, 'LAUNCH_READINESS_AUDIT.md');

if (errors.length) {
  console.error(`Launch readiness audit check failed: ${errors.length} finding(s).`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}
console.log(`Launch readiness audit check passed: ${audit.gaps.length} open gaps, ${responsibilityOwners.size} accountable roles, ${milestoneCount} planned milestones across 3 phases.`);
console.log('No launch date is set; all evidence refs remain null, promotionAllowed stays false and the verdict stays NO-GO.');
console.log('This gate audits the register only; it does not close a gap or grant launch approval.');
