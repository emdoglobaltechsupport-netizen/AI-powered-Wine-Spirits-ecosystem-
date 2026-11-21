#!/usr/bin/env node
/**
 * Immutable-artifact policy check.
 *
 * Verifies that every container base image in Dockerfile/docker-compose.yml is
 * pinned to the digest declared in config/artifact-policy.json, and that every
 * GitHub Action is pinned to a 40-character commit SHA. Version tags are kept
 * as trailing comments for Dependabot and human readability.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const POLICY_FILE = join(ROOT, 'config', 'artifact-policy.json');
const DOCKERFILE = join(ROOT, 'Dockerfile');
const COMPOSE_FILE = join(ROOT, 'docker-compose.yml');
const WORKFLOW_DIR = join(ROOT, '.github', 'workflows');

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

const policy = readJson(POLICY_FILE);
const blockers = [];
const checkedImages = new Set();
const checkedActions = new Set();

if (policy.policy?.requireImageDigests !== true) blockers.push('policy.requireImageDigests must be true');
if (policy.policy?.requirePinnedActions !== true) blockers.push('policy.requirePinnedActions must be true');
if (policy.policy?.requireSignatures !== true) blockers.push('policy.requireSignatures must be true');
if (policy.policy?.requireChecksums !== true) blockers.push('policy.requireChecksums must be true');
if (policy.policy?.promotion !== 'digest-only') blockers.push('policy.promotion must be "digest-only"');
if (!(Number(policy.policy?.retainEvidenceDays) >= 365)) blockers.push('policy.retainEvidenceDays must be at least 365');

for (const required of ['sbom/vintora.cdx.json', 'dist/SHA256SUMS', 'dist/SHA256SUMS.sig', 'dist/sbom.sig']) {
  if (!(policy.evidence || []).includes(required)) blockers.push(`evidence list is missing ${required}`);
}

function checkImageReference(reference, source, lineNumber) {
  const [name, suppliedDigest] = reference.split('@');
  const expectedDigest = (policy.images || {})[name];
  checkedImages.add(name);
  if (!expectedDigest) {
    blockers.push(`${source}:${lineNumber}: image ${name} has no digest in config/artifact-policy.json`);
    return;
  }
  if (suppliedDigest !== expectedDigest) {
    blockers.push(`${source}:${lineNumber}: ${name} digest must be ${expectedDigest}`);
  }
}

function scanImageLines(file, regex, label) {
  if (!existsSync(file)) {
    blockers.push(`Missing required file: ${file}`);
    return;
  }
  const lines = readFileSync(file, 'utf8').split(/\r?\n/);
  for (const [index, line] of lines.entries()) {
    if (line.trim().startsWith('#')) continue;
    regex.lastIndex = 0;
    const match = regex.exec(line);
    if (match) checkImageReference(match[1], label, index + 1);
  }
}

scanImageLines(DOCKERFILE, /^\s*FROM\s+(?:--platform=\S+\s+)?(\S+)/i, 'Dockerfile');
scanImageLines(COMPOSE_FILE, /^\s*image:\s*([^\s#]+)/i, 'docker-compose.yml');

for (const pinned of Object.keys(policy.images || {})) {
  if (!checkedImages.has(pinned)) blockers.push(`config/artifact-policy.json pins unused image ${pinned}`);
}

if (!existsSync(WORKFLOW_DIR)) {
  blockers.push(`Missing required directory: ${WORKFLOW_DIR}`);
} else {
  for (const file of readdirSync(WORKFLOW_DIR)) {
    if (!/\.ya?ml$/i.test(file)) continue;
    const path = join(WORKFLOW_DIR, file);
    const lines = readFileSync(path, 'utf8').split(/\r?\n/);
    for (const [index, line] of lines.entries()) {
      if (line.trim().startsWith('#')) continue;
      const match = /(?:^|\s)uses:\s*([^\s#]+)/.exec(line);
      if (!match) continue;
      const reference = match[1];
      if (reference.startsWith('./')) continue;
      const [action, version] = reference.split('@');
      if (!action || !/^[0-9a-f]{40}$/i.test(version || '')) {
        blockers.push(`.github/workflows/${file}:${index + 1}: action must be pinned to a commit SHA (${reference})`);
        continue;
      }
      if (!/#\s*v?\d/.test(line)) {
        blockers.push(`.github/workflows/${file}:${index + 1}: pinned action needs a version comment (${action} # vN)`);
      }
      checkedActions.add(reference);
    }
  }
}

if (blockers.length) {
  console.error(`Artifact pin check FAILED: ${blockers.length} blocker(s).`);
  for (const blocker of blockers) console.error(`  ${blocker}`);
  console.error('Refresh digests from the registry and action SHAs from the tagged release before committing.');
  process.exit(1);
}

console.log(
  `Artifact pin check passed: ${checkedImages.size} digest-pinned image(s), ` +
  `${checkedActions.size} unique SHA-pinned action reference(s), digest-only promotion required.`,
);
