#!/usr/bin/env node
/**
 * Vintora SBOM generator (CycloneDX 1.5 JSON).
 *
 * - Pure Node built-ins; runs on supported Node 24.x/26.x LTS on Windows, macOS and Linux.
 * - Source of truth: package-lock.json (lockfileVersion 3). No network access.
 * - No environment variables, credentials or personal data are read or emitted.
 *
 * Licences are read from the installed package manifest when it exists. npm
 * also records the manifest licence in package-lock.json, so that value is a
 * stable fallback on machines with a partial node_modules install (otherwise
 * `sbom:check` would report a false stale result between local and CI runs).
 * If neither source has a licence, NOASSERTION is emitted.
 *
 * `node scripts/generate-sbom.mjs --check` regenerates in memory and compares
 * the semantic BOM content, ignoring metadata.timestamp and serialNumber.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const LOCK_FILE = join(ROOT, 'package-lock.json');
const OUTPUT_FILE = join(ROOT, 'sbom', 'vintora.cdx.json');
const TOOL_VERSION = '1.0.0';
const CHECK_ONLY = process.argv.includes('--check');

function fail(message) {
  console.error(message);
  process.exit(1);
}

function readJson(file) {
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function normalizeLicense(value) {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (Array.isArray(value)) {
    const parts = value.map(normalizeLicense).filter(Boolean);
    return parts.length ? parts.join(' OR ') : null;
  }
  if (value && typeof value === 'object' && typeof value.type === 'string' && value.type.trim()) {
    return value.type.trim();
  }
  return null;
}

/** Candidate on-disk manifests for a lock path, including hoisted ancestors. */
function installedManifestCandidates(lockPath) {
  if (!lockPath) return [];
  const candidates = [join(ROOT, lockPath, 'package.json')];
  if (lockPath.startsWith('node_modules/')) {
    const parts = lockPath.split('/');
    const nodeIndexes = parts.flatMap((part, index) => (part === 'node_modules' ? [index] : []));
    for (const index of nodeIndexes.slice(1)) {
      candidates.push(join(ROOT, 'node_modules', parts.slice(index + 1).join('/'), 'package.json'));
    }
  }
  return candidates;
}

function manifestFor(lockPath, entry) {
  if (entry && entry.link && entry.resolved) {
    return readJson(join(ROOT, entry.resolved, 'package.json'));
  }
  for (const candidate of installedManifestCandidates(lockPath)) {
    const manifest = readJson(candidate);
    if (manifest) return manifest;
  }
  return null;
}

function nameFromPath(lockPath) {
  if (!lockPath) return 'vintora';
  if (lockPath.startsWith('node_modules/')) {
    return lockPath.slice('node_modules/'.length).split('/node_modules/').pop();
  }
  return lockPath.split('/').pop() || lockPath;
}

function integrityHashes(integrity) {
  if (typeof integrity !== 'string') return [];
  const token = integrity.trim().split(/\s+/)[0] || '';
  const match = /^(sha512|sha256)-([A-Za-z0-9+/]+={0,2})$/i.exec(token);
  if (!match) return [];
  const digest = Buffer.from(match[2], 'base64');
  if (!digest.length) return [];
  return [{
    alg: match[1].toLowerCase() === 'sha512' ? 'SHA-512' : 'SHA-256',
    content: digest.toString('hex'),
  }];
}

function isWorkspace(lockPath, entry) {
  return !lockPath || !lockPath.startsWith('node_modules/') || Boolean(entry && entry.link);
}

function componentFor(lockPath, entry) {
  const manifest = manifestFor(lockPath, entry);
  const name = entry.name || (manifest && manifest.name) || nameFromPath(lockPath);
  const version = entry.version || (manifest && manifest.version) || '0.0.0';
  const purl = `pkg:npm/${name}@${version}`;
  const component = {
    type: isWorkspace(lockPath, entry) ? 'application' : 'library',
    'bom-ref': `${purl}#${lockPath || 'root'}`,
    name,
    version,
    purl,
  };

  const license = normalizeLicense(manifest && (manifest.license || manifest.licenses))
    || normalizeLicense(entry.license || entry.licenses);
  component.licenses = [{ license: license ? { id: license } : { name: 'NOASSERTION' } }];

  const hashes = integrityHashes(entry.integrity);
  if (hashes.length) component.hashes = hashes;

  // Dev components are not shipped; optional components may not be installed.
  if (entry.dev || entry.devOptional) component.scope = 'excluded';
  else if (entry.optional) component.scope = 'optional';

  return component;
}

