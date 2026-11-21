/**
 * Deny-by-default authorization helpers for B2C, B2B, Seller and Vault boundaries.
 *
 * These helpers are pure. The API must build the principal from an authenticated
 * session and pass server-owned verification/credit values; client-supplied
 * role, tenant, verification or credit claims are never accepted.
 */

export const COMMERCE_ROLES = ['customer', 'merchant', 'distributor', 'admin'] as const;
export type CommerceRole = (typeof COMMERCE_ROLES)[number];

export const ACCESS_DOMAINS = ['market', 'seller', 'trade', 'vault', 'admin'] as const;
export type AccessDomain = (typeof ACCESS_DOMAINS)[number];

export const ROLE_PERMISSIONS: Readonly<Record<CommerceRole, readonly string[]>> = Object.freeze({
  customer: ['market:browse:tenant', 'market:checkout:tenant', 'vault:holding:read:tenant'],
  merchant: [
    'seller:listing:write:tenant',
    'trade:supplier:read:tenant',
    'trade:rfq:read:tenant',
    'trade:rfq:write:tenant',
    'trade:quote:read:tenant',
    'trade:credit:read:tenant',
    'trade:order:write:tenant',
    'vault:holding:read:tenant',
  ],
  distributor: [
    'trade:supplier:read:tenant',
    'trade:rfq:read:tenant',
    'trade:rfq:write:tenant',
    'trade:quote:read:tenant',
    'trade:credit:read:tenant',
    'trade:order:write:tenant',
  ],
  admin: ['admin:*:internal'],
});

export const ALWAYS_DENIED_PERMISSIONS = Object.freeze([
  'vault:trade:write:tenant',
  'admin:bypass:commerce',
]);

export const BUSINESS_VERIFIED_STATUSES = Object.freeze(['verified']);
export const BUSINESS_VERIFIED_KYC_TIERS = Object.freeze(['verified', 'enhanced']);
export const UNPREFIXED_VERIFICATION_STATUSES = Object.freeze(['pending', 'unverified', 'rejected', 'expired']);

/** Simulated prototype approval threshold; production values are jurisdiction-specific. */
export const WHOLESALE_ORDER_APPROVAL_USD = 25_000;

export interface BusinessVerification {
  status: string;
  kycTier: string;
  tenantId: string;
  jurisdictions: readonly string[];
  licenceJurisdictions: readonly string[];
  activeContract: boolean;
  licenceEvidenceForJurisdiction: boolean;
  namedAuthorisedBuyer: boolean;
  creditLimit: number;
  creditUsed: number;
  reservedCredit: number;
  creditCurrency: string;
}

export interface InvestorEligibility {
  status: string;
  tenantId: string;
}

export interface StaffAuthorization {
  active: boolean;
  elevationValid: boolean;
  approverDistinct: boolean;
}

export interface AccessPrincipal {
  userId: string;
  tenantId: string;
  role: string;
  jurisdictions: readonly string[];
  ageVerified: boolean;
  businessAccountId?: string | null;
  businessVerification?: BusinessVerification | null;
  investorEligibility?: InvestorEligibility | null;
  staff?: StaffAuthorization | null;
}

export interface AccessResource {
  tenantId: string;
  jurisdiction: string;
  domain: AccessDomain;
  ownerUserId?: string | null;
  ownerBusinessAccountId?: string | null;
}

export interface AuthorizationRequest {
  permission: string;
  amountUsd?: number;
  currency?: string;
}

export interface AuthorizationDecision {
  allowed: boolean;
  code:
    | 'allowed'
    | 'unknown_role'
    | 'unknown_permission'
    | 'permission_denied'
    | 'domain_mismatch'
    | 'cross_tenant'
    | 'jurisdiction_denied'
    | 'ownership_denied'
    | 'age_verification_required'
    | 'business_verification_required'
    | 'licence_evidence_required'
    | 'active_contract_required'
    | 'authorised_buyer_required'
    | 'credit_limit_exceeded'
    | 'credit_currency_mismatch'
    | 'investor_eligibility_required'
    | 'admin_elevation_required'
    | 'approval_required'
    | 'operation_blocked';
  reason: string;
  requiredPermission: string;
}

function deny(code: AuthorizationDecision['code'], reason: string, permission: string): AuthorizationDecision {
  return { allowed: false, code, reason, requiredPermission: permission };
}

function upper(value: string): string {
  return value.toUpperCase();
}

function permissionDomain(permission: string): AccessDomain | null {
  const prefix = permission.split(':')[0] ?? '';
  return (ACCESS_DOMAINS as readonly string[]).includes(prefix) ? (prefix as AccessDomain) : null;
}

function hasTenantJurisdiction(principal: AccessPrincipal, jurisdiction: string): boolean {
  return principal.jurisdictions.map(upper).includes(upper(jurisdiction));
}

/**
 * Authorize one tenant/jurisdiction/transaction-specific operation.
 * Every unrecognised value fails closed.
 */
