import test from 'node:test';
import assert from 'node:assert/strict';
import {
  authorizeAccess,
  availableBusinessCredit,
  type AccessPrincipal,
  type AccessResource,
  type BusinessVerification,
} from './compliance.js';

const TENANT_A = '00000000-0000-0000-0000-000000000001';
const TENANT_B = '00000000-0000-0000-0000-000000000002';

const business: BusinessVerification = {
  status: 'verified',
  kycTier: 'verified',
  tenantId: TENANT_A,
  jurisdictions: ['US', 'GB'],
  licenceJurisdictions: ['US', 'GB'],
  activeContract: true,
  licenceEvidenceForJurisdiction: true,
  namedAuthorisedBuyer: true,
  creditLimit: 100_000,
  creditUsed: 25_000,
  reservedCredit: 5_000,
  creditCurrency: 'USD',
};

const principal = (overrides: Partial<AccessPrincipal> = {}): AccessPrincipal => ({
  userId: 'user-1',
  tenantId: TENANT_A,
  role: 'customer',
  jurisdictions: ['US', 'GB'],
  ageVerified: true,
  ...overrides,
});

const resource = (overrides: Partial<AccessResource> = {}): AccessResource => ({
  tenantId: TENANT_A,
  jurisdiction: 'US',
  domain: 'market',
  ...overrides,
});

test('deny-by-default rejects unknown roles, permissions and domains', () => {
  assert.equal(authorizeAccess(principal({ role: 'superuser' }), resource(), { permission: 'market:browse:tenant' }).code, 'unknown_role');
  assert.equal(authorizeAccess(principal(), resource(), { permission: 'unknown:action:tenant' }).code, 'unknown_permission');
  assert.equal(authorizeAccess(principal(), resource({ domain: 'trade' }), { permission: 'market:browse:tenant' }).code, 'domain_mismatch');
});

test('customer can browse and checkout only after age verification', () => {
  const browse = authorizeAccess(principal(), resource(), { permission: 'market:browse:tenant' });
  assert.equal(browse.allowed, true);
  const denied = authorizeAccess(principal({ ageVerified: false }), resource(), { permission: 'market:checkout:tenant' });
  assert.equal(denied.code, 'age_verification_required');
});

test('customer cannot use merchant, distributor, Vault-restricted or Admin operations', () => {
  assert.equal(authorizeAccess(principal(), resource({ domain: 'seller' }), { permission: 'seller:listing:write:tenant' }).code, 'permission_denied');
  assert.equal(authorizeAccess(principal(), resource({ domain: 'trade' }), { permission: 'trade:rfq:write:tenant' }).code, 'permission_denied');
  assert.equal(authorizeAccess(principal(), resource({ domain: 'admin' }), { permission: 'admin:settings:internal' }).code, 'permission_denied');
  assert.equal(authorizeAccess(principal(), resource({ domain: 'vault' }), { permission: 'vault:trade:write:tenant' }).code, 'operation_blocked');
});

test('cross-tenant reads and writes are always denied', () => {
  const decision = authorizeAccess(
    principal({ role: 'distributor', businessAccountId: 'biz-1', businessVerification: business }),
    resource({ tenantId: TENANT_B, domain: 'trade' }),
    { permission: 'trade:rfq:write:tenant' },
  );
  assert.equal(decision.code, 'cross_tenant');
  assert.equal(decision.allowed, false);
});

test('merchant can write only listings it owns in its own jurisdiction', () => {
  const owner = principal({ role: 'merchant', userId: 'merchant-1' });
  assert.equal(authorizeAccess(owner, resource({ domain: 'seller', ownerUserId: 'merchant-1' }), { permission: 'seller:listing:write:tenant' }).allowed, true);
  assert.equal(authorizeAccess(owner, resource({ domain: 'seller', ownerUserId: 'merchant-2' }), { permission: 'seller:listing:write:tenant' }).code, 'ownership_denied');
  assert.equal(authorizeAccess(owner, resource({ domain: 'seller', jurisdiction: 'FR' }), { permission: 'seller:listing:write:tenant' }).code, 'jurisdiction_denied');
});

