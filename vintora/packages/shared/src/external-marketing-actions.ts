/**
 * Human-release gate for external or paid marketing actions.
 *
 * Pure evaluator. It never publishes, sends, bids or spends. Every
 * external-capable channel is blocked in the prototype; a complete approval
 * record only produces a sandbox-approved draft decision for audit. The
 * authoritative register is config/marketing-external-actions.json.
 */
import { DENIED_AUDIENCE_SEGMENTS } from './marketing-controls.js';

export const EXTERNAL_MARKETING_POLICY_VERSION = 'v1';
export const EXTERNAL_MARKETING_EFFECTS_ENABLED = false;
export const MARKETING_SANDBOX_ONLY = true;
export const MARKETING_SANDBOX_CHANNELS = Object.freeze(['sandbox', 'prototype_local'] as const);
export const MARKETING_BLOCKED_CHANNELS = Object.freeze([
  'live', 'ad_platform', 'email_send', 'social_publish', 'seo_publish',
  'influencer_outreach', 'paid_search', 'paid_social',
] as const);
export const EXTERNAL_APPROVAL_FIELDS = Object.freeze([
  'approverUserId', 'actorUserId', 'reason', 'recordedAt', 'promptHash', 'modelVersion', 'payloadHash',
] as const);
export const PREVIEW_VERIFICATION_FIELDS = Object.freeze([
  'age_gate', 'jurisdiction', 'consent_state', 'segment_exclusions',
] as const);
export const LEGAL_APPROVAL_FIELDS = Object.freeze([
  'reviewer', 'jurisdiction', 'claimSetHash', 'approvedAt',
] as const);
export const REGULATED_CLAIM_PATTERNS = Object.freeze([
  'health', 'medical', 'price', 'award', 'provenance', 'comparative',
  'investment', 'guaranteed', 'safe drinking',
] as const);
export const EXTERNAL_MARKETING_AUDIT_FIELDS = Object.freeze([
  'correlationId', 'tenantId', 'actorUserId', 'campaignId', 'action',
  'channel', 'decision', 'reasonCode', 'reason', 'occurredAt',
] as const);
export const KILL_SWITCH_SCOPES = Object.freeze([
  'sandbox_campaign', 'audience_export', 'scheduler', 'all_prototype_channels',
] as const);

export type ExternalMarketingAction = 'preview' | 'approval' | 'pause' | 'kill_switch';
export type ExternalMarketingOutcome = 'draft' | 'paused' | 'kill_switch' | 'blocked';

export interface ExternalApprovalRecord {
  readonly approverUserId: string;
  readonly actorUserId: string;
  readonly reason: string;
  readonly recordedAt: string;
  readonly promptHash: string;
  readonly modelVersion: string;
  readonly payloadHash: string;
}

export interface MarketingPreview {
  readonly renderedVariantId: string;
  readonly audienceVerified: boolean;
  readonly verifiedFields: readonly string[];
}

export interface MarketingBudgetEnvelope {
  readonly ownerUserId: string;
  readonly limitUsd: number;
  readonly requestedUsd: number;
}

export interface MarketingLegalApproval {
  readonly reviewer: string;
  readonly jurisdiction: string;
  readonly claimSetHash: string;
  readonly approvedAt: string;
}

export interface MarketingKillSwitch {
  readonly activated: boolean;
  readonly reason: string;
  readonly scope: string;
}

export interface ExternalMarketingActionRequest {
  readonly correlationId: string;
  readonly tenantId: string;
  readonly actorUserId: string;
  readonly campaignId: string;
  readonly action: ExternalMarketingAction;
  readonly channel: string;
  readonly claims: readonly string[];
  readonly audienceSegments: readonly string[];
  readonly approval?: ExternalApprovalRecord | null;
  readonly preview?: MarketingPreview | null;
  readonly budget?: MarketingBudgetEnvelope | null;
  readonly legalApproval?: MarketingLegalApproval | null;
  readonly killSwitch?: MarketingKillSwitch | null;
}

export type ExternalMarketingDecisionCode =
  | 'allowed_sandbox_draft'
  | 'allowed_pause'
  | 'allowed_kill_switch'
  | 'unknown_action'
  | 'missing_context'
  | 'blocked_channel'
  | 'restricted_audience'
  | 'approval_required'
  | 'self_approval_denied'
  | 'preview_required'
  | 'audience_verification_incomplete'
  | 'budget_owner_required'
  | 'spend_limit_exceeded'
  | 'legal_approval_required'
  | 'kill_switch_reason_required'
  | 'external_effects_disabled';

export interface ExternalMarketingDecision {
  readonly allowed: boolean;
  readonly code: ExternalMarketingDecisionCode;
  readonly reason: string;
  readonly outcome: ExternalMarketingOutcome;
  readonly requiresHumanApproval: boolean;
  readonly requiresAlert: boolean;
  readonly externalEffects: false;
  readonly advisoryOnly: true;
  readonly audit: Record<string, unknown>;
}

function decision(
  code: ExternalMarketingDecisionCode,
  reason: string,
  request: ExternalMarketingActionRequest,
  outcome: ExternalMarketingOutcome = 'blocked',
): ExternalMarketingDecision {
  return {
    allowed: code.startsWith('allowed_'),
    code,
    reason,
    outcome,
    requiresHumanApproval: code !== 'allowed_sandbox_draft',
    requiresAlert: code === 'allowed_kill_switch',
    externalEffects: false,
    advisoryOnly: true,
    audit: {
      correlationId: request.correlationId,
      tenantId: request.tenantId,
      actorUserId: request.actorUserId,
      campaignId: request.campaignId,
      action: request.action,
      channel: request.channel,
      decision: code.startsWith('allowed_') ? 'allowed' : 'denied',
      reasonCode: code,
      reason,
      occurredAt: new Date().toISOString(),
    },
  };
}

