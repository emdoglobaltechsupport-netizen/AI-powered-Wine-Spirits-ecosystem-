#!/usr/bin/env node
/**
 * Privileged Admin access gate.
 *
 * Verifies that the README-level Admin risk is bounded by individual accounts,
 * phishing-resistant MFA, workspace least privilege, JIT/break-glass controls,
 * distinct-four-eyes approval and auditable session handling. It also records
 * that external immutable logging and alerting are requirements, not present.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(ROOT, path), 'utf8');
const policy = JSON.parse(read('config/admin-access-policy.json'));
const identity = JSON.parse(read('config/identity-access-policy.json'));
const credential = JSON.parse(read('config/credential-policy.json'));
const errors = [];
const fail = (message) => errors.push(message);
const requireText = (haystack, needle, label) => {
  if (!haystack.includes(needle)) fail(`${label} must contain ${JSON.stringify(needle)}`);
};

if (policy.sharedSuperAdminIdentitiesAllowed !== false || policy.individualAccountsRequired !== true) {
  fail('shared super-admin identities must be disallowed and individual accounts required');
}
if (policy.phishingResistantMfaRequired !== true || policy.hardwareBackedMfaRequired !== true) {
  fail('phishing-resistant hardware-backed MFA must be required');
}
if (policy.workspaceLeastPrivilege?.workspaceCount !== 19 || policy.workspaceLeastPrivilege?.workspaceScopedRolesRequired !== true || policy.workspaceLeastPrivilege?.techOpsWorkspace !== 'ADM-19') {
  fail('Admin must be least-privilege across 19 workspaces including ADM-19');
}
if (policy.sessionControls?.tokenHashStorageOnly !== true || policy.sessionControls?.clientSuppliedIdentityTrusted !== false || policy.sessionControls?.sessionSecretMinLength !== 32) {
  fail('sessions must store hashes only and never trust client-supplied identity');
}
if (policy.jitElevation?.required !== true || policy.jitElevation?.maxMinutes !== 30 || policy.jitElevation?.distinctApproverRequired !== true || policy.jitElevation?.selfApprovalDenied !== true || policy.jitElevation?.expiryEnforced !== true) {
  fail('JIT elevation must be time-boxed, distinct-approved and self-approval-free');
}
if (policy.breakGlass?.allowed !== true || policy.breakGlass?.maxMinutes !== 60 || policy.breakGlass?.timeBoxed !== true || policy.breakGlass?.postIncidentReviewRequired !== true) {
  fail('break-glass access must be time-boxed and followed by review');
}
if (policy.fourEyes?.highImpactActionRequiresSecondApproval !== true || policy.fourEyes?.approverMustBeDistinctHuman !== true || policy.fourEyes?.productionIdpBackedApprovalRequired !== true) {
  fail('high-impact Admin actions require a distinct human second approver');
}
if (policy.audit?.localAppendOnly !== true || policy.audit?.immutableExternalSinkRequired !== true || policy.audit?.externalSinkConfigured !== false || policy.audit?.wormOrEquivalentRequired !== true || policy.audit?.retentionScheduleRef !== null) {
  fail('external immutable audit sink must be required but not configured');
}
if (policy.audit?.loginAlertingRequired !== true || policy.audit?.mutationAlertingRequired !== true || policy.audit?.alertingConfigured !== false) {
  fail('login and mutation alerting must be required but not configured');
}

if (identity.roles?.admin?.domain !== 'internal' || identity.adminIsCommerceRole !== false || !identity.roles?.admin?.requires?.includes('approver.distinct')) {
  fail('identity policy must keep Admin internal, non-commerce and distinct-approved');
}
if (!identity.deniedPermissions?.includes('admin:bypass:commerce')) fail('admin commerce bypass must remain denied');
if (identity.transactionControls?.aiMayApprove !== false) fail('AI must never approve a transaction');
if (credential.sessionSecretMinimumLength !== 32) fail('credential policy session secret minimum must be 32');

const auth = read('services/api/src/middleware/auth.ts');
const routes = read('services/api/src/modules/admin/admin.routes.ts');
const repo = read('services/api/src/modules/admin/admin.repo.ts');
const config = read('services/api/src/config.ts');
const doc = read('ADMIN_ACCESS_CONTROLS.md');
const readme = read('README.md');

for (const [label, source] of [['auth.ts', auth], ['admin.routes.ts', routes]]) {
  requireText(source, 'mfa_verified', label);
  requireText(source, 'elevation', label);
}
requireText(repo, 'elevation_scope', 'admin.repo.ts');
requireText(routes, 'Requester cannot approve their own elevation', 'admin.routes.ts');
requireText(routes, 'break_glass', 'admin.routes.ts');
requireText(routes, 'elevation_scope', 'admin.routes.ts');
requireText(routes, 'approver_id', 'admin.routes.ts');
requireText(routes, 'hardware_mfa', 'admin.routes.ts');
requireText(routes, 'JIT elevation', 'admin.routes.ts');
requireText(routes, "from '../../middleware/auth.js'", 'admin.routes.ts');
requireText(repo, 'break_glass', 'admin.repo.ts');
requireText(config, 'SESSION_SECRET must be at least 32 characters', 'config.ts');
requireText(config, 'Seeded admin credentials are blocked outside local/test development', 'config.ts');
requireText(config, 'Production startup is disabled', 'config.ts');
if (/admin:bypass:commerce|role.*from.*headers/i.test(auth)) fail('auth middleware must not grant Admin bypass from headers');

for (const ref of policy.codeBoundaryRefs) {
  if (!existsSync(join(ROOT, ref))) fail(`missing Admin access code boundary reference: ${ref}`);
}
requireText(readme, '[`ADMIN_ACCESS_CONTROLS.md`](./ADMIN_ACCESS_CONTROLS.md)', 'README.md');
requireText(doc, 'No shared super-admin identity is used.', 'ADMIN_ACCESS_CONTROLS.md');
requireText(doc, 'No external immutable audit sink', 'ADMIN_ACCESS_CONTROLS.md');
requireText(doc, 'not a production account', 'ADMIN_ACCESS_CONTROLS.md');

// A local control walkthrough may demonstrate prototype gates, but it must not
// be presented as production IdP/MFA proof, an immutable-sink test, an incident
// drill or launch clearance.
if (policy.localPrototypeWalkthroughRef !== undefined) {
  const walkthroughPath = policy.localPrototypeWalkthroughRef;
  if (!existsSync(join(ROOT, walkthroughPath))) {
    fail(`missing local prototype Admin walkthrough evidence: ${walkthroughPath}`);
  } else {
    const walkthrough = JSON.parse(read(walkthroughPath));
    if (walkthrough.status !== 'local-prototype-admin-control-walkthrough' ||
        walkthrough.prototypeMode !== true || walkthrough.publicLaunch !== false ||
        walkthrough.verdict !== 'NO-GO' || walkthrough.resultRef !== null ||
        walkthrough.productionEvidenceRef !== null) {
      fail('local Admin walkthrough must stay prototype-only with NO-GO and null external/production refs');
    }
    if (Object.values(walkthrough.checks ?? {}).some((value) => value !== true)) {
      fail('local Admin walkthrough must record only passing control checks');
    }
    if (!Array.isArray(walkthrough.unclosedGaps) || walkthrough.unclosedGaps.length < 3) {
      fail('local Admin walkthrough must list the unclosed production control gaps');
    }
    if (walkthrough.identity?.secretsLogged !== false) {
      fail('local Admin walkthrough must not record credentials');
    }
  }
}

if (errors.length) {
  console.error(`Admin access check failed: ${errors.length} finding(s).`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}
console.log('Admin access check passed: 19 workspace-scoped roles, JIT/break-glass controls, distinct four-eyes approval, hashed sessions.');
console.log('Local seeded admin is generated and local-only; external audit sink and alerting remain required but unconfigured.');
console.log('This gate does not prove production IdP/MFA or grant launch clearance.');
