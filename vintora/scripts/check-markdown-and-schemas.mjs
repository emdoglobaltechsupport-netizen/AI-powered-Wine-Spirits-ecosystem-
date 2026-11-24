#!/usr/bin/env node
/**
 * Offline Markdown/link and JSON schema consistency gates.
 *
 * --markdown validates relative links and required maturity markers across all
 * governed Markdown files plus key cross-file invariants. --schemas validates
 * parseable configuration JSON and required register shapes. Neither mode
 * contacts external URLs or certifies prose correctness.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(ROOT, path), 'utf8');
const config = JSON.parse(read('config/markdown-ci.json'));
const mode = process.argv.includes('--schemas') ? 'schemas' : 'markdown';
const errors = [];
const fail = (message) => errors.push(message);
const skip = new Set(config.excludedDirs ?? []);

function walk(directory) {
  const found = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (skip.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      found.push(...walk(path));
    } else if (entry.isFile()) {
      found.push(path);
    }
  }
  return found;
}
const files = walk(ROOT);
const rel = (path) => relative(ROOT, path).replace(/\\/g, '/');

if (config.status !== 'prototype-markdown-and-schema-ci' || config.prototypeMode !== true || config.publicLaunch !== false) {
  fail('Markdown/schema CI policy must remain a prototype gate');
}

if (mode === 'markdown') {
  const markdownFiles = files.filter((file) => extname(file) === '.md');
  for (const file of markdownFiles) {
    const source = readFileSync(file, 'utf8');
    for (const match of source.matchAll(/\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
      const raw = match[1];
      if (/^(?:https?:|mailto:|#)/i.test(raw)) continue;
      const target = raw.split('#')[0].replace(/\\/g, '/');
      if (!target) continue;
      const absolute = resolve(dirname(file), target);
      if (!existsSync(absolute)) fail(`${rel(file)} link does not resolve: ${raw}`);
    }
  }

  for (const doc of config.requiredDocMarkers ?? []) {
    if (!existsSync(join(ROOT, doc))) {
      fail(`required Markdown document is missing: ${doc}`);
      continue;
    }
    const source = read(doc);
    for (const marker of config.requiredMarkers ?? []) {
      if (!source.includes(marker)) fail(`${doc} must contain required marker ${JSON.stringify(marker)}`);
    }
  }

  const docs = JSON.parse(read('config/docs-governance.json'));
  const counts = JSON.parse(read('config/test-counts.json'));
  const meta = JSON.parse(read('config/canonical-metadata.json'));
  const evidence = JSON.parse(read('config/evidence-index.json'));
  const fixtures = JSON.parse(read('config/fixture-taxonomy.json'));
  const gates = JSON.parse(read('config/release-gates.json'));
  if (meta.counts?.browserChecks !== counts.totals?.browserChecks ||
      meta.counts?.offlineAssertions !== counts.totals?.offlineAssertions ||
      meta.counts?.independentPhase1Checks !== counts.totals?.independentPhase1Checks) {
    fail('canonical metadata counts differ from generated test counts');
  }
  if (meta.counts?.adminWorkspaces !== docs.schemas?.numbers?.adminWorkspaces ||
      meta.counts?.techopsAgents !== docs.schemas?.numbers?.techopsAgents) {
    fail('canonical metadata counts differ from docs governance counts');
  }
  for (const entry of evidence.entries ?? []) {
    if (entry.resultRef !== null && (typeof entry.resultRef !== 'string' || !/^https?:\/\/\S+/.test(entry.resultRef))) {
      fail(`evidence index ${entry.id} resultRef must be null or an absolute http(s) URL`);
    }
  }
  if (fixtures.definitions?.live?.present !== false || fixtures.liveFixturesPresent !== false ||
      fixtures.definitions?.live?.purchasable !== false) {
    fail('fixture taxonomy must keep live fixtures absent and non-purchasable');
  }
  if (gates.promotionAllowed !== false) fail('release gates must keep promotion disabled');
  for (const stage of gates.stages ?? []) {
    if (stage.hostedEvidenceRef !== null && (typeof stage.hostedEvidenceRef !== 'string' || !/^https?:\/\/\S+/.test(stage.hostedEvidenceRef))) {
      fail(`release stage ${stage.id} hostedEvidenceRef must be null or an absolute http(s) URL`);
    }
  }

  if (errors.length) {
    console.error(`Markdown and link check failed: ${errors.length} finding(s).`);
    for (const error of errors) console.error(`  - ${error}`);
    process.exit(1);
  }
  console.log(`Markdown and link check passed: ${markdownFiles.length} documents, ${config.requiredDocMarkers.length} maturity markers, all relative links resolved.`);
  console.log('Cross-file count, evidence, fixture and release invariants agree; no external URL was contacted.');
} else {
  const jsonFiles = files.filter((file) => extname(file) === '.json' && (rel(file).startsWith('config/') || rel(file) === 'package.json'));
  const parsed = new Map();
  for (const file of jsonFiles) {
    try {
      parsed.set(rel(file), JSON.parse(readFileSync(file, 'utf8')));
    } catch (error) {
      fail(`${rel(file)} is not valid JSON: ${error.message}`);
    }
  }
  const expected = {
    'config/adr-process.json': ['status', 'registry', 'review'],
    'config/canonical-metadata.json': ['modules', 'regions', 'currencies', 'languages', 'counts', 'validation'],
    'config/claims-change-management.json': ['categories', 'requiredChecks', 'changeLog'],
    'config/data-retention-architecture.json': ['classes', 'workflows', 'enforcement'],
    'config/docs-governance.json': ['schemas', 'validation', 'owners'],
    'config/evidence-index.json': ['categories', 'entries', 'review'],
    'config/fixture-taxonomy.json': ['classes', 'definitions', 'fixtureFiles'],
    'config/markdown-ci.json': ['excludedDirs', 'requiredDocMarkers', 'crossFileRules'],
    'config/network-isolation-policy.json': ['networks', 'secrets', 'forbidden'],
    'config/release-gates.json': ['stages', 'blockingRules', 'promotionAllowed'],
    'config/repository-policy.json': ['licence', 'contribution', 'rejectionRules'],
    'config/status-dashboard.json': ['health', 'checks', 'measurement'],
    'config/test-counts.json': ['sources', 'suites', 'totals'],
  };
  for (const [file, keys] of Object.entries(expected)) {
    const value = parsed.get(file);
    if (!value) {
      fail(`required config file is missing or invalid: ${file}`);
      continue;
    }
    for (const key of keys) {
      if (!(key in value)) fail(`${file} is missing required schema key: ${key}`);
    }
  }
  for (const doc of parsed.get('config/docs-governance.json')?.validation?.scannedDocs ?? []) {
    if (!existsSync(join(ROOT, doc))) fail(`docs governance scanned doc is missing: ${doc}`);
  }
  for (const stage of parsed.get('config/release-gates.json')?.stages ?? []) {
    for (const ref of stage.workflowRefs ?? []) {
      if (!existsSync(join(ROOT, ref))) fail(`release workflow reference is missing: ${ref}`);
    }
  }
  const configDirEntries = readdirSync(join(ROOT, 'config'));
  for (const file of configDirEntries.filter((name) => name.endsWith('.json'))) {
    if (!parsed.has(`config/${file}`)) fail(`config JSON could not be parsed: ${file}`);
  }

  if (errors.length) {
    console.error(`JSON schema consistency check failed: ${errors.length} finding(s).`);
    for (const error of errors) console.error(`  - ${error}`);
    process.exit(1);
  }
  console.log(`JSON schema consistency check passed: ${jsonFiles.length} parseable config/package files, ${Object.keys(expected).length} required register shapes.`);
  console.log('Cross-references resolve; no hosted schema registry or remote validation was contacted.');
}
