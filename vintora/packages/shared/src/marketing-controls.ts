/**
 * Human-release controls for AI-generated marketing.
 *
 * This is a pure evaluator. It never publishes, sends, bids or changes a live
 * budget. The authoritative machine-readable register is
 * config/marketing-release-policy.json; scripts/check-marketing-release-policy.mjs
 * checks these constants against it. Draft advice is allowed within a fact and
 * audience envelope; release and budget increases are always blocked in the
 * prototype, even with complete approval evidence.
 */

export const MARKETING_RELEASE_ENABLED = false;
export const MARKETING_HUMAN_APPROVAL_REQUIRED = true;
export const MARKETING_DISTINCT_APPROVER_REQUIRED = true;
export const MARKETING_REVENUE_CAP = 0.08;
export const MARKETING_MAX_INCREASE_PERCENT = 0;
export const MARKETING_REASON_MIN_LENGTH = 8;
export const MARKETING_DEFAULT_OUTCOME = 'draft' as const;

export const MARKETING_ACTIONS = ['draft', 'release', 'pause', 'rollback', 'budget_increase'] as const;
export type MarketingAction = (typeof MARKETING_ACTIONS)[number];

export const DENIED_GEOGRAPHIES: readonly string[] = Object.freeze([
  'UNVERIFIED', 'SANCTIONED', 'BLOCKED_BY_COUNSEL',
]);
export const DENIED_AUDIENCE_SEGMENTS: readonly string[] = Object.freeze([
  'underage', 'age_unknown', 'health_adjacent', 'recovery_seeking', 'sensitive_category',
]);
export const DENIED_CLAIM_PATTERNS: readonly string[] = Object.freeze([
  'health', 'medical', 'safe drinking', 'guaranteed', 'investment return',
  'cure', 'unverified award', 'unverified price',
]);
export const EVIDENCE_REQUIRED_CLAIM_PATTERNS: readonly string[] = Object.freeze([
  'price', 'award', 'provenance', 'comparative',
]);
export const REQUIRED_PROVENANCE_FIELDS: readonly string[] = Object.freeze([
  'campaignId', 'createdBy', 'promptHash', 'evidenceRefs', 'modelOrAdapter', 'reviewedAt', 'version',
]);
export const MARKETING_AUDIT_FIELDS: readonly string[] = Object.freeze([
  'correlationId', 'tenantId', 'actorUserId', 'campaignId', 'action',
  'decision', 'reasonCode', 'reason', 'occurredAt',
]);
export const MARKETING_SPEND_VARIANCE_THRESHOLD_PCT = 20;
export const MARKETING_PERFORMANCE_SHIFT_THRESHOLD_PCT = 30;

export interface MarketingApproval {
  readonly approverUserId: string;
  readonly distinct: boolean;
  readonly reason: string;
  readonly expiresAt?: Date | string | null;
}

export interface CampaignProvenance {
  readonly campaignId: string;
  readonly createdBy: string;
  readonly promptHash: string;
  readonly evidenceRefs: readonly string[];
  readonly modelOrAdapter: string;
  readonly reviewedAt: string;
  readonly version: string;
}

export interface AlcoholComplianceValidation {
  readonly completed: boolean;
  readonly passed: boolean;
  readonly reviewer?: string;
  readonly jurisdiction?: string;
}

export interface MarketingReleaseRequest {
  readonly correlationId: string;
  readonly tenantId: string;
  readonly actorUserId: string;
  readonly campaignId: string;
  readonly action: MarketingAction;
  readonly geography: string;
  readonly audienceSegments: readonly string[];
  readonly claims: readonly string[];
  readonly evidenceRefs: readonly string[];
  readonly budgetIncreasePercent?: number;
  readonly approval?: MarketingApproval | null;
  readonly provenance?: CampaignProvenance | null;
  readonly alcoholValidation?: AlcoholComplianceValidation | null;
  readonly observedSpendVariancePct?: number;
  readonly observedPerformanceShiftPct?: number;
}

export type MarketingDecisionCode =
  | 'allowed_draft'
  | 'allowed_pause'
  | 'allowed_rollback'
  | 'unknown_action'
  | 'missing_context'
  | 'restricted_geography'
  | 'restricted_audience'
  | 'denied_claim'
  | 'evidence_required'
  | 'alcohol_validation_required'
  | 'approval_required'
  | 'self_approval_denied'
  | 'approval_expired'
  | 'provenance_incomplete'
  | 'budget_increase_blocked'
  | 'release_disabled';

export interface MarketingDecision {
  allowed: boolean;
  code: MarketingDecisionCode;
  reason: string;
  outcome: 'draft' | 'pause' | 'rollback' | 'blocked';
  requiresHumanApproval: boolean;
  requiresAlert: boolean;
  advisoryOnly: true;
  audit: Record<string, unknown>;
}

function decision(
  code: MarketingDecisionCode,
  reason: string,
  request: MarketingReleaseRequest,
  outcome: MarketingDecision['outcome'],
  requiresAlert = false,
): MarketingDecision {
  return {
    allowed: code.startsWith('allowed_'),
    code,
    reason,
    outcome,
    requiresHumanApproval: MARKETING_HUMAN_APPROVAL_REQUIRED && !code.startsWith('allowed_draft'),
    requiresAlert,
    advisoryOnly: true,
    audit: {
      correlationId: request.correlationId,
      tenantId: request.tenantId,
      actorUserId: request.actorUserId,
      campaignId: request.campaignId,
      action: request.action,
      decision: code.startsWith('allowed_') ? 'allowed' : 'denied',
      reasonCode: code,
      reason,
      occurredAt: new Date().toISOString(),
    },
  };
}

