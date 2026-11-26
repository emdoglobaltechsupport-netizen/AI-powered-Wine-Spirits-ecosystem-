#!/usr/bin/env node
/**
 * Named-owner and four-eyes acceptance gate.
 *
 * In prototype mode the record is expected to be pending: all names, dates,
 * sign-off refs and review fields are null. The checker fails on any partial
 * population and rejects a claimed acceptance unless every owner is named,
 * effective-dated and signed off by a distinct reviewer. Acceptance records
 * ownership only; it cannot close a gap, promote the milestone or grant launch
 * approval.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(ROOT, path), 'utf8');
const record = JSON.parse(read('config/launch-readiness-owners.json'));
const audit = JSON.parse(read('config/launch-readiness-audit.json'));
const pkg = JSON.parse(read('package.json'));
const doc = read('LAUNCH_READINESS_AUDIT.md');
const errors = [];
const fail = (message) => errors.push(message);
const requireText = (haystack, needle, label) => {
  if (!haystack.includes(needle)) fail(`${label} must contain ${JSON.stringify(needle)}`);
};
const isoDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value ?? ''));
const hasText = (value) => typeof value === 'string' && value.trim().length >= 3;
const validRef = (value) => typeof value === 'string' &&
  (/^https?:\/\/\S+$/.test(value) || existsSync(join(ROOT, value)));

if (record.status !== 'prototype-ownership-record-pending' || record.prototypeMode !== true ||
    record.publicLaunch !== false || record.verdict !== 'NO-GO' ||
    record.promotionAllowed !== false || record.launchApproval !== null ||
    !isoDate(record.auditedOn)) {
  fail('ownership record must stay a pending NO-GO prototype artifact with no launch approval');
}
if (typeof record.accepted !== 'boolean' || record.accepted !== record.auditBaselineAccepted) {
  fail('accepted and auditBaselineAccepted must agree');
}
if (!existsSync(join(ROOT, record.processDoc ?? ''))) fail(`missing process document: ${record.processDoc}`);
if (!existsSync(join(ROOT, 'LAUNCH_READINESS_OWNERS_INTAKE.md'))) fail('missing blank ownership intake template');
if (!pkg.scripts?.['launch-readiness-owners:check']) fail('package.json must expose launch-readiness-owners:check');
if (audit.verdict !== 'NO-GO' || audit.publicLaunch !== false ||
    audit.promotionAllowed !== false || audit.launchApproval !== null) {
  fail('readiness audit must keep NO-GO, no public launch and no approval');
}
if ((audit.gaps ?? []).some((gap) => gap.evidenceRef !== null)) {
  fail('readiness audit gap evidence refs must remain null');
}
const milestone = (audit.timeline?.phases ?? [])
  .flatMap((phase) => phase.milestones ?? [])
  .find((item) => item.id === record.milestoneId);
if (!milestone || milestone.status !== 'planned' || milestone.evidenceRef !== null) {
  fail('M-PL-01 must stay planned with a null evidence reference');
}

const auditRoles = new Set((audit.responsibilities ?? []).map((item) => item.ownerRole));
const recordRoles = new Set();
for (const owner of record.owners ?? []) {
  if (!hasText(owner.role) || recordRoles.has(owner.role)) fail(`duplicate or missing owner role: ${owner.role}`);
  recordRoles.add(owner.role);
  if (!auditRoles.has(owner.role)) fail(`${owner.role}: owner role is not assigned in the readiness audit`);
  if (!['pending', 'accepted'].includes(owner.status)) fail(`${owner.role}: owner status must be pending or accepted`);
  const populated = [owner.namedIndividual, owner.effectiveDate, owner.signoffRef]
    .filter((value) => value !== null).length;
  if (populated > 0 && populated < 3) fail(`${owner.role}: owner fields must be all null or fully populated`);
  if (owner.namedIndividual !== null && !hasText(owner.namedIndividual)) fail(`${owner.role}: named individual is required`);
  if (owner.effectiveDate !== null && !isoDate(owner.effectiveDate)) fail(`${owner.role}: ISO effective date is required`);
  if (owner.signoffRef !== null && !validRef(owner.signoffRef)) fail(`${owner.role}: sign-off reference must resolve`);
  if (owner.status === 'accepted' && populated !== 3) fail(`${owner.role}: accepted owner must be named, dated and signed`);
  if (owner.status === 'pending' && populated !== 0) fail(`${owner.role}: pending owner must keep every field null`);
}
for (const role of auditRoles) {
  if (!recordRoles.has(role)) fail(`readiness audit owner role ${role} has no ownership record`);
}

const review = record.review ?? {};
const reviewFields = [
  'namedIndividual',
  'effectiveDate',
  'distinctReviewerIndividual',
  'distinctReviewerEffectiveDate',
  'acceptanceRef',
  'reviewedAt',
];
const populatedReview = reviewFields.filter((field) => review[field] !== null).length;
if (populatedReview > 0 && populatedReview !== reviewFields.length) {
  fail('review fields must be all null or fully populated');
}
if (record.accepted) {
  if (populatedReview !== reviewFields.length) fail('accepted record requires a complete four-eyes review');
  if (!hasText(review.namedIndividual) || !isoDate(review.effectiveDate)) {
    fail('accepted record requires a named release owner with an ISO effective date');
  }
  if (!hasText(review.distinctReviewerIndividual) || !isoDate(review.distinctReviewerEffectiveDate)) {
    fail('accepted record requires a named distinct reviewer with an ISO effective date');
  }
  if (!validRef(review.acceptanceRef) || !isoDate(review.reviewedAt)) {
    fail('accepted record requires a resolving acceptance reference and an ISO review date');
  }
  if (String(review.namedIndividual).trim().toLowerCase() ===
      String(review.distinctReviewerIndividual).trim().toLowerCase()) {
    fail('release owner and distinct reviewer must be different named individuals');
  }
  const releaseOwner = (record.owners ?? []).find((owner) => owner.role === review.ownerRole);
  const reviewerOwner = (record.owners ?? []).find((owner) => owner.role === review.distinctReviewerRole);
  if (!releaseOwner || releaseOwner.status !== 'accepted' ||
      releaseOwner.namedIndividual !== review.namedIndividual) {
    fail('release owner must be an accepted owner with the same named individual');
  }
  if (!reviewerOwner || reviewerOwner.status !== 'accepted' ||
      reviewerOwner.namedIndividual !== review.distinctReviewerIndividual) {
    fail('distinct reviewer must be an accepted owner with the same named individual');
  }
} else {
  if (populatedReview !== 0) fail('pending record must keep every review field null');
  if (record.auditBaselineAccepted !== false) fail('pending record must not accept the audit baseline');
  if ((record.owners ?? []).some((owner) => owner.status !== 'pending')) {
    fail('pending record must keep every owner status pending');
  }
}

for (const needle of [
  '## 6. Named ownership acceptance',
  'config/launch-readiness-owners.json',
  'LAUNCH_READINESS_OWNERS_INTAKE.md',
  'M-PL-01',
  'pending',
  'not launch approval',
]) {
  requireText(doc, needle, 'LAUNCH_READINESS_AUDIT.md');
}
for (const role of recordRoles) requireText(doc, role, 'LAUNCH_READINESS_AUDIT.md');

if (errors.length) {
  console.error(`Named-owner acceptance check failed: ${errors.length} finding(s).`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}
if (record.accepted) {
  console.log(`Named-owner acceptance check passed: ${recordRoles.size} named owners and a distinct reviewer recorded for M-PL-01.`);
  console.log('Acceptance records ownership only; the milestone stays planned, all gap refs remain null and promotion stays blocked.');
} else {
  console.log(`Named-owner acceptance check passed: ${recordRoles.size} role records pending, 0 named owners.`);
  console.log('No four-eyes acceptance is recorded; M-PL-01 stays planned, the verdict remains NO-GO and no gap is closed.');
}
console.log('This gate is not launch approval.');