/** RFC 4122 v5-shaped UUID derived from the lockfile bytes (reproducible). */
function serialNumberFor(lockBytes) {
  const bytes = Buffer.from(createHash('sha256').update(lockBytes).digest().subarray(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `urn:uuid:${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function buildBom(lockBytes) {
  let lock;
  try {
    lock = JSON.parse(lockBytes.toString('utf8'));
  } catch {
    fail('Could not parse package-lock.json as JSON.');
  }
  if (!lock || lock.lockfileVersion !== 3 || !lock.packages) {
    fail('Unsupported package-lock.json: expected lockfileVersion 3 with a "packages" map.');
  }

  const paths = Object.keys(lock.packages).sort((a, b) => {
    if (a === '') return -1;
    if (b === '') return 1;
    return a < b ? -1 : (a > b ? 1 : 0);
  });
  const components = paths.map((path) => componentFor(path, lock.packages[path] || {}));
  const root = lock.packages[''] || {};
  const rootVersion = root.version || '0.1.0';
  const rootPurl = `pkg:npm/${root.name || 'vintora'}@${rootVersion}`;

  return {
    bomFormat: 'CycloneDX',
    specVersion: '1.5',
    serialNumber: serialNumberFor(lockBytes),
    version: 1,
    metadata: {
      timestamp: new Date().toISOString(),
      tools: [{ vendor: 'Vintora', name: 'generate-sbom.mjs', version: TOOL_VERSION }],
      component: {
        type: 'application',
        name: 'Vintora',
        version: rootVersion,
        purl: rootPurl,
      },
    },
    components,
  };
}

/** Deterministic JSON for equality checks (key order independent). */
function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function semanticView(bom) {
  const copy = JSON.parse(JSON.stringify(bom));
  delete copy.serialNumber;
  if (copy.metadata) delete copy.metadata.timestamp;
  return copy;
}

if (!existsSync(LOCK_FILE)) fail(`package-lock.json not found at ${LOCK_FILE}`);
const lockBytes = readFileSync(LOCK_FILE);
const bom = buildBom(lockBytes);

if (CHECK_ONLY) {
  const committed = readJson(OUTPUT_FILE);
  if (!committed) {
    fail('SBOM check FAILED: sbom/vintora.cdx.json is missing or invalid. Run: npm run sbom:generate');
  }

  const expected = semanticView(bom);
  const actual = semanticView(committed);
  if (stableStringify(expected) === stableStringify(actual)) {
    console.log(`SBOM check passed: sbom/vintora.cdx.json matches package-lock.json (${bom.components.length} components).`);
    process.exit(0);
  }

  console.error('SBOM check FAILED: sbom/vintora.cdx.json does not match package-lock.json.');
  const actualByRef = new Map((actual.components || []).map((component) => [component['bom-ref'], component]));
  const expectedByRef = new Map((expected.components || []).map((component) => [component['bom-ref'], component]));
  const differences = [];
  for (const [ref, component] of expectedByRef) {
    const found = actualByRef.get(ref);
    if (!found) differences.push(`missing component: ${ref}`);
    else if (stableStringify(found) !== stableStringify(component)) differences.push(`changed component: ${ref}`);
  }
  for (const ref of actualByRef.keys()) {
    if (!expectedByRef.has(ref)) differences.push(`unexpected component: ${ref}`);
  }
  if (!differences.length) differences.push('BOM metadata or format fields differ from the regenerated content.');
  for (const line of differences.slice(0, 10)) console.error(`  ${line}`);
  if (differences.length > 10) console.error(`  ... and ${differences.length - 10} more`);
  console.error('Regenerate with: npm run sbom:generate');
  process.exit(1);
}

mkdirSync(dirname(OUTPUT_FILE), { recursive: true });
writeFileSync(OUTPUT_FILE, `${JSON.stringify(bom, null, 2)}\n`, 'utf8');
console.log(`Generated sbom/vintora.cdx.json (CycloneDX ${bom.specVersion}, ${bom.components.length} components).`);