function approvalComplete(request: ExternalMarketingActionRequest): ExternalMarketingDecisionCode | null {
  const approval = request.approval;
  if (!approval) return 'approval_required';
  for (const field of EXTERNAL_APPROVAL_FIELDS) {
    const value = (approval as unknown as Record<string, unknown>)[field];
    if (typeof value !== 'string' || !value.trim()) return 'approval_required';
  }
  if (approval.approverUserId === request.actorUserId) return 'self_approval_denied';
  if (approval.reason.trim().length < 8) return 'approval_required';
  const recorded = Date.parse(approval.recordedAt);
  if (Number.isNaN(recorded) || recorded > Date.now()) return 'approval_required';
  return null;
}

function previewComplete(request: ExternalMarketingActionRequest): ExternalMarketingDecisionCode | null {
  const preview = request.preview;
  if (!preview || !preview.renderedVariantId.trim() || !preview.audienceVerified) return 'preview_required';
  const verified = new Set(preview.verifiedFields.map((field) => field.trim().toLowerCase()));
  if (!PREVIEW_VERIFICATION_FIELDS.every((field) => verified.has(field))) {
    return 'audience_verification_incomplete';
  }
  return null;
}

function hasRegulatedClaim(claims: readonly string[]): boolean {
  const normalised = claims.map((claim) => claim.trim().toLowerCase());
  return normalised.some((claim) => REGULATED_CLAIM_PATTERNS.some((pattern) => claim.includes(pattern)));
}

/** Evaluates one sandbox-only marketing action. External effects are never authorised. */
export function evaluateExternalMarketingAction(request: ExternalMarketingActionRequest): ExternalMarketingDecision {
  const actions: readonly string[] = ['preview', 'approval', 'pause', 'kill_switch'];
  if (!actions.includes(request.action)) {
    return decision('unknown_action', 'External action is not in the release register.', request);
  }
  if (!request.correlationId || !request.tenantId || !request.actorUserId || !request.campaignId) {
    return decision('missing_context', 'Correlation, tenant, actor and campaign identity are required.', request);
  }
  const channel = request.channel.trim().toLowerCase();
  if (!MARKETING_SANDBOX_CHANNELS.includes(channel as (typeof MARKETING_SANDBOX_CHANNELS)[number])) {
    return decision('blocked_channel', 'Only sandbox channels are permitted in the prototype.', request);
  }
  const segments = request.audienceSegments.map((segment) => segment.trim().toLowerCase());
  if (segments.some((segment) =>
    DENIED_AUDIENCE_SEGMENTS.includes(segment) ||
    segment === 'harmful_use_inferred' || segment === 'self_excluded')) {
    return decision('restricted_audience', 'Audience includes a prohibited or protection-eligible segment.', request);
  }

  if (request.action === 'kill_switch') {
    const kill = request.killSwitch;
    if (!kill?.activated || kill.reason.trim().length < 8) {
      return decision('kill_switch_reason_required', 'Emergency kill switch requires an explicit reason.', request);
    }
    if (!(KILL_SWITCH_SCOPES as readonly string[]).includes(kill.scope)) {
      return decision('unknown_action', 'Kill-switch scope is not registered.', request);
    }
    return decision('allowed_kill_switch', 'Sandbox kill switch recorded; no live channel was changed.', request, 'kill_switch');
  }

  if (request.action === 'pause') {
    const approvalCode = approvalComplete(request);
    if (approvalCode) return decision(approvalCode, 'A recorded distinct human approval is required.', request);
    return decision('allowed_pause', 'Sandbox pause recorded; no live campaign was changed.', request, 'paused');
  }

  if (request.action === 'approval') {
    const approvalCode = approvalComplete(request);
    if (approvalCode) return decision(approvalCode, 'A recorded distinct human approval is required.', request);
    const previewCode = previewComplete(request);
    if (previewCode) {
      return decision(previewCode, 'Rendered preview and verified audience fields are required.', request);
    }
    if (!request.budget?.ownerUserId || typeof request.budget.limitUsd !== 'number') {
      return decision('budget_owner_required', 'A named budget owner and sandbox limit are required.', request);
    }
    if (request.budget.requestedUsd > 0 || request.budget.limitUsd > 0) {
      return decision('spend_limit_exceeded', 'Prototype sandbox spend and budget increases are capped at zero.', request);
    }
    if (hasRegulatedClaim(request.claims)) {
      const legal = request.legalApproval;
      if (!legal || LEGAL_APPROVAL_FIELDS.some((field) => !String((legal as unknown as Record<string, unknown>)[field] ?? '').trim())) {
        return decision('legal_approval_required', 'Regulated claims require recorded jurisdiction legal approval.', request);
      }
    }
    return decision('allowed_sandbox_draft', 'Approval recorded for a sandbox draft only; no external effect is authorised.', request, 'draft');
  }

  const previewCode = previewComplete(request);
  if (previewCode) return decision(previewCode, 'Preview and audience verification are required before approval.', request);
  return decision('allowed_sandbox_draft', 'Sandbox preview recorded; no external effect is authorised.', request, 'draft');
}