test('business trading requires separate verification, licence evidence and contract', () => {
  const buyer = principal({ role: 'distributor', businessAccountId: 'biz-1' });
  const tradeResource = resource({ domain: 'trade' });
  assert.equal(authorizeAccess(buyer, tradeResource, { permission: 'trade:rfq:write:tenant' }).code, 'business_verification_required');

  const pending = authorizeAccess({ ...buyer, businessVerification: { ...business, status: 'pending' } }, tradeResource, { permission: 'trade:rfq:write:tenant' });
  assert.equal(pending.code, 'business_verification_required');

  const noLicence = authorizeAccess({ ...buyer, businessVerification: { ...business, licenceEvidenceForJurisdiction: false } }, tradeResource, { permission: 'trade:rfq:write:tenant' });
  assert.equal(noLicence.code, 'licence_evidence_required');

  const noContract = authorizeAccess({ ...buyer, businessVerification: { ...business, activeContract: false } }, tradeResource, { permission: 'trade:order:write:tenant', amountUsd: 100 });
  assert.equal(noContract.code, 'active_contract_required');

  const noBuyer = authorizeAccess({ ...buyer, businessVerification: { ...business, namedAuthorisedBuyer: false } }, tradeResource, { permission: 'trade:order:write:tenant', amountUsd: 100 });
  assert.equal(noBuyer.code, 'authorised_buyer_required');
});

test('credit is server-derived and blocks over-limit or wrong-currency orders', () => {
  const buyer = principal({ role: 'distributor', businessAccountId: 'biz-1', businessVerification: business });
  const tradeResource = resource({ domain: 'trade' });
  assert.equal(availableBusinessCredit(business), 70_000);
  assert.equal(authorizeAccess(buyer, tradeResource, { permission: 'trade:order:write:tenant', amountUsd: 10_000, currency: 'USD' }).allowed, true);
  assert.equal(authorizeAccess(buyer, tradeResource, { permission: 'trade:order:write:tenant', amountUsd: 70_001, currency: 'USD' }).code, 'credit_limit_exceeded');
  assert.equal(authorizeAccess(buyer, tradeResource, { permission: 'trade:order:write:tenant', amountUsd: 100, currency: 'EUR' }).code, 'credit_currency_mismatch');
  assert.equal(authorizeAccess(buyer, tradeResource, { permission: 'trade:order:write:tenant', amountUsd: 25_000, currency: 'USD' }).code, 'approval_required');
});

test('Vault holdings require separate investor eligibility and trading remains blocked', () => {
  const vaultResource = resource({ domain: 'vault' });
  assert.equal(authorizeAccess(principal(), vaultResource, { permission: 'vault:holding:read:tenant' }).code, 'investor_eligibility_required');
  assert.equal(authorizeAccess(principal({ investorEligibility: { status: 'verified', tenantId: TENANT_A } }), vaultResource, { permission: 'vault:holding:read:tenant' }).allowed, true);
  assert.equal(authorizeAccess(principal({ investorEligibility: { status: 'verified', tenantId: TENANT_A } }), vaultResource, { permission: 'vault:trade:write:tenant' }).code, 'operation_blocked');
});

test('admin identity never bypasses commerce checks and needs distinct-approver elevation', () => {
  const adminResource = resource({ domain: 'admin' });
  const admin = principal({ role: 'admin', staff: { active: true, elevationValid: true, approverDistinct: true } });
  assert.equal(authorizeAccess(admin, adminResource, { permission: 'admin:audit:internal' }).allowed, true);
  assert.equal(authorizeAccess(admin, resource({ domain: 'trade' }), { permission: 'trade:order:write:tenant' }).code, 'permission_denied');
  assert.equal(authorizeAccess(principal({ role: 'admin', staff: { active: true, elevationValid: true, approverDistinct: false } }), adminResource, { permission: 'admin:audit:internal' }).code, 'admin_elevation_required');
});
