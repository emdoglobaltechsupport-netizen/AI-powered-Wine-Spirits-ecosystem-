import {
  DENIED_AUDIENCE_SEGMENTS,
  DENIED_CLAIM_PATTERNS,
  DENIED_GEOGRAPHIES,
  MARKETING_ACTIONS,
  MARKETING_AUDIT_FIELDS,
  MARKETING_DEFAULT_OUTCOME,
  MARKETING_DISTINCT_APPROVER_REQUIRED,
  MARKETING_HUMAN_APPROVAL_REQUIRED,
  MARKETING_MAX_INCREASE_PERCENT,
  MARKETING_PERFORMANCE_SHIFT_THRESHOLD_PCT,
  MARKETING_RELEASE_ENABLED,
  MARKETING_REASON_MIN_LENGTH,
  MARKETING_REVENUE_CAP,
  MARKETING_SPEND_VARIANCE_THRESHOLD_PCT,
  REQUIRED_PROVENANCE_FIELDS,
  type MarketingDecision,
} from '@vintora/shared';
import { TENANT_ID, tenantQuery, withTenant } from '../../db/tenant.js';

export { TENANT_ID };

interface AuditInput {
  correlationId: string;
  requestId: string | undefined;
  actorUserId: string;
  campaignId: string;
  action: string;
  decision: string;
  reasonCode: string;
  reason: string;
  requiresAlert: boolean;
  occurredAt: string;
}

function auditValues(audit: AuditInput) {
  return [
    TENANT_ID,
    audit.correlationId,
    audit.requestId ?? null,
    audit.actorUserId,
    audit.campaignId,
    audit.action,
    audit.decision,
    audit.reasonCode,
    audit.reason,
    audit.requiresAlert,
    JSON.stringify(audit),
  ];
}

const AUDIT_INSERT = `INSERT INTO marketing_release_audit
  (tenant_id, correlation_id, request_id, actor_user_id, campaign_id, action,
   decision, reason_code, reason, requires_alert, decision_json)
  VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`;

export async function controls() {
  return {
    version: 'v1',
    status: 'prototype-draft-only-deny-by-default',
    releaseEnabled: MARKETING_RELEASE_ENABLED,
    humanApprovalRequired: MARKETING_HUMAN_APPROVAL_REQUIRED,
    distinctApproverRequired: MARKETING_DISTINCT_APPROVER_REQUIRED,
    reasonMinLength: MARKETING_REASON_MIN_LENGTH,
    defaultOutcome: MARKETING_DEFAULT_OUTCOME,
    actions: MARKETING_ACTIONS,
    audienceRestrictions: { deniedGeographies: DENIED_GEOGRAPHIES, deniedSegments: DENIED_AUDIENCE_SEGMENTS },
    claimControls: { deniedClaimPatterns: DENIED_CLAIM_PATTERNS },
    budgetControls: {
      maxIncreasePercent: MARKETING_MAX_INCREASE_PERCENT,
      revenueCap: MARKETING_REVENUE_CAP,
      noAutonomousSpend: true,
    },
    provenance: { requiredFields: REQUIRED_PROVENANCE_FIELDS, immutable: true },
    alerts: {
      spendVarianceThresholdPct: MARKETING_SPEND_VARIANCE_THRESHOLD_PCT,
      performanceShiftThresholdPct: MARKETING_PERFORMANCE_SHIFT_THRESHOLD_PCT,
    },
    auditFields: MARKETING_AUDIT_FIELDS,
    note: 'Advisory evaluation only. No live campaign, ad account, budget API, email sender or audience feed exists.',
  };
}

export async function recordDecision(
  decision: MarketingDecision,
  actorUserId: string,
  requestId: string | undefined,
): Promise<void> {
  const field = (name: string): string => String(decision.audit[name] ?? '');
  const audit: AuditInput = {
    correlationId: field('correlationId'),
    requestId,
    actorUserId,
    campaignId: field('campaignId'),
    action: field('action'),
    decision: field('decision'),
    reasonCode: field('reasonCode'),
    reason: field('reason'),
    requiresAlert: decision.requiresAlert,
    occurredAt: field('occurredAt') || new Date().toISOString(),
  };
  await tenantQuery(AUDIT_INSERT, auditValues(audit), TENANT_ID, actorUserId);
}

/** Draft/pause/rollback simulation state only. Releases never create live state. */
export async function recordCampaignState(input: {
  campaignId: string;
  actorUserId: string;
  status: 'draft' | 'paused' | 'rolled_back';
  provenanceHash: string;
}) {
  await tenantQuery(
    `INSERT INTO marketing_campaign_controls
       (tenant_id, campaign_id, status, requested_increase_pct, provenance_hash, actor_user_id, updated_at)
     VALUES ($1,$2,$3,0,$4,$5,now())
     ON CONFLICT (tenant_id, campaign_id) DO UPDATE
       SET status = EXCLUDED.status, provenance_hash = EXCLUDED.provenance_hash,
           requested_increase_pct = 0, actor_user_id = EXCLUDED.actor_user_id, updated_at = now()
     RETURNING campaign_id, status, updated_at`,
    [TENANT_ID, input.campaignId, input.status, input.provenanceHash, input.actorUserId],
    TENANT_ID,
    input.actorUserId,
  );
}

/** Named approvers are ordinary active users, never AI identities. */
export async function resolveApprover(code: string): Promise<string> {
  const email = `${code}@vintora.local`;
  const rows = await tenantQuery<{ id: string }>(
    'SELECT id FROM users WHERE email = $1 AND status = $2',
    [email, 'active'],
    TENANT_ID,
  );
  const id = rows[0]?.id;
  if (!id) throw new Error('Approver account is not available');
  return id;
}

export async function audit(limit = 100) {
  return tenantQuery(
    `SELECT id, correlation_id, request_id, actor_user_id, campaign_id, action, decision,
            reason_code, reason, requires_alert, decision_json, occurred_at
     FROM marketing_release_audit WHERE tenant_id = $1
     ORDER BY occurred_at DESC, id DESC LIMIT $2`,
    [TENANT_ID, Math.min(Math.max(limit, 1), 200)],
    TENANT_ID,
  );
}

export { withTenant };
