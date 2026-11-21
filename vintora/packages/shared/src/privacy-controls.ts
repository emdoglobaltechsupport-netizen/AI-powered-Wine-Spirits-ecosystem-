/**
 * Purpose-limited privacy controls for AI personalization.
 *
 * This is a pure evaluator. It does not export, delete or profile anything.
 * The authoritative machine-readable register is
 * config/privacy-consent-policy.json; scripts/check-privacy-consent-policy.mjs
 * checks these constants against it. Prototype defaults are off: every optional
 * purpose needs an explicit, versioned, unwithdrawn opt-in and only the data
 * categories declared for that purpose may be used.
 */

export const PRIVACY_POLICY_VERSION = 'v1';
export const PERSONALIZATION_ENABLED = false;
export const CLOSED_LOOP_PERSONALIZATION_ENABLED = false;
export const DPIA_COMPLETED = false;
export const RETENTION_ENFORCED = false;
export const AUTOMATED_DELETION_ENABLED = false;

export const PRIVACY_PURPOSES = [
  'recommendations',
  'closed_loop_personalization',
  'marketing',
  'experimentation',
] as const;
export type PrivacyPurpose = (typeof PRIVACY_PURPOSES)[number];

export const PERSONAL_DATA_CATEGORIES = [
  'taste_profile',
  'catalogue_interactions',
  'purchase_history',
  'consumption_events',
  'email_engagement',
  'experiment_exposure',
  'analytics_identity',
  'age_verified_region',
  'age_documents',
  'regulated_identity',
  'kyc_log',
  'custody_record',
  'transaction_record',
  'ai_interaction_log',
  'marketing_audience',
  'health_adjacent',
  'precise_location',
  'biometric',
] as const;
export type PersonalDataCategory = (typeof PERSONAL_DATA_CATEGORIES)[number];

export interface PrivacyPurposeConfig {
  readonly description: string;
  readonly allowedData: readonly PersonalDataCategory[];
  readonly deniedData: readonly PersonalDataCategory[];
  readonly retentionDays: number;
  readonly requiresOptIn: boolean;
  readonly requiresDpia?: boolean;
}

/** Per-purpose data boundaries. Cross-purpose reuse is denied by design. */
export const PRIVACY_PURPOSE_CONFIG: Readonly<Record<PrivacyPurpose, PrivacyPurposeConfig>> = Object.freeze({
  recommendations: {
    description: 'On-device or tenant-scoped pairing suggestions from explicit taste signals.',
    allowedData: ['taste_profile', 'catalogue_interactions'],
    deniedData: ['purchase_history', 'consumption_events', 'health_adjacent', 'precise_location', 'age_documents', 'biometric'],
    retentionDays: 90,
    requiresOptIn: true,
  },
  closed_loop_personalization: {
    description: 'Future adaptive model; disabled in the prototype and DPIA-gated.',
    allowedData: ['taste_profile', 'purchase_history'],
    deniedData: ['consumption_events', 'health_adjacent', 'precise_location', 'age_documents', 'biometric'],
    retentionDays: 365,
    requiresOptIn: true,
    requiresDpia: true,
  },
  marketing: {
    description: 'Campaign audience selection and message testing.',
    allowedData: ['email_engagement', 'age_verified_region', 'marketing_audience'],
    deniedData: ['taste_profile', 'purchase_history', 'consumption_events', 'health_adjacent', 'precise_location', 'age_documents', 'regulated_identity', 'kyc_log', 'custody_record'],
    retentionDays: 180,
    requiresOptIn: true,
  },
  experimentation: {
    description: 'Aggregated or pseudonymous product experiments.',
    allowedData: ['experiment_exposure', 'catalogue_interactions', 'analytics_identity'],
    deniedData: ['taste_profile', 'purchase_history', 'consumption_events', 'health_adjacent', 'precise_location', 'age_documents', 'regulated_identity', 'kyc_log', 'custody_record'],
    retentionDays: 30,
    requiresOptIn: true,
  },
});

/** These categories are never available for profiling, regardless of consent. */
export const SENSITIVE_DATA_CATEGORIES: readonly PersonalDataCategory[] = Object.freeze([
  'health_adjacent',
  'precise_location',
  'biometric',
  'age_documents',
  'regulated_identity',
  'kyc_log',
  'custody_record',
  'consumption_events',
]);

export const PRIVACY_AUDIT_FIELDS: readonly string[] = Object.freeze([
  'correlationId', 'tenantId', 'actorUserId', 'purpose', 'dataCategory',
  'action', 'decision', 'reasonCode', 'reason', 'occurredAt',
]);

export type ConsentState = 'opt_in' | 'withdraw';