function approvalCode(
  request: MarketingReleaseRequest,
  distinctApproverRequired: boolean,
): MarketingDecisionCode | null {
  const approval = request.approval;
  if (!approval || !approval.distinct) return 'approval_required';
  if (distinctApproverRequired && approval.approverUserId === request.actorUserId) return 'self_approval_denied';
  if (approval.reason.trim().length < MARKETING_REASON_MIN_LENGTH) return 'approval_required';
  if (approval.expiresAt) {
    const expiry = approval.expiresAt instanceof Date ? approval.expiresAt : new Date(approval.expiresAt);
    if (Number.isNaN(expiry.getTime()) || expiry <= new Date()) return 'approval_expired';
  }
  return null;
}

function provenanceComplete(request: MarketingReleaseRequest): boolean {
  const provenance = request.provenance as unknown as Record<string, unknown> | null | undefined;
  if (!provenance) return false;
  const required = REQUIRED_PROVENANCE_FIELDS.every((field) => {
    const value = provenance[field];
    return Array.isArray(value) ? value.length > 0 : typeof value === 'string' && value.trim().length > 0;
  });
  return required && provenance.campaignId === request.campaignId;
}

/**
 * Evaluate one campaign action. Releases and budget increases are advisory
 * only: the prototype records the decision and never contacts an ad platform.
 */
export function evaluateMarketingRelease(request: MarketingReleaseRequest): MarketingDecision {
  if (!(MARKETING_ACTIONS as readonly string[]).includes(request.action)) {
    return decision('unknown_action', 'Campaign action is not in the release register.', request, 'blocked');
  }
  if (!request.correlationId || !request.tenantId || !request.actorUserId || !request.campaignId) {
    return decision('missing_context', 'Correlation, tenant, actor and campaign identity are required.', request, 'blocked');
  }

  const geography = request.geography.trim().toUpperCase();
  if (!geography || DENIED_GEOGRAPHIES.includes(geography)) {
    return decision('restricted_geography', 'Geography is unverified, sanctioned or blocked by counsel.', request, 'blocked');
  }
  const segments = request.audienceSegments.map((segment) => segment.trim().toLowerCase());
  if (segments.some((segment) => DENIED_AUDIENCE_SEGMENTS.includes(segment))) {
    return decision('restricted_audience', 'Audience includes an excluded or age-restricted segment.', request, 'blocked');
  }

  const claims = request.claims.map((claim) => claim.trim().toLowerCase());
  if (claims.some((claim) => DENIED_CLAIM_PATTERNS.some((pattern) => claim.includes(pattern)))) {
    return decision('denied_claim', 'Claim uses prohibited health, safety, guarantee or unsupported language.', request, 'blocked');
  }
  if (
    claims.some((claim) => EVIDENCE_REQUIRED_CLAIM_PATTERNS.some((pattern) => claim.includes(pattern))) &&
    request.evidenceRefs.length === 0
  ) {
    return decision('evidence_required', 'Evidence-backed claims require versioned source references.', request, 'blocked');
  }
  if (!provenanceComplete(request)) {
    return decision('provenance_incomplete', 'Campaign provenance is incomplete or does not match the campaign.', request, 'blocked');
  }

  if (request.action === 'budget_increase' || Number(request.budgetIncreasePercent ?? 0) > MARKETING_MAX_INCREASE_PERCENT) {
    return decision('budget_increase_blocked', 'Autonomous or positive budget increases are not authorised.', request, 'blocked');
  }

  const isRelease = request.action === 'release';
  if (isRelease && (!request.alcoholValidation?.completed || !request.alcoholValidation.passed)) {
    return decision('alcohol_validation_required', 'Alcohol-advertising validation is required before release.', request, 'blocked');
  }

  const needsApproval = request.action !== 'draft';
  if (needsApproval) {
    const code = approvalCode(request, MARKETING_DISTINCT_APPROVER_REQUIRED);
    if (code) return decision(code, 'A distinct named human approval with reason is required.', request, 'blocked');
  }

  if (isRelease) {
    return decision('release_disabled', 'Campaign release is disabled in the prototype; draft output only.', request, 'blocked');
  }

  const requiresAlert = Boolean(
    Math.abs(Number(request.observedSpendVariancePct ?? 0)) >= MARKETING_SPEND_VARIANCE_THRESHOLD_PCT ||
    Math.abs(Number(request.observedPerformanceShiftPct ?? 0)) >= MARKETING_PERFORMANCE_SHIFT_THRESHOLD_PCT,
  );
  if (request.action === 'pause') {
    return decision('allowed_pause', 'Simulated pause recorded; no live campaign was changed.', request, 'pause', requiresAlert);
  }
  if (request.action === 'rollback') {
    return decision('allowed_rollback', 'Simulated rollback recorded; no live campaign was changed.', request, 'rollback', requiresAlert);
  }
  return decision('allowed_draft', 'Draft advice within the approved audience and claim envelope.', request, 'draft', requiresAlert);
}
