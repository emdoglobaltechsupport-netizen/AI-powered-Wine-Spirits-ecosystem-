#!/usr/bin/env node
/**
 * Prototype network and secret isolation gate.
 *
 * Verifies loopback-only Compose bindings, internal data networks and the
 * absence of shared/production network attachments. It is not a hosted
 * firewall, VPC or secrets-manager control.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(ROOT, path), 'utf8');
const policy = JSON.parse(read('config/network-isolation-policy.json'));
const compose = read(policy.composeFile);
const errors = [];
const fail = (message) => errors.push(message);
const requireText = (haystack, needle, label) => {
  if (!haystack.includes(needle)) fail(`${label} must contain ${JSON.stringify(needle)}`);
};

if (policy.status !== 'prototype-network-isolation-design' || policy.prototypeMode !== true || policy.publicLaunch !== false) {
  fail('network isolation policy must remain a prototype local-only design');
}
if (policy.productionNetworkAccess !== false || policy.sharedNetworkAccess !== false) {
  fail('shared and production network access must remain false');
}
if (policy.secrets?.inImage !== false || policy.secrets?.inComposeFile !== false || policy.secrets?.sharedSecretStore !== null) {
  fail('secrets must remain outside images, Compose literals and shared stores');
}
if (policy.requiredBindHost !== '127.0.0.1') fail('required bind host must be 127.0.0.1');
if (!Array.isArray(policy.publishedPorts) || policy.publishedPorts.length !== 4) fail('four prototype ports must be registered');
if (!Array.isArray(policy.expectedBindings) || policy.expectedBindings.length !== policy.publishedPorts.length) {
  fail('expectedBindings must cover every published port');
}
for (const binding of policy.expectedBindings ?? []) {
  requireText(compose, binding, policy.composeFile);
}
for (const forbidden of policy.forbidden ?? []) {
  if (compose.includes(forbidden)) fail(`forbidden Compose configuration present: ${forbidden}`);
}
if (/network_mode\s*:\s*host/.test(compose)) fail('host networking is forbidden');
if (/NODE_ENV\s*[:=]\s*production/.test(compose + read('Dockerfile'))) fail('production NODE_ENV is forbidden in the local stack');

const lines = compose.split(/\r?\n/);
function serviceBlock(name) {
  const start = lines.findIndex((line) => new RegExp(`^  ${name}:\\s*$`).test(line));
  if (start === -1) {
    fail(`Compose service is missing: ${name}`);
    return '';
  }
  const end = lines.findIndex((line, index) => index > start && /^  [A-Za-z0-9_-]+:\s*$/.test(line));
  return lines.slice(start, end === -1 ? lines.length : end).join('\n');
}
const blocks = Object.fromEntries(['db', 'redis', 'api', 'prototype'].map((name) => [name, serviceBlock(name)]));
for (const service of policy.networks?.dataServices ?? []) {
  const block = blocks[service] ?? '';
  requireText(block, `- ${policy.networks.dataNetwork}`, `${service} networks`);
  if (block.includes(`- ${policy.networks.edgeNetwork}`)) fail(`${service} must not attach to the edge network`);
}
for (const service of policy.networks?.edgeServices ?? []) {
  requireText(blocks[service] ?? '', `- ${policy.networks.edgeNetwork}`, `${service} networks`);
}
requireText(blocks.api ?? '', `- ${policy.networks.dataNetwork}`, 'api networks');
if ((blocks.prototype ?? '').includes(`- ${policy.networks.dataNetwork}`)) fail('prototype must not attach to the data network');
requireText(compose, `${policy.networks.dataNetwork}:\n    internal: true`, policy.composeFile);
requireText(compose, `${policy.networks.edgeNetwork}:\n    driver: bridge`, policy.composeFile);

const envExample = read('.env.example');
for (const variable of policy.secrets?.requiredVariables ?? []) {
  requireText(envExample, `${variable}=`, '.env.example');
  requireText(compose, variable, policy.composeFile);
}
const dockerfile = read('Dockerfile');
requireText(dockerfile, 'USER node', 'Dockerfile');
requireText(dockerfile, 'ENV NODE_ENV=development', 'Dockerfile');

const doc = read('NETWORK_ISOLATION.md');
for (const heading of ['## 1. Compose boundary', '## 2. Secret isolation', '## 3. Forbidden configurations', '## 4. Evidence gaps']) {
  requireText(doc, heading, 'NETWORK_ISOLATION.md');
}
for (const marker of ['config/network-isolation-policy.json', 'npm run network:check', '127.0.0.1',
  'vintora-internal', 'vintora-edge', 'No hosted network policy']) {
  requireText(doc, marker, 'NETWORK_ISOLATION.md');
}
if (!Array.isArray(policy.evidenceGaps) || policy.evidenceGaps.length < 3) fail('network evidence gaps are required');

if (errors.length) {
  console.error(`Network isolation check failed: ${errors.length} finding(s).`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}
console.log(`Network isolation check passed: ${policy.publishedPorts.length} loopback bindings, ${policy.networks.dataServices.length} internal data services.`);
console.log('No shared or production network attachment is defined; hosted firewall evidence remains absent.');
