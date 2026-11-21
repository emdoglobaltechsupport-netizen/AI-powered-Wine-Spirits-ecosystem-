/**
 * Responsible-drinking guardrails for recommendation, marketing and checkout
 * surfaces. Pure policy evaluator; it does not approve an order or a campaign.
 * The authoritative register is config/responsible-drinking-policy.json.
 */

export const RESPONSIBLE_DRINKING_POLICY_VERSION = 'v1';
export const MAX_SUGGESTIONS_PER_ANSWER = 3;
export const MAX_BOTTLES_PER_SUGGESTION_SET = 6;
export const MAX_BOTTLES_PER_ORDER = 6;
export const MAX_BOTTLES_24H = 12;
export const MAX_BOTTLES_7D = 24;
export const MAX_PROMO_EMAILS_PER_WEEK = 3;
export const MAX_PROMO_PUSHES_PER_DAY = 2;
export const MAX_AGE_EVIDENCE_HOURS = 720;
export const SUPPRESSION_PROPAGATION_HOURS = 24;

import { RESPONSIBLE_DRINKING_NOTICE } from './ai-safety.js';

export const RESPONSIBLE_DRINKING_SUPPORT_NOTICE =
  'If alcohol use is a concern, pause and contact a local support service or a healthcare professional.';

export const HARM_SIGNAL_PATTERNS = Object.freeze([
  'binge', 'get drunk', 'intoxicated', 'hangover cure', 'drink until',
  'for kids', 'for children', 'underage', 'recovery', 'alcohol problem',
] as const);

export const DENIED_TARGETING_SEGMENTS = Object.freeze([
  'underage', 'age_unknown', 'harmful_use_inferred', 'self_excluded',
  'recovery_seeking', 'health_adjacent',
] as const);

export const REVERIFICATION_TRIGGERS = Object.freeze([
  'evidence_expired', 'country_changed', 'document_mismatch',
  'age_threshold_changed', 'supervisor_override',
] as const);

export const RESPONSIBLE_DRINKING_AUDIT_FIELDS = Object.freeze([
  'correlationId', 'surface', 'action', 'decision',
  'reasonCode', 'reason', 'noticeVersion', 'occurredAt',
] as const);

export type ResponsibleDrinkingSurface = 'recommendation' | 'marketing' | 'checkout';
export type AgeGateState = 'verified' | 'checkout_only' | 'unknown';

export interface ResponsibleDrinkingRequest {
  readonly correlationId: string;
  readonly surface: ResponsibleDrinkingSurface;
  readonly ageGateState: AgeGateState;
  readonly suggestionCount?: number;
  readonly quantity?: number;
  readonly priorBottles24h?: number;
  readonly priorBottles7d?: number;
  readonly promoEmailsThisWeek?: number;
  readonly promoPushesToday?: number;
  readonly audienceSegments?: readonly string[];
  readonly harmSignals?: readonly string[];
  readonly supportNotice?: string | null;
  readonly ageEvidenceHours?: number | null;
  readonly reverificationTrigger?: string | null;
}

export type ResponsibleDrinkingDecisionCode =
  | 'allowed'
  | 'allowed_with_support_notice'
  | 'missing_context'
  | 'harmful_use_signal'
  | 'minor_targeting_denied'
  | 'recommendation_limit_exceeded'
  | 'purchase_limit_exceeded'
  | 'frequency_limit_exceeded'
  | 'age_evidence_expired'
  | 'age_gate_required'
  | 'support_notice_required';

export interface ResponsibleDrinkingDecision {
  readonly allowed: boolean;
  readonly code: ResponsibleDrinkingDecisionCode;
  readonly reason: string;
  readonly notice: string;
  readonly supportNotice: string | null;
  readonly requiresHumanReview: boolean;
  readonly advisoryOnly: true;
  readonly audit: Record<string, unknown>;
}

const SURFACES: readonly string[] = ['recommendation', 'marketing', 'checkout'];
const AGE_STATES: readonly string[] = ['verified', 'checkout_only', 'unknown'];

