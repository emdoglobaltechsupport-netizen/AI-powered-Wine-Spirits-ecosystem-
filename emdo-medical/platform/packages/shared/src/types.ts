/** Canonical vocabulary shared by every EMDO service. */

export const ROLES = [
  'patient',
  'caregiver',
  'clinician',
  'clinic_admin',
  'hospital_admin',
  'pharmacist',
  'lab_professional',
  'employer_admin',
  'compliance_officer',
  'support',
  'auditor',
  'platform_admin',
  // M10 administrative roles. platform_admin remains a distinct technical role.
  'super_admin',
  'country_administrator',
  'operations_manager',
  'medical_director',
  'finance_manager',
  'doctor_verification_officer',
  'pharmacy_verification_officer',
  'laboratory_verification_officer',
  'customer_support_manager',
  'marketing_manager',
  'technical_administrator',
] as const;

export type Role = (typeof ROLES)[number];

export const CONSENT_PURPOSES = [
  'consultation',
  'referral',
  'second_opinion',
  'fulfilment',
  'emergency_break_glass',
] as const;

export type ConsentPurpose = (typeof CONSENT_PURPOSES)[number];

export const ACTION_CLASSES = ['A', 'B', 'C'] as const;
export type ActionClass = (typeof ACTION_CLASSES)[number];

export const COUNTRY_PROFILE_STATUSES = [
  'planned',
  'sandbox',
  'ready_for_review',
  'approved',
  'suspended',
  'retired',
] as const;
export type CountryProfileStatus = (typeof COUNTRY_PROFILE_STATUSES)[number];

export const PROVIDER_VERIFICATION_STATUSES = [
  'unverified',
  'submitted',
  'under_review',
  'verified',
  'rejected',
  'suspended',
  'revoked',
] as const;
export type ProviderVerificationStatus = (typeof PROVIDER_VERIFICATION_STATUSES)[number];

/** Data classification used by the PHI-safe audit sanitizer. */
export const DATA_CLASSIFICATIONS = ['public', 'personal', 'sensitive', 'phi'] as const;
export type DataClassification = (typeof DATA_CLASSIFICATIONS)[number];

/** M9 agent identifiers. All ten departments are registered; not all are enabled. */
export const AI_AGENT_IDS = [
  'patient_assistant',
  'doctor_documentation',
  'clinic_operations',
  'pharmacy_operations',
  'laboratory_operations',
  'customer_support',
  'finance_intelligence',
  'marketing',
  'compliance_monitoring',
  'ceo_executive',
] as const;
export type AiAgentId = (typeof AI_AGENT_IDS)[number];

export const AI_DATA_DOMAINS = ['none', 'non_phi', 'phi', 'commercial', 'regulated'] as const;
export type AiDataDomain = (typeof AI_DATA_DOMAINS)[number];

export const AI_OUTCOMES = ['answered', 'blocked', 'error', 'approval_requested', 'escalated'] as const;
export type AiOutcome = (typeof AI_OUTCOMES)[number];

/** Safety labels rendered on every AI response. */
export const AI_LABELS = {
  nonClinical: 'NON-CLINICAL INFORMATION — NOT MEDICAL ADVICE',
  draftReview: 'DRAFT — REQUIRES CLINICIAN REVIEW BEFORE USE',
  operational: 'OPERATIONAL DRAFT — NO CLINICAL OR FINAL DECISION',
} as const;
export type AiLabel = (typeof AI_LABELS)[keyof typeof AI_LABELS];

export const AI_REASON_CODES = [
  'documentation_review',
  'operational_review',
  'escalation_review',
  'patient_request',
  'policy_question',
] as const;
export type AiReasonCode = (typeof AI_REASON_CODES)[number];

/** M10 Insight administrative roles requested for the Super Admin estate. */
export const INSIGHT_ROLES = [
  'super_admin',
  'country_administrator',
  'operations_manager',
  'medical_director',
  'compliance_officer',
  'finance_manager',
  'doctor_verification_officer',
  'pharmacy_verification_officer',
  'laboratory_verification_officer',
  'customer_support_manager',
  'marketing_manager',
  'technical_administrator',
] as const;
export type InsightRole = (typeof INSIGHT_ROLES)[number];

export const INSIGHT_METRIC_IDS = [
  'M10-M001', 'M10-M002', 'M10-M003', 'M10-M004', 'M10-M005', 'M10-M006', 'M10-M007',
  'M10-M008', 'M10-M009', 'M10-M010', 'M10-M011', 'M10-M012', 'M10-M013', 'M10-M014',
] as const;
export type InsightMetricId = (typeof INSIGHT_METRIC_IDS)[number];

export const INSIGHT_EVIDENCE_STATUSES = [
  'AVAILABLE_TESTED',
  'AVAILABLE_WITH_CAVEAT',
  'PARTIAL_ONLY',
  'UNAVAILABLE_NO_SOURCE',
  'BLOCKED_BY_GOVERNANCE',
] as const;
export type InsightEvidenceStatus = (typeof INSIGHT_EVIDENCE_STATUSES)[number];

export const INSIGHT_SOURCE_STATUSES = [
  'AVAILABLE',
  'PARTIAL',
  'NO_SOURCE',
  'BLOCKED_BY_GOVERNANCE',
] as const;
export type InsightSourceStatus = (typeof INSIGHT_SOURCE_STATUSES)[number];

export const INSIGHT_REPORT_GROUPS = [
  'executive',
  'operations',
  'clinical_capacity',
  'finance',
  'growth',
  'ai_activity',
  'security_compliance',
  'expansion',
] as const;
export type InsightReportGroup = (typeof INSIGHT_REPORT_GROUPS)[number];

/**
 * Canonical least-privilege report-group matrix. Both the API and the Super
 * Admin portal consume this vocabulary; the API remains the enforcing boundary.
 * This never grants patient-record, decryption or PHI-join privileges.
 */
export const INSIGHT_ROLE_GROUPS: Readonly<Record<Role, readonly InsightReportGroup[]>> = {
  patient: [],
  caregiver: [],
  clinician: [],
  clinic_admin: [],
  hospital_admin: [],
  pharmacist: [],
  lab_professional: [],
  employer_admin: [],
  compliance_officer: ['security_compliance'],
  support: [],
  auditor: [],
  platform_admin: INSIGHT_REPORT_GROUPS,
  super_admin: INSIGHT_REPORT_GROUPS,
  country_administrator: ['operations', 'growth', 'ai_activity', 'security_compliance'],
  operations_manager: ['operations', 'ai_activity'],
  medical_director: ['clinical_capacity', 'operations'],
  finance_manager: ['finance'],
  doctor_verification_officer: ['clinical_capacity'],
  pharmacy_verification_officer: ['operations'],
  laboratory_verification_officer: ['clinical_capacity'],
  customer_support_manager: ['operations'],
  marketing_manager: ['growth'],
  technical_administrator: ['ai_activity', 'security_compliance'],
};

export const INSIGHT_REPORT_IDS = [
  'business_performance',
  'revenue_profitability',
  'customer_acquisition',
  'subscription_retention',
  'operational_bottlenecks',
  'country_performance',
  'risks',
  'opportunities',
  'management_recommendations',
] as const;
export type InsightReportId = (typeof INSIGHT_REPORT_IDS)[number];

export const INSIGHT_REPORT_CADENCES = ['daily', 'weekly', 'monthly'] as const;
export type InsightReportCadence = (typeof INSIGHT_REPORT_CADENCES)[number];

/** De-identification floor. Values below this count are withheld, never rounded or estimated. */
export const INSIGHT_MIN_GROUP_SIZE = 10;
