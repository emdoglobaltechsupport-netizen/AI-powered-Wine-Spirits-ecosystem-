/**
 * Pricing fairness boundary for a recommendation-only engine.
 *
 * The evaluator checks permitted inputs, hard commercial constraints,
 * human-approval requirements and disparity evidence. It never authorises a
 * published price change and does not perform empirical fairness testing.
 */

export const PRICING_PERMITTED_VARIABLES: readonly string[] = Object.freeze([
  'verified_unit_cost',
  'verified_provenance_grade',
  'verified_stock_and_custody_state',
  'published_list_price',
  'fixed_public_promotion_calendar',
  'jurisdiction_tax_and_eligibility_rules',
  'fulfilment_cost_and_insurance',
]);

export const PRICING_PROHIBITED_VARIABLES: readonly string[] = Object.freeze([
  'protected_class_or_proxy',
  'age_except_legal_eligibility',
  'health_or_recovery_profile',
  'inferred_demographic_segment',
  'browsing_or_purchase_history_without_opt_in',
  'postcode_or_neighbourhood_willingness_to_pay',
  'device_or_browser_type',
  'unlicensed_competitor_price',
  'competitor_identity_for_coordination',
]);

export const PRICING_CONSTRAINTS = Object.freeze({
  minimumGrossMarginPct: 12,
  maximumIncreasePct: 10,
  maximumDiscountPct: 15,
  minimumDaysBetweenPublicChanges: 30,
  maximumChangesPerSkuPerQuarter: 2,
  sameSkuSamePublishedPrice: true,
  noHiddenFees: true,
  publicEffectiveDateRequired: true,
});

export const PRICING_AUDIT_FIELDS: readonly string[] = Object.freeze([
  'correlationId',
  'sku',
  'actorUserId',
  'approverUserId',
  'currentPriceUsd',
  'proposedPriceUsd',
  'inputs',
  'decision',
  'reasonCode',
  'ruleVersion',
  'explanationHash',
  'occurredAt',
]);

export const PRICING_EXPLANATION_FIELDS: readonly string[] = Object.freeze([
  'ruleVersion',
  'inputs',
  'marginBeforePct',
  'marginAfterPct',
  'changePct',
  'reasons',
  'evidenceRefs',
]);

/** Prototype fail-closed: recommendations only, never application. */
export const PRICING_APPLY_EXECUTION_ENABLED = false;
export const PRICING_PERSONALIZATION_ENABLED = false;

export interface PricingHumanApproval {
  readonly approverUserId: string;
  readonly actorUserId: string;
  readonly reason: string;
  readonly expiresAt?: Date | string | null;
}

export interface PricingDisparityEvidence {
  readonly geographicReviewed: boolean;
  readonly demographicReviewed: boolean;
  readonly protectedProxyScanCompleted: boolean;
  readonly evidenceRef: string | null;
}

export interface PricingExplanation {
  readonly ruleVersion: string;
  readonly inputs: readonly string[];
  readonly marginBeforePct: number;
  readonly marginAfterPct: number;
  readonly changePct: number;
  readonly reasons: readonly string[];
  readonly evidenceRefs: readonly string[];
}

export interface PricingProposal {
  readonly correlationId: string;
  readonly sku: string;
  readonly actorUserId: string;
  readonly currentPriceUsd: number;
  readonly proposedPriceUsd: number;
  readonly unitCostUsd: number;
  readonly variables: readonly string[];
  readonly personalized?: boolean;
  readonly applyRequested?: boolean;
  readonly competitorDataSource?: string | null;
  readonly competitorDataLicensed?: boolean;
  readonly humanApproval?: PricingHumanApproval | null;
  readonly explanation: PricingExplanation;
  readonly disparityEvidence?: PricingDisparityEvidence | null;
}

export type PricingDecisionCode =
  | 'allowed_recommendation'
  | 'invalid_price'
  | 'prohibited_variable'
  | 'personalized_pricing_denied'
  | 'unlicensed_competitor_data'
  | 'apply_execution_denied'
  | 'human_approval_required'
  | 'self_approval_denied'
  | 'approval_reason_required'
  | 'approval_expired'
  | 'below_margin_floor'
  | 'outside_change_band'
  | 'missing_explanation'
  | 'disparity_evidence_required';

