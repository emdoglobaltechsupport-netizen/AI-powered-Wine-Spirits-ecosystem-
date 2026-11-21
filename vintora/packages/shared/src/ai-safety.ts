/**
 * Risk-tiered AI action taxonomy and response guardrails.
 *
 * This is a pure policy boundary. It classifies AI behaviour and refuses unsafe
 * output or external execution; it does not validate model quality and is not
 * evidence that an offline evaluation or human review has occurred.
 */

export const AI_ACTION_TIERS = ['read_only', 'recommendation', 'draft', 'execution'] as const;
export type AIActionTier = (typeof AI_ACTION_TIERS)[number];

export const AI_SURFACES = ['sommelier', 'assist', 'studio', 'pricing', 'marketing', 'techops'] as const;
export type AISurface = (typeof AI_SURFACES)[number];

export const AI_SURFACE_TIERS: Readonly<Record<AISurface, AIActionTier>> = Object.freeze({
  sommelier: 'recommendation',
  assist: 'recommendation',
  studio: 'draft',
  pricing: 'recommendation',
  marketing: 'draft',
  techops: 'draft',
});

/** Prototype fail-closed: no AI action may produce an external effect. */
export const AI_EXECUTION_ENABLED = false;
export const AI_EXTERNAL_EFFECTS_ENABLED = false;

export const AI_PROHIBITED_RECOMMENDATION_PATTERNS: readonly string[] = Object.freeze([
  '\\b(?:(?:improves?|boosts?|enhances?)\\s+(?:your\\s+)?health|healthier|medical|cures?|treats?|prevents? disease|safe drinking)\\b',
  '\\b(?:guaranteed|risk-free|no risk|certain return|will (?:rise|appreciate|outperform))\\b',
  '\\b(?:drunk|intoxicated|binge|get high|hangover cure)\\b',
  '\\b(?:for kids|for children|target teenagers|underage drinkers)\\b',
  '\\b(?:investment advice|suitability approval|performance guarantee)\\b',
]);

export const AI_PROVENANCE_FIELDS: readonly string[] = Object.freeze([
  'promptId',
  'promptVersion',
  'modelKey',
  'modelVersion',
  'retrievalSourceIds',
  'factPacketHash',
  'approvalId',
]);

export const RESPONSIBLE_DRINKING_NOTICE =
  'Please enjoy responsibly. Vintora does not sell to minors. Answers are guidance, not health claims.';

export interface AIProvenance {
  readonly promptId: string;
  readonly promptVersion: string;
  readonly modelKey: string;
  readonly modelVersion: string;
  readonly retrievalSourceIds: readonly string[];
  readonly factPacketHash: string;
  readonly approvalId: string | null;
}

export interface AIActionRequest {
  readonly surface: AISurface;
  readonly actionTier: AIActionTier;
  readonly externalEffect?: boolean;
  readonly humanApproval?: {
    readonly approverUserId: string;
    readonly actorUserId: string;
    readonly reason: string;
    readonly expiresAt?: Date | string | null;
  } | null;
}

export type AIActionDecisionCode =
  | 'allowed'
  | 'unknown_surface'
  | 'unknown_action_tier'
  | 'tier_mismatch'
  | 'execution_disabled'
  | 'external_effect_disabled'
  | 'human_approval_required'
  | 'distinct_approver_required'
  | 'approval_reason_required'
  | 'approval_expired';

export interface AIActionDecision {
  readonly allowed: boolean;
  readonly code: AIActionDecisionCode;
  readonly reason: string;
  readonly actionTier: AIActionTier | null;
  readonly advisoryOnly: boolean;
}

export interface AIResponseInput {
  readonly surface: AISurface;
  readonly text: string;
  readonly citations: readonly string[];
  readonly safetyNote?: string | null;
  readonly provenance: AIProvenance;
}

export type AIResponseDecisionCode =
  | 'allowed'
  | 'missing_text'
  | 'missing_citation'
  | 'missing_safety_notice'
  | 'missing_provenance'
  | 'prohibited_recommendation';

export interface AIResponseDecision {
  readonly allowed: boolean;
  readonly code: AIResponseDecisionCode;
  readonly reasons: readonly string[];
}