export interface ConsentRecord {
  readonly purpose: PrivacyPurpose;
  readonly state: ConsentState;
  readonly policyVersion: string;
  readonly recordedAt: string;
  readonly locale?: string;
}

export type ConsentMap = Partial<Record<PrivacyPurpose, ConsentRecord>>;

export interface PersonalDataUseRequest {
  readonly correlationId: string;
  readonly tenantId: string;
  readonly actorUserId: string;
  readonly purpose: PrivacyPurpose;
  readonly dataCategory: PersonalDataCategory;
  readonly consents: ConsentMap;
  readonly collectedAt?: Date | string | null;
  readonly noticeVersion?: string;
}

export type PersonalDataUseDecisionCode =
  | 'allowed'
  | 'unknown_purpose'
  | 'unknown_data_category'
  | 'missing_context'
  | 'sensitive_data_denied'
  | 'closed_loop_disabled'
  | 'dpia_required'
  | 'retention_expired'
  | 'purpose_not_allowed'
  | 'consent_required'
  | 'consent_withdrawn'
  | 'consent_version_mismatch';

export interface PersonalDataUseDecision {
  allowed: boolean;
  code: PersonalDataUseDecisionCode;
  reason: string;
  requiresAlert: boolean;
  advisoryOnly: true;
  audit: Record<string, unknown>;
}

function decision(
  code: PersonalDataUseDecisionCode,
  reason: string,
  request: PersonalDataUseRequest,
): PersonalDataUseDecision {
  return {
    allowed: code === 'allowed',
    code,
    reason,
    requiresAlert: false,
    advisoryOnly: true,
    audit: {
      correlationId: request.correlationId,
      tenantId: request.tenantId,
      actorUserId: request.actorUserId,
      purpose: request.purpose,
      dataCategory: request.dataCategory,
      action: 'personal_data_use',
      decision: code === 'allowed' ? 'allowed' : 'denied',
      reasonCode: code,
      reason,
      occurredAt: new Date().toISOString(),
    },
  };
}

/**
 * Evaluate one proposed personal-data use. Unknown purposes, unknown data,
 * missing context, sensitive categories, disabled closed-loop profiling and
 * absent/withdrawn/stale consent all fail closed.
 */
export function evaluatePersonalDataUse(request: PersonalDataUseRequest): PersonalDataUseDecision {
  if (!(PRIVACY_PURPOSES as readonly string[]).includes(request.purpose)) {
    return decision('unknown_purpose', 'Purpose is not in the consent register.', request);
  }
  if (!(PERSONAL_DATA_CATEGORIES as readonly string[]).includes(request.dataCategory)) {
    return decision('unknown_data_category', 'Data category is not in the inventory.', request);
  }
  if (!request.correlationId || !request.tenantId || !request.actorUserId) {
    return decision('missing_context', 'Correlation, tenant and subject identity are required.', request);
  }
  if (SENSITIVE_DATA_CATEGORIES.includes(request.dataCategory)) {
    return decision('sensitive_data_denied', 'Sensitive or health-adjacent data is never used for profiling.', request);
  }

  const config = PRIVACY_PURPOSE_CONFIG[request.purpose];
  if (request.purpose === 'closed_loop_personalization') {
    return decision('closed_loop_disabled', 'Closed-loop personalization is disabled in the prototype.', request);
  }
  if (config.requiresDpia && !DPIA_COMPLETED) {
    return decision('dpia_required', 'A completed DPIA is required before this purpose may run.', request);
  }
  if (!config.allowedData.includes(request.dataCategory) || config.deniedData.includes(request.dataCategory)) {
    return decision('purpose_not_allowed', 'Data category is outside this purpose boundary.', request);
  }

  if (request.collectedAt) {
    const collected = request.collectedAt instanceof Date
      ? request.collectedAt
      : new Date(request.collectedAt);
    if (!Number.isNaN(collected.getTime())) {
      const ageDays = (Date.now() - collected.getTime()) / 86_400_000;
      if (ageDays > config.retentionDays) {
        return decision('retention_expired', 'Data is beyond the purpose retention schedule.', request);
      }
    }
  }

  const consent = request.consents[request.purpose];
  if (!consent || consent.state !== 'opt_in') {
    const code = consent?.state === 'withdraw' ? 'consent_withdrawn' : 'consent_required';
    return decision(code, 'This purpose is off until the subject opts in.', request);
  }
  if (consent.policyVersion !== PRIVACY_POLICY_VERSION || request.noticeVersion !== PRIVACY_POLICY_VERSION) {
    return decision('consent_version_mismatch', 'Consent or notice version does not match the active policy.', request);
  }

  return decision('allowed', 'Purpose-limited use permitted by explicit consent.', request);
}
