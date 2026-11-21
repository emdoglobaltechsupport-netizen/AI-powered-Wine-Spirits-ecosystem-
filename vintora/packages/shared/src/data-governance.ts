/**
 * Data inventory, lawful-basis, lifecycle and transfer gates.
 *
 * Pure evaluator only. It does not collect, export, delete or transfer data.
 * The authoritative register is config/data-governance-policy.json, checked by
 * scripts/check-data-governance.mjs. Regulated identity records and analytics
 * identities are separate domains and can never be joined in the prototype.
 */
import {
  evaluatePersonalDataUse,
  PERSONAL_DATA_CATEGORIES,
  PRIVACY_PURPOSES,
  type ConsentMap,
  type PersonalDataCategory,
  type PrivacyPurpose,
} from './privacy-controls.js';

export const DATA_GOVERNANCE_POLICY_VERSION = 'v1';
export const CROSS_BORDER_TRANSFERS_ENABLED = false;
export const CROSS_DOMAIN_JOIN_ALLOWED = false;
export const DATA_RETENTION_ENFORCED = false;
export const WITHDRAWAL_PROPAGATION_COMPLETED = false;

export const LAWFUL_BASES = Object.freeze([
  'consent',
  'contract',
  'legal_obligation',
  'legitimate_interests',
] as const);
export type LawfulBasis = (typeof LAWFUL_BASES)[number];

export const INTERNAL_AUDIT_PURPOSES = Object.freeze([
  'legal_compliance_hold',
  'ai_safety_audit',
] as const);
export type InternalAuditPurpose = (typeof INTERNAL_AUDIT_PURPOSES)[number];
export type DataGovernancePurpose = PrivacyPurpose | InternalAuditPurpose;

export const DATA_IDENTITY_DOMAINS = Object.freeze({
  analytics: [
    'catalogue_interactions', 'email_engagement', 'experiment_exposure',
    'analytics_identity', 'precise_location', 'marketing_audience',
  ],
  regulated: ['age_documents', 'regulated_identity', 'kyc_log', 'custody_record', 'biometric'],
  commerce: [
    'taste_profile', 'purchase_history', 'consumption_events',
    'age_verified_region', 'transaction_record', 'health_adjacent',
  ],
  audit: ['ai_interaction_log'],
} as const);
export type DataIdentityDomain = keyof typeof DATA_IDENTITY_DOMAINS;

export const DATA_LIFECYCLE = Object.freeze({
  aiLogDays: 90,
  transactionRecordDays: 2555,
  kycLogDays: 2190,
  custodyRecordDays: 3650,
  marketingAudienceDays: 180,
  enforced: false,
  legalHoldModel: 'required-not-implemented',
} as const);

export const DATA_GOVERNANCE_WORKFLOWS = Object.freeze({
  export: 'POST /v1/privacy/export',
  deletion: 'POST /v1/privacy/deletion-request',
  optOut: 'POST /v1/privacy/consents',
  revocation: 'withdraw; propagation required within 24 hours; not executed',
} as const);

export const DATA_GOVERNANCE_AUDIT_FIELDS = Object.freeze([
  'correlationId', 'tenantId', 'actorUserId', 'purpose', 'dataCategory',
  'action', 'decision', 'reasonCode', 'reason', 'occurredAt',
] as const);

export interface CrossBorderDescriptor {
  readonly targetRegion: string;
  readonly mechanism?: string | null;
  readonly transferImpactAssessmentRef?: string | null;
}

export interface DataGovernanceRequest {
  readonly correlationId: string;
  readonly tenantId: string;
  readonly actorUserId: string;
  readonly purpose: DataGovernancePurpose;
  readonly dataCategory: PersonalDataCategory;
  readonly lawfulBasis: LawfulBasis;
  readonly consents?: ConsentMap | null;
  readonly identityDomain?: DataIdentityDomain | null;
  readonly crossDomainJoin?: boolean;
  readonly crossBorder?: CrossBorderDescriptor | null;
  readonly collectedAt?: Date | string | null;
  readonly noticeVersion?: string;
}

export type DataGovernanceDecisionCode =
  | 'allowed_advisory'
  | 'unknown_purpose'
  | 'unknown_data_category'
  | 'missing_context'
  | 'lawful_basis_required'
  | 'lawful_basis_mismatch'
  | 'internal_purpose_blocked'
  | 'consent_denied'
  | 'cross_domain_join_denied'
  | 'identity_domain_mismatch'
  | 'cross_border_transfer_disabled';

export interface DataGovernanceDecision {
  readonly allowed: boolean;
  readonly code: DataGovernanceDecisionCode;
  readonly reason: string;
  readonly advisoryOnly: true;
  readonly audit: Record<string, unknown>;
}

