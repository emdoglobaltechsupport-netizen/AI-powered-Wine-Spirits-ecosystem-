/**
 * Enforced commerce safeguards at the checkout boundary.
 *
 * The prototype has no certified age provider, KYC service, AML feed,
 * sanctions list or PSP. This pure evaluator therefore accepts only clearly
 * labelled simulated decisions, requires opaque evidence references and fails
 * closed on every missing, stale, unknown or denied control. It never performs
 * a real screening or payment action. The authoritative register is
 * config/commerce-safeguards.json; scripts/check-commerce-safeguards.mjs
 * checks these constants against it.
 */

export const COMMERCE_SAFEGUARDS_POLICY_VERSION = 'v1';
export const COMMERCE_PROTOTYPE_MODE = true;
export const COMMERCE_PUBLIC_LAUNCH = false;
export const COMMERCE_ENFORCEMENT = 'fail-closed';
export const COMMERCE_DEFAULT_OUTCOME = 'denied';
export const COMMERCE_ALLOWED_RESULT_CODES: readonly string[] = Object.freeze(['clear', 'simulated_clear']);
export const COMMERCE_EVIDENCE_PREFIX = 'simulated:';
export const COMMERCE_MAX_EVIDENCE_AGE_MINUTES = 15;
export const COMMERCE_MAX_AGE_EVIDENCE_HOURS = 720;
export const COMMERCE_REQUIRED_CONTROLS = [
  'age', 'kyc', 'aml', 'sanctions', 'payment',
] as const;
export const COMMERCE_SIMULATION_DENIED_JURISDICTIONS: readonly string[] = Object.freeze([
  'UNVERIFIED', 'BLOCKED_BY_COUNSEL',
]);

export type CommerceSafeguardId = (typeof COMMERCE_REQUIRED_CONTROLS)[number];

export interface CommerceSafeguardDecisionInput {
  readonly id: CommerceSafeguardId;
  readonly result: string;
  readonly evidenceRef: string;
  readonly evaluatedAt: Date | string;
}

export interface CommerceSafeguardsRequest {
  readonly tenantId?: string | null;
  readonly userId?: string | null;
  readonly jurisdiction?: string | null;
  readonly ageEvidenceAt?: Date | string | null;
  readonly decisions?: readonly CommerceSafeguardDecisionInput[];
  readonly now?: Date;
}

export interface CommerceSafeguardDecisionResult {
  readonly id: CommerceSafeguardId;
  readonly result: string;
  readonly evidenceRef: string;
  readonly accepted: boolean;
  readonly reasonCode?: string;
}

export interface CommerceSafeguardsOutcome {
  readonly allowed: boolean;
  readonly reasonCode: string;
  readonly reasons: readonly string[];
  readonly evaluatedAt: string;
  readonly decisions: readonly CommerceSafeguardDecisionResult[];
}

const DENY = (reasonCode: string, reason: string, decisions: readonly CommerceSafeguardDecisionResult[], now: Date): CommerceSafeguardsOutcome => ({
  allowed: false,
  reasonCode,
  reasons: [reason],
  evaluatedAt: now.toISOString(),
  decisions,
});

function parseDate(value: Date | string): Date | null {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function evaluateCommerceSafeguards(request: CommerceSafeguardsRequest): CommerceSafeguardsOutcome {
  const now = request.now ?? new Date();
  const tenantId = request.tenantId?.trim();
  const userId = request.userId?.trim();
  const jurisdiction = request.jurisdiction?.trim().toUpperCase();

  if (!tenantId || !userId || !jurisdiction) {
    return DENY('missing_context', 'Tenant, user and jurisdiction are required', [], now);
  }
  if (COMMERCE_SIMULATION_DENIED_JURISDICTIONS.includes(jurisdiction)) {
    return DENY('denied_jurisdiction', `Jurisdiction ${jurisdiction} is denied by the prototype control list`, [], now);
  }

  const ageEvidenceAt = request.ageEvidenceAt == null ? null : parseDate(request.ageEvidenceAt);
  if (request.ageEvidenceAt == null) {
    return DENY('missing_age_evidence', 'A verified age assertion timestamp is required', [], now);
  }
  if (!ageEvidenceAt) {
    return DENY('invalid_age_evidence', 'Age evidence timestamp could not be parsed', [], now);
  }
  if (ageEvidenceAt.getTime() > now.getTime()) {
    return DENY('future_age_evidence', 'Age evidence cannot be dated in the future', [], now);
  }
  if (now.getTime() - ageEvidenceAt.getTime() > COMMERCE_MAX_AGE_EVIDENCE_HOURS * 60 * 60_000) {
    return DENY('stale_age_evidence', `Age evidence is older than ${COMMERCE_MAX_AGE_EVIDENCE_HOURS} hours`, [], now);
  }

  const decisions: CommerceSafeguardDecisionResult[] = [];
  for (const id of COMMERCE_REQUIRED_CONTROLS) {
    const decision = request.decisions?.find((candidate) => candidate.id === id);
    if (!decision) {
      decisions.push({ id, result: 'missing', evidenceRef: '', accepted: false, reasonCode: `missing_${id}` });
      return DENY(`missing_${id}`, `Required ${id} safeguard decision is missing`, decisions, now);
    }

    const evaluatedAt = parseDate(decision.evaluatedAt);
    let reasonCode: string | undefined;
    if (!COMMERCE_ALLOWED_RESULT_CODES.includes(decision.result)) {
      reasonCode = `control_${decision.result}`;
    } else if (COMMERCE_PUBLIC_LAUNCH && decision.result === 'simulated_clear') {
      reasonCode = 'simulated_result_in_launch';
    } else if (!decision.evidenceRef.startsWith(COMMERCE_EVIDENCE_PREFIX) ||
               !decision.evidenceRef.includes(`:${id}:`)) {
      reasonCode = 'invalid_evidence';
    } else if (!evaluatedAt) {
      reasonCode = 'invalid_evidence';
    } else if (evaluatedAt.getTime() > now.getTime()) {
      reasonCode = 'future_evidence';
    } else if (now.getTime() - evaluatedAt.getTime() > COMMERCE_MAX_EVIDENCE_AGE_MINUTES * 60_000) {
      reasonCode = 'stale_evidence';
    }

    decisions.push({
      id,
      result: decision.result,
      evidenceRef: decision.evidenceRef,
      accepted: !reasonCode,
      ...(reasonCode ? { reasonCode } : {}),
    });
    if (reasonCode) {
      return DENY(reasonCode, `${id} safeguard did not pass: ${reasonCode}`, decisions, now);
    }
  }

  return {
    allowed: true,
    reasonCode: 'all_controls_clear',
    reasons: ['All required prototype safeguards returned simulated clear decisions with fresh evidence'],
    evaluatedAt: now.toISOString(),
    decisions,
  };
}