const isAISurface = (value: string): value is AISurface =>
  (AI_SURFACES as readonly string[]).includes(value);

const isAIActionTier = (value: string): value is AIActionTier =>
  (AI_ACTION_TIERS as readonly string[]).includes(value);

function deny<T extends string>(code: T, reason: string, actionTier: AIActionTier | null = null) {
  return {
    allowed: false,
    code,
    reason,
    actionTier,
    advisoryOnly: false,
  };
}

/** Evaluates what an AI surface may do. It never authorises external effects. */
export function evaluateAiAction(request: AIActionRequest): AIActionDecision {
  if (!isAISurface(request.surface)) {
    return deny('unknown_surface', `Unknown AI surface: ${request.surface}`);
  }
  if (!isAIActionTier(request.actionTier)) {
    return deny('unknown_action_tier', `Unknown AI action tier: ${request.actionTier}`);
  }
  if (request.actionTier === 'execution' || !AI_EXECUTION_ENABLED) {
    if (request.actionTier === 'execution') {
      return deny('execution_disabled', 'AI execution tier is disabled in the prototype', request.actionTier);
    }
  }
  if (request.externalEffect || !AI_EXTERNAL_EFFECTS_ENABLED) {
    if (request.externalEffect) {
      return deny('external_effect_disabled', 'AI-driven external effects are disabled in the prototype', request.actionTier);
    }
  }
  if (AI_SURFACE_TIERS[request.surface] !== request.actionTier) {
    return deny(
      'tier_mismatch',
      `${request.surface} is registered as ${AI_SURFACE_TIERS[request.surface]}, not ${request.actionTier}`,
      request.actionTier,
    );
  }
  if (request.humanApproval) {
    const approval = request.humanApproval;
    if (approval.approverUserId === approval.actorUserId) {
      return deny('distinct_approver_required', 'AI approval must come from a distinct human', request.actionTier);
    }
    if (!approval.reason || approval.reason.trim().length < 8) {
      return deny('approval_reason_required', 'AI approval requires an 8+ character reason', request.actionTier);
    }
    if (approval.expiresAt && Date.parse(String(approval.expiresAt)) <= Date.now()) {
      return deny('approval_expired', 'AI approval window has expired', request.actionTier);
    }
  }
  return {
    allowed: true,
    code: 'allowed',
    reason: `${request.surface} may return ${request.actionTier} output only; no external effect is authorised.`,
    actionTier: request.actionTier,
    advisoryOnly: true,
  };
}

/** Checks customer-facing text for grounding, provenance and prohibited advice. */
export function validateAiResponse(input: AIResponseInput): AIResponseDecision {
  const reasons: string[] = [];
  if (!input.text || !input.text.trim()) reasons.push('A response requires text');
  if (!input.citations.length || input.citations.some((citation) => !citation.trim())) {
    reasons.push('A response requires at least one non-empty citation');
  }
  if (input.surface !== 'techops' && input.safetyNote !== RESPONSIBLE_DRINKING_NOTICE) {
    reasons.push('Customer-facing responses require the responsible-drinking notice');
  }
  for (const field of AI_PROVENANCE_FIELDS) {
    if (!(field in input.provenance)) reasons.push(`Missing AI provenance field: ${field}`);
  }
  if (!input.provenance.retrievalSourceIds.length) reasons.push('At least one retrieval source id is required');
  for (const source of AI_PROHIBITED_RECOMMENDATION_PATTERNS) {
    if (new RegExp(source, 'i').test(input.text)) reasons.push(`Prohibited recommendation pattern matched: ${source}`);
  }
  if (!reasons.length) {
    return { allowed: true, code: 'allowed', reasons: [] };
  }
  const code: AIResponseDecisionCode = reasons.some((reason) => reason.startsWith('Prohibited'))
    ? 'prohibited_recommendation'
    : reasons.some((reason) => reason.startsWith('Missing AI provenance') || reason.startsWith('At least one retrieval'))
      ? 'missing_provenance'
      : reasons.some((reason) => reason.startsWith('Customer-facing'))
        ? 'missing_safety_notice'
        : reasons.some((reason) => reason.startsWith('A response requires text'))
          ? 'missing_text'
          : 'missing_citation';
  return { allowed: false, code, reasons };
}