const isPurpose = (value: string): value is DataGovernancePurpose =>
  (PRIVACY_PURPOSES as readonly string[]).includes(value) ||
  (INTERNAL_AUDIT_PURPOSES as readonly string[]).includes(value);

const isCategory = (value: string): value is PersonalDataCategory =>
  (PERSONAL_DATA_CATEGORIES as readonly string[]).includes(value);

function decision(
  code: DataGovernanceDecisionCode,
  reason: string,
  request: DataGovernanceRequest,
): DataGovernanceDecision {
  return {
    allowed: code === 'allowed_advisory',
    code,
    reason,
    advisoryOnly: true,
    audit: {
      correlationId: request.correlationId,
      tenantId: request.tenantId,
      actorUserId: request.actorUserId,
      purpose: request.purpose,
      dataCategory: request.dataCategory,
      action: 'data_governance_use',
      decision: code === 'allowed_advisory' ? 'allowed' : 'denied',
      reasonCode: code,
      reason,
      occurredAt: new Date().toISOString(),
    },
  };
}

const LAWFUL_BASIS_BY_PURPOSE_CATEGORY: Readonly<Record<string, LawfulBasis>> = Object.freeze({
  'recommendations:taste_profile': 'consent',
  'recommendations:catalogue_interactions': 'consent',
  'closed_loop_personalization:purchase_history': 'consent',
  'marketing:email_engagement': 'consent',
  'marketing:age_verified_region': 'legal_obligation',
  'marketing:marketing_audience': 'consent',
  'experimentation:experiment_exposure': 'legitimate_interests',
  'experimentation:analytics_identity': 'legitimate_interests',
  'experimentation:catalogue_interactions': 'legitimate_interests',
  'legal_compliance_hold:age_documents': 'legal_obligation',
  'legal_compliance_hold:regulated_identity': 'legal_obligation',
  'legal_compliance_hold:kyc_log': 'legal_obligation',
  'legal_compliance_hold:custody_record': 'legal_obligation',
  'legal_compliance_hold:transaction_record': 'legal_obligation',
  'ai_safety_audit:ai_interaction_log': 'legitimate_interests',
});

/** Evaluates one proposed data use. All prototype transfers and joins fail closed. */
export function evaluateDataGovernanceUse(request: DataGovernanceRequest): DataGovernanceDecision {
  if (!isPurpose(request.purpose)) {
    return decision('unknown_purpose', 'Purpose is not in the data-governance register.', request);
  }
  if (!isCategory(request.dataCategory)) {
    return decision('unknown_data_category', 'Data category is not in the inventory.', request);
  }
  if (!request.correlationId || !request.tenantId || !request.actorUserId) {
    return decision('missing_context', 'Correlation, tenant and actor identity are required.', request);
  }
  if (!(LAWFUL_BASES as readonly string[]).includes(request.lawfulBasis)) {
    return decision('lawful_basis_required', 'A registered lawful basis is required.', request);
  }
  if (LAWFUL_BASIS_BY_PURPOSE_CATEGORY[`${request.purpose}:${request.dataCategory}`] !== request.lawfulBasis) {
    return decision('lawful_basis_mismatch', 'Lawful basis does not match the purpose/category register.', request);
  }
  if (request.crossBorder) {
    return decision('cross_border_transfer_disabled', 'Cross-border transfers are disabled in the prototype.', request);
  }
  if (request.crossDomainJoin) {
    return decision('cross_domain_join_denied', 'Analytics and regulated identity domains may not be joined.', request);
  }
  const domains = Object.entries(DATA_IDENTITY_DOMAINS) as Array<[DataIdentityDomain, readonly string[]]>;
  const registeredDomain = domains.find(([, categories]) => categories.includes(request.dataCategory))?.[0];
  if (request.identityDomain && request.identityDomain !== registeredDomain) {
    return decision('identity_domain_mismatch', 'Declared identity domain conflicts with the inventory.', request);
  }
  if ((INTERNAL_AUDIT_PURPOSES as readonly string[]).includes(request.purpose)) {
    return decision('internal_purpose_blocked', 'Internal audit or compliance-hold use requires attached evidence; none exists.', request);
  }
  const privacy = evaluatePersonalDataUse({
    correlationId: request.correlationId,
    tenantId: request.tenantId,
    actorUserId: request.actorUserId,
    purpose: request.purpose as PrivacyPurpose,
    dataCategory: request.dataCategory,
    consents: request.consents ?? {},
    collectedAt: request.collectedAt,
    noticeVersion: request.noticeVersion,
  });
  if (!privacy.allowed) {
    return decision('consent_denied', privacy.reason, request);
  }
  return decision('allowed_advisory', 'Purpose-limited advisory use permitted by the prototype register.', request);
}
