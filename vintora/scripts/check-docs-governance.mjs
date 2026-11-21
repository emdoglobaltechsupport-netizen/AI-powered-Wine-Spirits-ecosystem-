#!/usr/bin/env node
/**
 * Documentation ownership and canonical-consistency gate.
 *
 * Validates canonical schemas, per-deliverable ownership and version dates,
 * README Markdown links, duplicated canonical numbers and the generated README
 * inventory. With --write-docs it regenerates that inventory instead of
 * checking it. This proves metadata parity, not that targets are achievable.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(ROOT, path), 'utf8');
const write = (path, value) => writeFileSync(join(ROOT, path), value, 'utf8');
const policy = JSON.parse(read('config/docs-governance.json'));
const shouldWrite = process.argv.includes('--write-docs');
const errors = [];
const fail = (message) => errors.push(message);
const requireText = (haystack, needle, label) => {
  if (!haystack.includes(needle)) fail(`${label} must contain ${JSON.stringify(needle)}`);
};

const s = policy.schemas ?? {};
if (s.modules?.count !== 10 || s.modules?.names?.length !== 10) fail('canonical module schema must declare 10 modules');
if (s.internalLayers?.count !== 4 || s.internalLayers?.names?.length !== 4) fail('internal layer schema must declare 4 layers');
if (s.markets?.phase1?.join(',') !== 'US,UK,SG' || s.markets?.africaTargetCount !== 14 ||
    s.markets?.africaScopeStatus !== 'design_target' || s.markets?.africaActivationState !== 'blocked' ||
    s.markets?.africaPhaseAssignment !== 'unassigned') {
  fail('market schema must keep 3 phase-1 markets and 14 blocked Africa targets');
}
const n = s.numbers ?? {};
if (n.adminWorkspaces !== 19 || n.techopsAgents !== 24 || n.deliverables !== 27 ||
    n.demoSkuRows !== 12 || n.licensedFeeds !== 0 || n.verifiedRows !== 0 ||
    n.skuAcquisitionTarget !== 1850 || n.skuScaleTarget !== '10M+ SKU target by 2034') {
  fail('canonical number schema has drifted');
}
if (n.users2034 !== 100000000 || n.peakOrdersPerDay !== 1200000 || n.edgeRequestsPerSecond !== 50000 ||
    n.apiP95Ms !== 200 || n.availabilityPct !== 99.99) {
  fail('canonical scale numbers must match config/capacity-model.json');
}
if (!Array.isArray(s.status?.values) || s.status.values.join(',') !== 'Design,Prototype,Pilot,Production' ||
    s.status.currentVerdict !== 'NO-GO' || s.status.reservedTerm !== 'production-ready' ||
    s.status.reservedTermRequiresEvidence !== true) {
  fail('readiness status schema has drifted');
}
if (policy.review?.fourEyesRequired !== true || policy.review?.distinctApproverRequired !== true ||
    policy.review?.versionDateRequired !== true || policy.review?.ownerRoleRequired !== true) {
  fail('review model requires four eyes, distinct approval, owner role and version date');
}
const rr = policy.readmeReview ?? {};
if (rr.onboardingOwnerRole !== 'Developer Experience / Platform Lead' ||
    rr.investorDocsOwnerRole !== 'Founder / Finance Lead' ||
    rr.regulatoryDocsOwnerRole !== 'Legal / Compliance Lead' ||
    rr.implementationReviewCadence !== 'monthly' || rr.externalReviewCadence !== 'quarterly' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(rr.lastReviewed ?? '')) {
  fail('README review register must define onboarding, investor and regulatory owners with dated cadences');
}
if (rr.canonicalVersions?.canon !== '1.0' || rr.canonicalVersions?.policies !== 'v1' || rr.canonicalVersions?.api !== 'v1' ||
    rr.prApproval?.distinctApproverRequired !== true || rr.prApproval?.linkRequired !== true ||
    !Array.isArray(rr.prApproval?.requiredChecks) || !rr.prApproval.requiredChecks.includes('docs:check')) {
  fail('README review must pin canonical versions and PR approval checks');
}

// Derive module names and scale values from the shared canonical source.
const shared = read('packages/shared/src/index.ts');
const modulesBlock = shared.slice(shared.indexOf('modules: ['), shared.indexOf('scale: {'));
const canonicalModules = [...modulesBlock.matchAll(/'Vintora [^']+'/g)].map((match) => match[0].slice(1, -1));
if (JSON.stringify(canonicalModules) !== JSON.stringify(s.modules.names)) {
  fail('config module names differ from CANON.modules in packages/shared/src/index.ts');
}
for (const literal of ['users2034: 100_000_000', 'peakOrdersPerDay: 1_200_000', 'peakRequestsPerSecond: 50_000', 'p95Ms: 200']) {
  requireText(shared, literal, 'packages/shared/src/index.ts');
}

// Deliverable ownership and version dates.
if (policy.owners?.length !== n.deliverables) fail('owner register must cover all 27 deliverables');
for (let i = 0; i < (policy.owners?.length ?? 0); i += 1) {
  const owner = policy.owners[i];
  const expectedId = String(i + 1).padStart(2, '0');
  if (owner.id !== expectedId) fail(`owner ${owner.id}: expected id ${expectedId}`);
  if (!existsSync(join(ROOT, owner.document))) fail(`${owner.document}: file is missing`);
  if (!owner.ownerRole || !owner.version || !/^\d{4}-\d{2}-\d{2}$/.test(owner.versionDate ?? '') || owner.reviewRequired !== true) {
    fail(`${owner.id}: owner role, version, ISO version date and review flag are required`);
  }
}

// Markdown link resolution across the README and all governed docs.
const readme = read('README.md');
const linkedDocs = new Set(['README.md', ...(policy.validation?.scannedDocs ?? [])]);
for (const file of linkedDocs) {
  if (!existsSync(join(ROOT, file))) continue;
  const source = file === 'README.md' ? readme : read(file);
  for (const match of source.matchAll(/\[[^\]]*\]\((\.\.?\/[^)]+)\)/g)) {
    const target = match[1].split('#')[0].replace(/\/$/, '');
    if (!target || !existsSync(join(ROOT, target))) fail(`${file} link does not resolve: ${match[1]}`);
  }
}

// Duplicated canonical numbers must agree with the register.
const numericRules = [
  { pattern: /(?<![\w-])(\d+)\s+(?:operation\s+)?(?:Admin\s+)?workspaces?\b/gi, expected: 19, label: 'Admin workspaces' },
  { pattern: /(?<![\w-])(\d+)\s+(?:TechOps\s+)?agents?\b/gi, expected: 24, label: 'TechOps agents' },
  { pattern: /(?<![\w-])(\d+)\s+deliverables\b/gi, expected: 27, label: 'deliverables' },
  { pattern: /(?<![\w-])(\d+)\s+modules\b/gi, expected: 10, label: 'modules' },
];
for (const file of policy.validation?.scannedDocs ?? []) {
  if (!existsSync(join(ROOT, file))) {
    fail(`scanned doc is missing: ${file}`);
    continue;
  }
  const source = read(file);
  for (const rule of numericRules) {
    for (const match of source.matchAll(rule.pattern)) {
      if (Number(match[1]) !== rule.expected) {
        fail(`${file}: conflicting ${rule.label} count ${match[1]} (expected ${rule.expected})`);
      }
    }
  }
}

// Generated README inventory.
const inventoryFile = policy.generatedInventory?.file ?? 'README.md';
const start = policy.generatedInventory?.startMarker;
const end = policy.generatedInventory?.endMarker;
if (!start || !end) fail('generated inventory markers are required');
const expectedBlock = [
  start,
  '| Item | Count / value |',
  '|---|---|',
  `| Market-facing modules | ${s.modules.count} |`,
  `| Internal layers | ${s.internalLayers.count} |`,
  `| Admin workspaces | ${n.adminWorkspaces} |`,
  `| TechOps agents (ADM-19) | ${n.techopsAgents} |`,
  `| Design deliverables | ${n.deliverables} |`,
  `| Africa target markets | ${s.markets.africaTargetCount} |`,
  `| Current demo SKU rows | ${n.demoSkuRows} |`,
  `| Licensed feeds / verified rows | ${n.licensedFeeds} / ${n.verifiedRows} |`,
  `| SKU acquisition target | ${n.skuAcquisitionTarget.toLocaleString('en-US')} |`,
  end,
].join('\n');
const inventory = read(inventoryFile);
const startIndex = inventory.indexOf(start);
const endIndex = inventory.indexOf(end);
if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
  fail(`${inventoryFile}: generated inventory markers are missing or out of order`);
} else {
  const actualBlock = inventory.slice(startIndex, endIndex + end.length);
  if (shouldWrite) {
    write(inventoryFile, inventory.slice(0, startIndex) + expectedBlock + inventory.slice(endIndex + end.length));
    console.log(`Updated generated inventory in ${inventoryFile}.`);
  } else if (actualBlock !== expectedBlock) {
    fail(`${inventoryFile}: generated inventory is stale; run npm run docs:check -- --write-docs`);
  }
}

const doc = read('DOCS_GOVERNANCE.md');
for (const heading of ['Authority chain', 'Canonical schemas', 'Ownership and review', 'Validation', 'Evidence gaps']) {
  requireText(doc, `## ${heading}`, 'DOCS_GOVERNANCE.md');
}
requireText(readme, '[`DOCS_GOVERNANCE.md`](./DOCS_GOVERNANCE.md)', 'README.md');
requireText(readme, '[`SECURITY_ARCHITECTURE.md`](./SECURITY_ARCHITECTURE.md)', 'README.md');
requireText(readme, '[`CAPACITY_AND_RELIABILITY.md`](./CAPACITY_AND_RELIABILITY.md)', 'README.md');
requireText(readme, '[`INVESTOR_DOCUMENTATION.md`](./INVESTOR_DOCUMENTATION.md)', 'README.md');
requireText(readme, '[`REGULATORY_DOCUMENTATION.md`](./REGULATORY_DOCUMENTATION.md)', 'README.md');
for (const needle of [
  '### Repository ownership and review cadence',
  'Developer Experience / Platform Lead',
  'Founder / Finance Lead',
  'Legal / Compliance Lead',
  'monthly implementation review',
  'quarterly external review',
  '2026-11-21',
  'canon `1.0`, policies `v1`, API `v1`',
  'Distinct PR approver',
]) {
  requireText(readme, needle, 'README.md');
}
requireText(doc, 'No named individual holds a role', 'DOCS_GOVERNANCE.md');

for (const ref of ['_canon.md', 'CANON_GOVERNANCE.md', 'config/jurisdiction-compliance.json', 'config/implementation-status.json']) {
  if (!existsSync(join(ROOT, ref))) fail(`missing docs governance reference: ${ref}`);
}

if (errors.length) {
  console.error(`Docs governance check failed: ${errors.length} finding(s).`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}
if (!shouldWrite) {
  console.log(`Docs governance check passed: ${s.modules.count} modules, ${n.deliverables} owned deliverables, ${policy.owners.length} dated owners, generated inventory current.`);
  console.log('Markdown links, canonical number duplicates and schemas agree with the canon.');
  console.log('This gate proves metadata parity only; it is not a review or launch clearance.');
}