export function authorizeAccess(
  principal: AccessPrincipal,
  resource: AccessResource,
  request: AuthorizationRequest,
): AuthorizationDecision {
  const { permission } = request;
  const domain = permissionDomain(permission);

  if (!domain) {
    return deny('unknown_permission', 'Unknown permission domain.', permission);
  }
  if (ALWAYS_DENIED_PERMISSIONS.includes(permission)) {
    return deny('operation_blocked', 'This operation is blocked in the prototype.', permission);
  }
  if (!(COMMERCE_ROLES as readonly string[]).includes(principal.role)) {
    return deny('unknown_role', 'Unknown commerce role.', permission);
  }
  const role = principal.role as CommerceRole;
  if (!ROLE_PERMISSIONS[role].includes(permission) && !ROLE_PERMISSIONS[role].includes('admin:*:internal')) {
    return deny('permission_denied', 'Role does not grant this permission.', permission);
  }
  if (domain !== resource.domain) {
    return deny('domain_mismatch', 'Permission does not match the resource domain.', permission);
  }
  if (!principal.tenantId || principal.tenantId !== resource.tenantId) {
    return deny('cross_tenant', 'Resource belongs to a different tenant.', permission);
  }
  if (!resource.jurisdiction || !hasTenantJurisdiction(principal, resource.jurisdiction)) {
    return deny('jurisdiction_denied', 'Principal is not permitted in this jurisdiction.', permission);
  }
  if (resource.ownerUserId && resource.ownerUserId !== principal.userId) {
    return deny('ownership_denied', 'Resource is owned by another principal.', permission);
  }
  if (resource.ownerBusinessAccountId && resource.ownerBusinessAccountId !== principal.businessAccountId) {
    return deny('ownership_denied', 'Resource is owned by another business account.', permission);
  }

  if (role === 'admin') {
    if (domain !== 'admin') {
      return deny('permission_denied', 'Admin identity cannot act as a commerce principal.', permission);
    }
    const staff = principal.staff;
    if (!staff?.active || !staff.elevationValid || !staff.approverDistinct) {
      return deny('admin_elevation_required', 'Valid elevation with a distinct approver is required.', permission);
    }
    return { allowed: true, code: 'allowed', reason: 'Internal admin authorization passed.', requiredPermission: permission };
  }

  if (domain === 'market' && permission === 'market:checkout:tenant') {
    if (!principal.ageVerified) {
      return deny('age_verification_required', 'Verified age is required before checkout.', permission);
    }
  }

  if (domain === 'trade') {
    const verification = principal.businessVerification;
    if (
      !verification ||
      !BUSINESS_VERIFIED_STATUSES.includes(verification.status) ||
      !BUSINESS_VERIFIED_KYC_TIERS.includes(verification.kycTier) ||
      UNPREFIXED_VERIFICATION_STATUSES.includes(verification.status) ||
      verification.tenantId !== principal.tenantId
    ) {
      return deny('business_verification_required', 'Separate business verification is required to trade.', permission);
    }
    if (!verification.jurisdictions.map(upper).includes(upper(resource.jurisdiction))) {
      return deny('jurisdiction_denied', 'Business is not verified for this jurisdiction.', permission);
    }
    if (
      !verification.licenceEvidenceForJurisdiction ||
      !verification.licenceJurisdictions.map(upper).includes(upper(resource.jurisdiction))
    ) {
      return deny('licence_evidence_required', 'Licence evidence is required for this jurisdiction.', permission);
    }
    if (permission === 'trade:order:write:tenant') {
      if (!verification.activeContract) {
        return deny('active_contract_required', 'An active trade contract is required.', permission);
      }
      if (!verification.namedAuthorisedBuyer) {
        return deny('authorised_buyer_required', 'A named authorised buyer is required.', permission);
      }
      if (request.amountUsd !== undefined) {
        if (!Number.isFinite(request.amountUsd) || request.amountUsd < 0) {
          return deny('credit_limit_exceeded', 'Trade amount is invalid.', permission);
        }
        if (request.currency && upper(request.currency) !== upper(verification.creditCurrency)) {
          return deny('credit_currency_mismatch', 'Credit limit currency does not match the order.', permission);
        }
        const availableCredit = verification.creditLimit - verification.creditUsed - verification.reservedCredit;
        if (request.amountUsd > availableCredit) {
          return deny('credit_limit_exceeded', 'Order exceeds available credit.', permission);
        }
        if (request.amountUsd >= WHOLESALE_ORDER_APPROVAL_USD) {
          return deny('approval_required', 'Orders at or above the threshold require separate business approval.', permission);
        }
      }
    }
  }

  if (domain === 'seller' && role !== 'merchant') {
    return deny('permission_denied', 'Only a merchant tenant may write listings.', permission);
  }

  if (domain === 'vault' && permission === 'vault:holding:read:tenant') {
    const eligibility = principal.investorEligibility;
    if (!eligibility || eligibility.status !== 'verified' || eligibility.tenantId !== principal.tenantId) {
      return deny('investor_eligibility_required', 'Separate investor eligibility is required.', permission);
    }
  }

  return { allowed: true, code: 'allowed', reason: 'Authorization passed.', requiredPermission: permission };
}

export function availableBusinessCredit(verification: BusinessVerification): number {
  return Math.max(0, verification.creditLimit - verification.creditUsed - verification.reservedCredit);
}
