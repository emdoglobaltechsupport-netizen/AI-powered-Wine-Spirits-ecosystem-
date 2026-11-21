#!/usr/bin/env node
/**
 * Security architecture gate.
 *
 * Verifies that the canonical threat model is present, every threat carries an
 * explicit evidence gap, and the documented trust boundaries match the
 * executable Admin, session, tenant and adapter controls. This is a governance
 * check, not a penetration test, audit result or launch clearance.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(ROOT, path), 'utf8');
const policy = JSON.parse(read('config/security-architecture.json'));
const errors = [];
const fail = (message) => errors.push(message);
const requireText = (haystack, needle, label) => {
  if (!haystack.includes(needle)) fail(`${label} must contain ${JSON.stringify(needle)}`);
};

if (policy.status !== 'prototype-security-controls-design' || policy.prototypeMode !== true || policy.publicLaunch !== false) {
  fail('security architecture status must remain prototype design with no public launch');
}
if (policy.assets?.length !== 8) fail('security architecture must register 8 assets');
if (policy.trustBoundaries?.length !== 6) fail('security architecture must register 6 trust boundaries');
if (policy.threats?.length !== 8) fail('security architecture must register 8 threats');
for (const threat of policy.threats ?? []) {
  if (threat.evidenceRef !== null || !threat.controls?.length) {
    fail(`${threat.id}: threat must have controls and a null evidenceRef`);
  }
}
for (const asset of policy.assets ?? []) {
  if (!asset.owner || !['restricted', 'confidential'].includes(asset.classification)) {
    fail(`${asset.id}: asset requires an owner and a valid classification`);
  }
}
const boundaryIds = (policy.trustBoundaries ?? []).map((boundary) => boundary.id).sort();
if (JSON.stringify(boundaryIds) !== JSON.stringify(['admin', 'api', 'external', 'seller', 'service', 'user'])) {
  fail('trust boundaries must cover user, seller, admin, api, service and external');
}

const c = policy.controls ?? {};
if (c.authentication?.individualAccountsRequired !== true || c.authentication?.phishingResistantMfaRequired !== true || c.authentication?.hardwareBackedMfaRequired !== true || c.authentication?.headerSuppliedRoleTrusted !== false) {
  fail('authentication requires individual MFA accounts and server-derived identity');
}
if (c.sessionHandling?.httpOnlyCookie !== true || c.sessionHandling?.sameSite !== 'strict' || c.sessionHandling?.tokenHashStorageOnly !== true || c.sessionHandling?.defaultTtlHours !== 12) {
  fail('session handling contract has drifted');
}
if (c.tenantIsolation?.rlsPoliciesRequired !== true || c.tenantIsolation?.crossTenantReadWriteTestsRequired !== true || c.tenantIsolation?.rlsEvidenceRef !== null) {
  fail('RLS policies and cross-tenant tests must be required with no evidence attached');
}
if (c.encryption?.kmsKeyCustodyDefined !== false || c.encryption?.evidenceRef !== null || !c.encryption?.inTransit?.includes('TLS')) {
  fail('encryption requirements must be documented with unevidenced key custody');
}
if (c.ddosAndRateLimiting?.distributedLimiterImplemented !== false || c.ddosAndRateLimiting?.alertThresholdsDefined !== false) {
  fail('distributed rate limiting and alert thresholds must remain unimplemented');
}
if (c.secrets?.envOnly !== true || c.secrets?.minimumSessionSecretLength !== 32 || c.secrets?.secretScanInCi !== true || c.secrets?.mockCredentialsBlockedOutsideLocal !== true) {
  fail('secret handling contract has drifted');
}
if (c.supplyChain?.secretLicenceSbomScans !== true || c.supplyChain?.digestPinnedImages !== true || c.supplyChain?.localTrivyEvidenceAttached !== false) {
  fail('supply-chain controls must be defined with no local Trivy evidence');
}
if (c.incidentResponse?.humanLedPlaybookRequired !== true || c.incidentResponse?.drillEvidenceRef !== null || c.dataBreachPlaybook?.notificationClockDefined !== false || c.dataBreachPlaybook?.steps?.length !== 6) {
  fail('incident response and breach playbook must be required with no drill evidence');
}
if (policy.evidenceGaps?.length !== 5) fail('security architecture must record 5 explicit evidence gaps');

const doc = read('SECURITY_ARCHITECTURE.md');
const readme = read('README.md');
const pkg = JSON.parse(read('package.json'));
const apiConfig = read('services/api/src/config.ts');
const rlsMigration = read('packages/db/migrations/0003_seller_dashboard.sql');
const adminPolicy = JSON.parse(read('config/admin-access-policy.json'));

for (const heading of [
  'Assets and classification',
  'Trust boundaries',
  'Threats and mitigations',
  'Authentication and session handling',
  'Tenant isolation and RLS testing',
  'Encryption and transport',
  'Dependency, container and secret controls',
  'Incident response and data-breach playbooks',
  'Verification and boundaries',
]) {
  requireText(doc, `## ${heading}`, 'SECURITY_ARCHITECTURE.md');
}
requireText(doc, 'not an audit, penetration test or compliance attestation', 'SECURITY_ARCHITECTURE.md');
requireText(doc, 'rlsEvidenceRef` is null', 'SECURITY_ARCHITECTURE.md');
requireText(doc, 'No TLS or at-rest configuration evidence is attached', 'SECURITY_ARCHITECTURE.md');
requireText(apiConfig, 'SESSION_SECRET must be at least 32 characters', 'config.ts');
requireText(apiConfig, 'Production startup is disabled', 'config.ts');
requireText(rlsMigration, 'ENABLE ROW LEVEL SECURITY', '0003_seller_dashboard.sql');
requireText(rlsMigration, 'tenant_isolation', '0003_seller_dashboard.sql');
if (adminPolicy.phishingResistantMfaRequired !== true || adminPolicy.sessionControls?.tokenHashStorageOnly !== true) {
  fail('Admin access policy must match the security authentication contract');
}
for (const script of ['secrets:scan', 'sbom:check', 'artifacts:check', 'identity:check', 'boundaries:check', 'ci:verify']) {
  if (!pkg.scripts?.[script]) fail(`package.json must define ${script}`);
}
requireText(readme, '[`SECURITY_ARCHITECTURE.md`](./SECURITY_ARCHITECTURE.md)', 'README.md');

for (const ref of policy.codeBoundaryRefs) {
  if (!existsSync(join(ROOT, ref))) fail(`missing security architecture boundary reference: ${ref}`);
}

if (errors.length) {
  console.error(`Security architecture check failed: ${errors.length} finding(s).`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}
console.log(`Security architecture check passed: ${policy.assets.length} assets, ${policy.trustBoundaries.length} trust boundaries, ${policy.threats.length} threats with unevidenced controls.`);
console.log('No penetration test, encryption evidence, RLS test run or breach drill is attached.');
console.log('This gate does not attest to security controls or grant launch clearance.');
