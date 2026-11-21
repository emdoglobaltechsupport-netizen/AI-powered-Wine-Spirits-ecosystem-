#!/usr/bin/env node
/**
 * Deterministic npm licence scanner.
 *
 * - Offline and platform-neutral; uses only Node built-ins.
 * - Source of truth: package-lock.json plus config/license-policy.json.
 * - Workspace packages are first-party and excluded. Dev and optional npm
 *   packages are included because they are still part of the retained SBOM.
 * - Denied licences always block. Review-required and unknown licences block
 *   unless an explicit, current approval in config/license-policy.json matches
 *   both the licence and the package name pattern.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const LOCK_FILE = join(ROOT, 'package-lock.json');
const POLICY_FILE = join(ROOT, 'config', 'license-policy.json');

function fail(message) {
  console.error(message);
  process.exit(1);
}

function readJson(file) {
  if (!existsSync(file)) fail(`Missing required file: ${file}`);
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    fail(`Could not parse ${file}: ${error.message}`);
  }
}

function normalizeLicense(value) {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (Array.isArray(value)) {
    const parts = value.map(normalizeLicense).filter(Boolean);
    return parts.length ? `(${parts.join(' OR ')})` : null;
  }
  if (value && typeof value === 'object' && typeof value.type === 'string' && value.type.trim()) {
    return value.type.trim();
  }
  return null;
}

function packageName(lockPath, entry) {
  if (entry.name) return entry.name;
  const segment = lockPath.startsWith('node_modules/') ? lockPath.slice('node_modules/'.length) : lockPath;
  return segment.split('/node_modules/').pop() || segment;
}

function splitAlternatives(expression) {
  return expression
    .split(/\s+OR\s+/i)
    .map((alternative) => alternative.replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function splitTokens(alternative) {
  return alternative
    .split(/\s+(?:AND|WITH)\s+/i)
    .map((token) => token.replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function wildcardToRegExp(pattern) {
  const escaped = String(pattern).replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp(`^${escaped}$`);
}

function buildPolicyIndex(policy) {
  const canonical = new Map();
  for (const listName of ['allowedLicenses', 'reviewRequiredLicenses', 'deniedLicenses']) {
    for (const license of policy[listName] || []) {
      canonical.set(String(license).toLowerCase(), String(license));
    }
  }
  return canonical;
}

function classify(expression, policy, canonical) {
  const allowed = new Set((policy.allowedLicenses || []).map((item) => String(item)));
  const review = new Set((policy.reviewRequiredLicenses || []).map((item) => String(item)));
  const denied = new Set((policy.deniedLicenses || []).map((item) => String(item)));

  const alternatives = splitAlternatives(expression).map((alternative) => {
    const tokens = splitTokens(alternative).map((token) => canonical.get(token.toLowerCase()) || token);
    const deniedTokens = tokens.filter((token) => denied.has(token));
    const reviewTokens = tokens.filter((token) => !denied.has(token) && (review.has(token) || !allowed.has(token)));
    const status = deniedTokens.length ? 'denied' : (reviewTokens.length ? 'review' : 'allowed');
    return { status, tokens: [...deniedTokens, ...reviewTokens] };
  });

  if (alternatives.every((alternative) => alternative.status === 'allowed')) {
    return { status: 'allowed', tokens: [], reason: null };
  }
  const deniedTokens = alternatives.filter((alternative) => alternative.status === 'denied');
  if (deniedTokens.length) {
    return {
      status: 'denied',
      tokens: [...new Set(deniedTokens.flatMap((alternative) => alternative.tokens))],
      reason: 'denied licence appears in the SPDX expression',
    };
  }
  if (alternatives.some((alternative) => alternative.status === 'allowed')) {
    return {
      status: 'review',
      tokens: [...new Set(alternatives.flatMap((alternative) => alternative.tokens))],
      reason: 'mixed SPDX expression includes a review-required alternative',
    };
  }
  return {
    status: 'review',
    tokens: [...new Set(alternatives.flatMap((alternative) => alternative.tokens))],
    reason: 'review-required or unknown licence',
  };
}

function findApproval(policy, packageNameValue, license) {
  return (policy.approvals || []).find((approval) => {
    const licenses = (approval.licenses || []).map(String);
    const packages = (approval.packages || []).map(String);
    return licenses.includes(license) && packages.some((pattern) => wildcardToRegExp(pattern).test(packageNameValue));
  });
}

function validateApprovals(policy) {
  const blockers = [];
  const ids = new Set();
  for (const approval of policy.approvals || []) {
    if (!approval.id || ids.has(approval.id)) blockers.push(`approval needs a unique id: ${approval.id || '<missing>'}`);
    ids.add(approval.id);
    for (const field of ['licenses', 'packages', 'owner', 'reviewed', 'reason', 'conditions']) {
      if (!approval[field] || (Array.isArray(approval[field]) && !approval[field].length)) {
        blockers.push(`approval ${approval.id || '<missing>'} is missing ${field}`);
      }
    }
  }
  return blockers;
}

const lock = readJson(LOCK_FILE);
const policy = readJson(POLICY_FILE);
const blockers = validateApprovals(policy);
const canonical = buildPolicyIndex(policy);
const seen = new Set();
const stats = { allowed: 0, approved: 0, blocked: 0 };
const appliedApprovals = new Map();
const approvalUses = new Map();

if (policy.policy?.requireLicense !== true || policy.policy?.unknownLicenseRequiresApproval !== true) {
  blockers.push('policy.requireLicense and policy.unknownLicenseRequiresApproval must both be true');
}

for (const [lockPath, entry] of Object.entries(lock.packages || {})) {
  if (!lockPath.startsWith('node_modules/') || entry.link) continue;

  const name = packageName(lockPath, entry);
  const version = entry.version || '0.0.0';
  const key = `${name}@${version}`;
  if (seen.has(key)) continue;
  seen.add(key);

  const license = normalizeLicense(entry.license || entry.licenses) || 'NOASSERTION';
  const decision = classify(license, policy, canonical);

  if (decision.status === 'allowed') {
    stats.allowed += 1;
    continue;
  }

  if (decision.status === 'denied') {
    stats.blocked += 1;
    blockers.push(`${key}: denied licence ${decision.tokens.join(', ')} (${license})`);
    continue;
  }

  for (const token of decision.tokens) {
    const approval = findApproval(policy, name, token);
    if (!approval) {
      stats.blocked += 1;
      blockers.push(`${key}: ${token} requires an approval record (${license})`);
      continue;
    }
    appliedApprovals.set(approval.id, approval);
    approvalUses.set(approval.id, (approvalUses.get(approval.id) || 0) + 1);
  }
  if (decision.tokens.every((token) => findApproval(policy, name, token))) stats.approved += 1;
}

if (blockers.length) {
  console.error(`Licence scan FAILED: ${blockers.length} blocker(s).`);
  for (const blocker of blockers.slice(0, 40)) console.error(`  ${blocker}`);
  if (blockers.length > 40) console.error(`  ... and ${blockers.length - 40} more`);
  console.error('Update config/license-policy.json only after a named owner reviews the licence.');
  process.exit(1);
}

console.log(
  `Licence scan passed: ${seen.size} third-party package(s) checked ` +
  `(${stats.allowed} allowed, ${stats.approved} approved review-required, ${stats.blocked} blocked).`,
);
for (const [id, uses] of [...approvalUses.entries()].sort()) {
  const approval = appliedApprovals.get(id);
  console.log(`  ${id}: ${uses} package(s), owner ${approval.owner}, reviewed ${approval.reviewed}`);
}