export interface PricingDecision {
  readonly allowed: boolean;
  readonly code: PricingDecisionCode;
  readonly reasons: readonly string[];
  readonly requiresHumanApproval: boolean;
  readonly executionAuthorized: false;
}

const deny = (code: PricingDecisionCode, reason: string): PricingDecision => ({
  allowed: false,
  code,
  reasons: [reason],
  requiresHumanApproval: true,
  executionAuthorized: false,
});

/**
 * Evaluates a pricing proposal. A passing result is only a reviewable
 * recommendation; `executionAuthorized` is always false.
 */
export function evaluatePricingProposal(proposal: PricingProposal): PricingDecision {
  const { currentPriceUsd: current, proposedPriceUsd: proposed, unitCostUsd: cost } = proposal;
  if (![current, proposed, cost].every((value) => Number.isFinite(value) && value > 0)) {
    return deny('invalid_price', 'Current price, proposed price and unit cost must be positive numbers');
  }
  if (proposal.personalized || PRICING_PERSONALIZATION_ENABLED) {
    if (proposal.personalized) return deny('personalized_pricing_denied', 'Personalized pricing is prohibited');
  }
  if (proposal.applyRequested || !PRICING_APPLY_EXECUTION_ENABLED) {
    if (proposal.applyRequested) return deny('apply_execution_denied', 'No AI system may apply a published price change');
  }

  const prohibited = proposal.variables.filter((variable) =>
    (PRICING_PROHIBITED_VARIABLES as readonly string[]).includes(variable)
    || !(PRICING_PERMITTED_VARIABLES as readonly string[]).includes(variable),
  );
  if (prohibited.length) return deny('prohibited_variable', `Prohibited or unregistered pricing variable: ${prohibited.join(', ')}`);
  if (proposal.competitorDataSource && !proposal.competitorDataLicensed) {
    return deny('unlicensed_competitor_data', 'Competitor data requires a licensed, aggregated source');
  }

  const approval = proposal.humanApproval;
  if (approval) {
    if (approval.approverUserId === approval.actorUserId) return deny('self_approval_denied', 'Price approver must be distinct from the actor');
    if (!approval.reason || approval.reason.trim().length < 8) return deny('approval_reason_required', 'Price approval requires an 8+ character reason');
    if (approval.expiresAt && Date.parse(String(approval.expiresAt)) <= Date.now()) return deny('approval_expired', 'Price approval window has expired');
  }

  const marginBeforePct = ((current - cost) / current) * 100;
  const marginAfterPct = ((proposed - cost) / proposed) * 100;
  const changePct = ((proposed - current) / current) * 100;
  if (marginAfterPct < PRICING_CONSTRAINTS.minimumGrossMarginPct) {
    return deny('below_margin_floor', `Proposed margin ${marginAfterPct.toFixed(2)}% is below the ${PRICING_CONSTRAINTS.minimumGrossMarginPct}% floor`);
  }
  if (changePct > PRICING_CONSTRAINTS.maximumIncreasePct || changePct < -PRICING_CONSTRAINTS.maximumDiscountPct) {
    return deny('outside_change_band', `Change ${changePct.toFixed(2)}% exceeds the published band`);
  }

  const explanation = proposal.explanation;
  const explanationFields = PRICING_EXPLANATION_FIELDS;
  const missingExplanation = explanationFields.filter((field) => !(field in explanation));
  if (
    missingExplanation.length
    || explanation.ruleVersion !== 'pricing-rules-v1'
    || !explanation.reasons.length
    || !explanation.evidenceRefs.length
    || Math.abs(explanation.marginBeforePct - marginBeforePct) > 0.01
    || Math.abs(explanation.marginAfterPct - marginAfterPct) > 0.01
    || Math.abs(explanation.changePct - changePct) > 0.01
  ) {
    return deny('missing_explanation', 'A complete, accurate, versioned explanation with evidence is required');
  }

  const evidence = proposal.disparityEvidence;
  if (!evidence || !evidence.geographicReviewed || !evidence.demographicReviewed || !evidence.protectedProxyScanCompleted || !evidence.evidenceRef) {
    return deny('disparity_evidence_required', 'Geographic, demographic and protected-proxy reviews require an evidence reference');
  }

  return {
    allowed: true,
    code: 'allowed_recommendation',
    reasons: ['Passes design constraints only; a named human must approve any published change.'],
    requiresHumanApproval: true,
    executionAuthorized: false,
  };
}
