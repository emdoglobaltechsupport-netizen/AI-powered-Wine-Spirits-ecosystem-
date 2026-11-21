#!/usr/bin/env node
/**
 * Machine-check the B2C/B2B/investment boundary policy:
 * - the register stays deny-by-default and role/tenant/jurisdiction scoped;
 * - API code does not accept a business-verification claim from a request header;
 * - the migration, seed and documentation evidence exist.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(ROOT, path), 'utf8');
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

const requiredFiles = [
  'IDENTITY_ACCESS_BOUNDARIES.md',
  'config/identity-access-policy.json',
  'packages/shared/src/compliance.ts',
  'packages/shared/src/compliance.test.ts',
  'packages/db/migrations/0014_identity_access_boundaries.sql',
  'packages/db/migrations/0015_force_identity_rls.sql',
  'packages/db/seed/005_identity_access_seed.sql',
  'services/api/src/middleware/access.ts',
];
for (const file of requiredFiles) {
  check(existsSync(join(ROOT, file)), `Missing required boundary file: ${file}`);
}

const policy = JSON.parse(read('config/identity-access-policy.json'));
check(policy.primaryRolePerTenant === true, 'One primary role per tenant must be enforced');
check(policy.adminIsCommerceRole === false, 'Admin must never be a commerce role');
check(policy.businessTrading.separateVerificationRequired === true, 'Business trading needs separate verification');
check(policy.businessTrading.creditSource === 'server', 'Credit must be server-derived');
check(policy.businessTrading.creditPerTenantAndCurrency === true, 'Credit must be tenant/currency scoped');
check(policy.transactionControls.consumerAgeOverrideAllowed === false, 'Consumer age override must be blocked');
check(policy.transactionControls.vaultTradingAllowed === false, 'Vault trading must be blocked');
check(policy.transactionControls.aiMayApprove === false, 'AI must not approve high-risk operations');
check(policy.isolation.crossTenantReads === 'deny', 'Cross-tenant reads must be denied');
check(policy.isolation.crossTenantWrites === 'deny', 'Cross-tenant writes must be denied');
check(policy.isolation.unknownRole === 'deny', 'Unknown roles must be denied');
check(policy.isolation.unknownPermission === 'deny', 'Unknown permissions must be denied');
check(policy.isolation.missingVerification === 'deny', 'Missing verification must be denied');
check(policy.deniedPermissions.includes('vault:trade:write:tenant'), 'Vault trading must be in the denied list');

const roles = ['customer', 'merchant', 'distributor', 'admin'];
for (const role of roles) check(policy.roles[role], `Missing role definition: ${role}`);

const shared = read('packages/shared/src/compliance.ts');
const permissions = new Set(Object.values(policy.roles).flatMap((role) => role.permissions));
for (const permission of permissions) {
  check(shared.includes(`'${permission}'`), `Permission is missing from shared policy code: ${permission}`);
}
for (const denied of policy.deniedPermissions) {
  check(shared.includes(`'${denied}'`), `Denied permission is missing from shared policy code: ${denied}`);
}

const migration = read('packages/db/migrations/0014_identity_access_boundaries.sql');
check(migration.includes('primary_commerce_role'), 'Migration must store one primary commerce role');
check(migration.includes('licence_jurisdictions'), 'Migration must store licence jurisdiction evidence');
check(migration.includes('authorization_decisions'), 'Migration must create the append-only decision log');
check(migration.includes('ENABLE ROW LEVEL SECURITY'), 'Migration must enable RLS');
const forceRls = read('packages/db/migrations/0015_force_identity_rls.sql');
check(forceRls.includes('FORCE ROW LEVEL SECURITY'), 'Migration must close the owner RLS bypass');
check(migration.includes('append-only'), 'Migration must enforce append-only decisions');
check(migration.includes('app_sessions') && migration.includes('login_attempts'),
  'Migration must tenant-scope sessions and login attempts');
check(migration.includes('b2b_licences'), 'Migration must tenant-scope B2B child tables');
check(migration.includes("'users','b2b_accounts'"), 'Migration must RLS-protect principal tables');
check(!/GRANT\s+BYPASSRLS/i.test(migration), 'Migration must not grant BYPASSRLS');

const seed = read('packages/db/seed/005_identity_access_seed.sql');
check(seed.includes('business@vintora.local'), 'Seed must include a separate distributor identity');
check(seed.includes('seller@vintora.local'), 'Seed must include a separate merchant identity');
check(seed.includes("'verified'"), 'Seed business account must be explicitly verified');

const routes = read('services/api/src/modules/simulations/simulation.routes.ts');
check(!routes.includes('x-business-verified'), 'API must not trust an x-business-verified request header');
check((routes.match(/requireAccess\(/g) ?? []).length >= 6, 'Trade routes must use deny-by-default access guards');
check(routes.includes('ownerBusinessAccountId'), 'Trade routes must enforce business-account ownership');
check(routes.includes('currency: businessCurrency'), 'Trade routes must enforce credit currency');
check(routes.includes('authorizedJurisdictions'), 'Trade list routes must filter by verified jurisdiction');

const auth = read('services/api/src/middleware/auth.ts');
check(auth.includes('ageCountry'), 'Auth context must carry the verified age country');
check(auth.includes('admin_sessions'), 'Staff state must be derived from live elevation records');
check(!auth.includes('elevationValid: true'), 'Staff elevation must not be hardcoded');

const access = read('services/api/src/middleware/access.ts');
check(access.includes('requestJurisdiction'), 'Access decisions must use transaction jurisdiction');
const tenant = read('services/api/src/db/tenant.ts');
check(tenant.includes("set_config($1, $2, true)', ['app.user_id', userId]"),
  'Tenant context must include the authenticated actor');

const adminRoutes = read('services/api/src/modules/admin/admin.routes.ts');
check(adminRoutes.includes("requireAccess('admin:*:internal'"),
  'Admin routes must use the shared deny-by-default admin permission');
check(adminRoutes.includes('BOOTSTRAP_PATHS'), 'Elevation bootstrap must be an explicit, minimal exception');

const smoke = read('services/api/scripts/smoke.mjs');
check(smoke.includes('cross-tenant'), 'Smoke test must include a cross-tenant access check');
check(smoke.includes('permission_denied'), 'Smoke test must assert deny decisions');
check(smoke.includes('jurisdiction_denied'), 'Smoke test must assert jurisdiction denial');

if (failures.length) {
  console.error(`Identity access policy check FAILED: ${failures.length} problem(s).`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log(
  `Identity access policy check passed: ${roles.length} roles, ${permissions.size} permissions, `
  + 'deny-by-default, tenant/jurisdiction/transaction scopes, append-only audit.',
);