function decision(
  code: ResponsibleDrinkingDecisionCode,
  reason: string,
  request: ResponsibleDrinkingRequest,
  supportNotice: string | null = null,
): ResponsibleDrinkingDecision {
  return {
    allowed: code.startsWith('allowed'),
    code,
    reason,
    notice: RESPONSIBLE_DRINKING_NOTICE,
    supportNotice,
    requiresHumanReview: ['harmful_use_signal', 'purchase_limit_exceeded'].includes(code),
    advisoryOnly: true,
    audit: {
      correlationId: request.correlationId,
      surface: request.surface,
      action: `${request.surface}_responsible_drinking_screen`,
      decision: code.startsWith('allowed') ? 'allowed' : 'denied',
      reasonCode: code,
      reason,
      noticeVersion: RESPONSIBLE_DRINKING_POLICY_VERSION,
      occurredAt: new Date().toISOString(),
    },
  };
}

/** Detects harmful-use phrases in untrusted query or creative text. */
export function detectHarmSignals(text: string): string[] {
  const value = text.trim().toLowerCase();
  return HARM_SIGNAL_PATTERNS.filter((pattern) => value.includes(pattern));
}

/** Screens one action against prototype responsible-drinking limits. */
export function evaluateResponsibleDrinking(request: ResponsibleDrinkingRequest): ResponsibleDrinkingDecision {
  if (!request.correlationId || !SURFACES.includes(request.surface) || !AGE_STATES.includes(request.ageGateState)) {
    return decision('missing_context', 'Correlation, recognised surface and age-gate state are required.', request);
  }
  if (request.ageGateState === 'unknown') {
    return decision('age_gate_required', 'Age-gate state is unknown; no alcohol-related action is permitted.', request);
  }
  if (request.ageEvidenceHours != null && request.ageEvidenceHours > MAX_AGE_EVIDENCE_HOURS) {
    return decision('age_evidence_expired', 'Age evidence is beyond the 720-hour re-verification window.', request);
  }
  if (request.reverificationTrigger && (REVERIFICATION_TRIGGERS as readonly string[]).includes(request.reverificationTrigger)) {
    return decision('age_evidence_expired', 'A re-verification trigger requires fresh age evidence.', request);
  }
  const harm = [...(request.harmSignals ?? []), ...detectHarmSignals((request.harmSignals ?? []).join(' '))];
  if (harm.length) {
    return decision(
      'harmful_use_signal',
      'Harmful-use or minor-targeting language blocks the recommendation or campaign.',
      request,
      RESPONSIBLE_DRINKING_SUPPORT_NOTICE,
    );
  }
  const segments = (request.audienceSegments ?? []).map((segment) => segment.trim().toLowerCase());
  if (segments.some((segment) => (DENIED_TARGETING_SEGMENTS as readonly string[]).includes(segment))) {
    return decision('minor_targeting_denied', 'Audience includes a protected or harmful-use-inferred segment.', request);
  }
  if ((request.suggestionCount ?? 0) > MAX_SUGGESTIONS_PER_ANSWER ||
      (request.quantity ?? 0) > MAX_BOTTLES_PER_SUGGESTION_SET) {
    return decision(
      'recommendation_limit_exceeded',
      'Recommendation count or suggested quantity exceeds the prototype guardrail.',
      request,
    );
  }
  if ((request.quantity ?? 0) > MAX_BOTTLES_PER_ORDER ||
      (request.priorBottles24h ?? 0) + (request.quantity ?? 0) > MAX_BOTTLES_24H ||
      (request.priorBottles7d ?? 0) + (request.quantity ?? 0) > MAX_BOTTLES_7D) {
    return decision('purchase_limit_exceeded', 'Prototype purchase velocity limit exceeded; human review required.', request);
  }
  if ((request.promoEmailsThisWeek ?? 0) > MAX_PROMO_EMAILS_PER_WEEK ||
      (request.promoPushesToday ?? 0) > MAX_PROMO_PUSHES_PER_DAY) {
    return decision('frequency_limit_exceeded', 'Promotional frequency cap exceeded.', request);
  }
  if (request.surface !== 'checkout' && request.supportNotice !== RESPONSIBLE_DRINKING_SUPPORT_NOTICE) {
    return decision('support_notice_required', 'Customer-facing actions require the support-resource notice.', request);
  }
  return decision('allowed_with_support_notice', 'Action is within prototype responsible-drinking limits.', request, RESPONSIBLE_DRINKING_SUPPORT_NOTICE);
}
