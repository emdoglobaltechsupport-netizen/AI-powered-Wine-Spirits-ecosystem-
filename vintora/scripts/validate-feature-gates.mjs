#!/usr/bin/env node
/**
 * Validate the high-risk feature activation register.
 *
 * The prototype must contain no activated high-risk feature. Any non-blocked
 * record must carry distinct legal and compliance sign-offs, complete evidence
 * references and satisfied activation gates.
 */
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FILE = join(ROOT, 'config', 'high-risk-features.json');
const CONFIG_SOURCE = join(ROOT, 'services', 'api', 'src', 'config.ts');

const EXPECTED_IDS = [
  'live-payments',
  'age-kyc',
  'alcohol-fulfilment',
  'tax',
  'ad-spend-marketing-automation',
  'ai-publishing',
  'vault-custody',
  'africa-country-activation',
  'privacy-sensitive-data-processing',
  'refunds-disputes',
  'pricing-promotions',
  'ai-agent-autonomy',
  'ai-personalization-consent',
  'ai-marketing-human-release',
];

let doc;
try {
  doc = JSON.parse(readFileSync(FILE, 'utf8'));
} catch (error) {
  console.error(`Cannot read ${FILE}: ${error.message}`);
  process.exit(1);
}

const errors = [];
const seen = new Set();

const policy = doc?.policy ?? {};
if (policy.productionStartupDisabled !== true) {
  errors.push('policy.productionStartupDisabled must be true');
}
if (policy.criticalExceptionsAllowed !== false) {
  errors.push('policy.criticalExceptionsAllowed must be false');
}
if (policy.emergencyExceptionMaxHours !== 72) {
  errors.push('policy.emergencyExceptionMaxHours must be 72');
}
if (!Array.isArray(policy.approvalRoles) || !['Legal', 'Compliance'].every((r) => policy.approvalRoles.includes(r))) {
  errors.push('policy.approvalRoles must include Legal and Compliance');
}
if (!Array.isArray(policy.signoffFields) || policy.signoffFields.length < 10) {
  errors.push('policy.signoffFields must enumerate the full sign-off record');
}
const workflowStates = new Set(Array.isArray(policy.workflowStates) ? policy.workflowStates : []);
for (const state of ['blocked', 'draft', 'evidence', 'legal_review', 'compliance_review', 'approved', 'activated', 'monitored', 'denied', 'expired']) {
  if (!workflowStates.has(state)) errors.push(`policy.workflowStates is missing ${state}`);
}

// Cross-check the runtime production guard without importing the API.
try {
  const source = readFileSync(CONFIG_SOURCE, 'utf8');
  if (!source.includes('Production startup is disabled')) {
    errors.push('API production startup guard was removed from services/api/src/config.ts');
  }
} catch (error) {
  errors.push(`cannot verify production startup guard: ${error.message}`);
}

if (!Array.isArray(doc?.features)) {
  errors.push('features must be an array');
} else {
  for (const [index, feature] of doc.features.entries()) {
    const label = typeof feature?.id === 'string' ? feature.id : `feature[${index}]`;
    if (!feature || typeof feature !== 'object' || Array.isArray(feature)) {
      errors.push(`${label}: record must be an object`);
      continue;
    }
    if (seen.has(feature.id)) errors.push(`${label}: duplicate id`);
    seen.add(feature.id);

    for (const field of ['id', 'name', 'risk', 'status', 'owner']) {
      if (typeof feature[field] !== 'string' || !feature[field].trim()) {
        errors.push(`${label}: ${field} must be a non-empty string`);
      }
    }
    if (!workflowStates.has(feature.status)) {
      errors.push(`${label}: unsupported status "${feature.status}"`);
    }
    if (!Array.isArray(feature.activationGates) || feature.activationGates.length === 0) {
      errors.push(`${label}: activationGates must be a non-empty array`);
    } else {
      for (const [gateIndex, gate] of feature.activationGates.entries()) {
        if (typeof gate?.id !== 'string' || !gate.id.trim()) {
          errors.push(`${label}: activationGates[${gateIndex}].id is required`);
        }
        if (typeof gate?.satisfied !== 'boolean') {
          errors.push(`${label}: activationGates[${gateIndex}].satisfied must be boolean`);
        }
        if (gate?.satisfied && !(typeof gate.evidenceRef === 'string' && gate.evidenceRef.trim())) {
          errors.push(`${label}: satisfied gate ${gate.id} requires evidenceRef`);
        }
      }
    }

    if (feature.status === 'blocked') {
      if (feature.legalSignoff !== null || feature.complianceSignoff !== null) {
        errors.push(`${label}: blocked features must not carry sign-offs`);
      }
      if (feature.activationGates.some((gate) => gate.satisfied === true)) {
        errors.push(`${label}: blocked features must not have satisfied gates`);
      }
      continue;
    }

    if (['denied', 'expired'].includes(feature.status)) {
      continue;
    }

    const legal = feature.legalSignoff;
    const compliance = feature.complianceSignoff;
    if (!legal || !compliance || typeof legal !== 'object' || typeof compliance !== 'object') {
      errors.push(`${label}: non-blocked feature requires legalSignoff and complianceSignoff objects`);
      continue;
    }

    for (const [roleName, signoff] of [['legal', legal], ['compliance', compliance]]) {
      for (const field of policy.signoffFields) {
        if (!Object.hasOwn(signoff, field) || (typeof signoff[field] === 'string' && !signoff[field].trim())) {
          errors.push(`${label}: ${roleName} signoff is missing ${field}`);
        }
      }
    }

    const identities = [feature.owner, legal.approverName, compliance.approverName]
      .map((value) => String(value ?? '').trim().toLowerCase());
    if (new Set(identities).size !== identities.length) {
      errors.push(`${label}: owner, legal approver and compliance approver must be distinct people`);
    }
    if (String(legal.approverRole).toLowerCase() !== 'legal' || String(compliance.approverRole).toLowerCase() !== 'compliance') {
      errors.push(`${label}: approver roles must be Legal and Compliance respectively`);
    }
    if (signoffDecisionIsApproved(legal) && signoffDecisionIsApproved(compliance)) {
      if (feature.activationGates.some((gate) => !gate.satisfied)) {
        errors.push(`${label}: all activation gates must be satisfied before activation`);
      }
      const expiry = Date.parse(String(compliance.expiryReviewDate ?? ''));
      if (!Number.isFinite(expiry) || expiry <= Date.now()) {
        errors.push(`${label}: expiryReviewDate must be a future date`);
      }
    }
  }

  for (const id of EXPECTED_IDS) {
    if (!seen.has(id)) errors.push(`missing high-risk feature record: ${id}`);
  }
}

function signoffDecisionIsApproved(signoff) {
  return String(signoff?.decision ?? '').toLowerCase() === 'approved';
}

if (errors.length) {
  for (const error of errors) console.error(`BLOCKER: ${error}`);
  process.exit(1);
}
console.log(`Feature gate check passed: ${doc.features.length} high-risk features registered, all blocked and unsigned.`);
