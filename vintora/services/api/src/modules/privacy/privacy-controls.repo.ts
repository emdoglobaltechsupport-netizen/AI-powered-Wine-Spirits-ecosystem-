import { createHash } from 'node:crypto';
import {
  AUTOMATED_DELETION_ENABLED,
  DATA_GOVERNANCE_POLICY_VERSION,
  DATA_LIFECYCLE,
  CROSS_BORDER_TRANSFERS_ENABLED,
  CROSS_DOMAIN_JOIN_ALLOWED,
  WITHDRAWAL_PROPAGATION_COMPLETED,
  CLOSED_LOOP_PERSONALIZATION_ENABLED,
  DPIA_COMPLETED,
  PERSONALIZATION_ENABLED,
  PRIVACY_AUDIT_FIELDS,
  PRIVACY_POLICY_VERSION,
  PRIVACY_PURPOSE_CONFIG,
  PRIVACY_PURPOSES,
  RETENTION_ENFORCED,
  SENSITIVE_DATA_CATEGORIES,
  type ConsentMap,
  type DataGovernanceDecision,
  type PersonalDataUseDecision,
  type PrivacyPurpose,
} from '@vintora/shared';
import { TENANT_ID, tenantQuery, withTenant } from '../../db/tenant.js';

export { TENANT_ID };

interface ConsentRow {
  purpose: PrivacyPurpose;
  state: 'opt_in' | 'withdraw';
  policy_version: string;
  locale: string | null;
  recorded_at: Date;
}

export async function controls() {
  return {
    version: PRIVACY_POLICY_VERSION,
    status: 'prototype-deny-by-default',
    personalizationEnabled: PERSONALIZATION_ENABLED,
    closedLoopPersonalizationEnabled: CLOSED_LOOP_PERSONALIZATION_ENABLED,
    optInRequired: true,
    defaultState: 'off',
    privacyByDefault: true,
    purposeSeparation: true,
    purposes: PRIVACY_PURPOSES.map((id) => ({ id, ...PRIVACY_PURPOSE_CONFIG[id] })),
    sensitiveDataNeverProfiled: SENSITIVE_DATA_CATEGORIES,
    rights: {
      export: 'simulated-demo-export',
      deletion: 'human-reviewed-request',
      automatedDeletionEnabled: AUTOMATED_DELETION_ENABLED,
      requesterVerifiedBySession: true,
    },
    retention: {
      enforced: RETENTION_ENFORCED,
      schedules: PRIVACY_PURPOSES.map((id) => ({ purpose: id, days: PRIVACY_PURPOSE_CONFIG[id].retentionDays })),
    },
    dpia: { requiredForClosedLoopPersonalization: true, completed: DPIA_COMPLETED, reviewOwner: 'Data Protection Lead' },
    dataGovernance: {
      policyVersion: DATA_GOVERNANCE_POLICY_VERSION,
      crossBorderTransfersEnabled: CROSS_BORDER_TRANSFERS_ENABLED,
      crossDomainJoinAllowed: CROSS_DOMAIN_JOIN_ALLOWED,
      withdrawalPropagationCompleted: WITHDRAWAL_PROPAGATION_COMPLETED,
      retention: DATA_LIFECYCLE,
      workflows: {
        export: 'simulated manifest',
        deletion: 'human-reviewed request',
        optOutAndRevocation: 'POST /v1/privacy/consents with decision withdraw',
      },
    },
    auditFields: PRIVACY_AUDIT_FIELDS,
    note: 'Prototype only: no profile training, production export, irreversible deletion or retention job is active.',
  };
}

export async function consents(userId: string): Promise<ConsentMap> {
  const rows = await tenantQuery<ConsentRow>(
    `SELECT purpose, state, policy_version, locale, recorded_at
     FROM privacy_consents WHERE tenant_id = $1 AND user_id = $2`,
    [TENANT_ID, userId],
    TENANT_ID,
    userId,
  );
  const map: ConsentMap = {};
  for (const row of rows) {
    map[row.purpose] = {
      purpose: row.purpose,
      state: row.state,
      policyVersion: row.policy_version,
      locale: row.locale ?? undefined,
      recordedAt: row.recorded_at instanceof Date ? row.recorded_at.toISOString() : String(row.recorded_at),
    };
  }
  return map;
}

function auditValues(audit: Record<string, unknown>, userId: string, requestId: string | undefined) {
  return [
    TENANT_ID,
    userId,
    String(audit.correlationId ?? ''),
    requestId ?? null,
    String(audit.purpose ?? ''),
    String(audit.dataCategory ?? ''),
    String(audit.action ?? ''),
    String(audit.decision ?? 'denied'),
    String(audit.reasonCode ?? ''),
    String(audit.reason ?? ''),
    JSON.stringify(audit),
  ];
}

const AUDIT_INSERT = `INSERT INTO privacy_decision_audit
  (tenant_id, user_id, correlation_id, request_id, purpose, data_category,
   action, decision, reason_code, reason, decision_json)
  VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`;

export async function recordDecision(
  decision: PersonalDataUseDecision,
  userId: string,
  requestId: string | undefined,
): Promise<void> {
  await tenantQuery(AUDIT_INSERT, auditValues(decision.audit, userId, requestId), TENANT_ID, userId);
}

/**
 * Data-governance decisions reuse the existing append-only personal-data audit
 * action so no migration is required to add a new storage enum value.
 */
export async function recordGovernanceDecision(
  decision: DataGovernanceDecision,
  userId: string,
  requestId: string | undefined,
): Promise<void> {
  const audit = { ...decision.audit, action: 'personal_data_use' };
  await tenantQuery(AUDIT_INSERT, auditValues(audit, userId, requestId), TENANT_ID, userId);
}

export async function recordConsent(input: {
  correlationId: string;
  userId: string;
  purpose: PrivacyPurpose;
  state: 'opt_in' | 'withdraw';
  locale: string;
  requestId: string | undefined;
}) {
  return withTenant(async (client) => {
    const updated = await client.query<ConsentRow>(
      `INSERT INTO privacy_consents
         (tenant_id, user_id, purpose, state, policy_version, locale, source, recorded_at)
       VALUES ($1,$2,$3,$4,$5,$6,'prototype-privacy-controls',now())
       ON CONFLICT (tenant_id, user_id, purpose) DO UPDATE
         SET state = EXCLUDED.state, policy_version = EXCLUDED.policy_version,
             locale = EXCLUDED.locale, recorded_at = now()
       RETURNING purpose, state, policy_version, locale, recorded_at`,
      [TENANT_ID, input.userId, input.purpose, input.state, PRIVACY_POLICY_VERSION, input.locale],
    );
    const occurredAt = new Date().toISOString();
    const audit = {
      correlationId: input.correlationId,
      tenantId: TENANT_ID,
      actorUserId: input.userId,
      purpose: input.purpose,
      dataCategory: 'not_applicable',
      action: 'consent_change',
      decision: 'allowed',
      reasonCode: input.state === 'opt_in' ? 'consent_recorded' : 'consent_withdrawn',
      reason: `${input.state === 'opt_in' ? 'Opt-in' : 'Withdrawal'} recorded for ${input.purpose}`,
      occurredAt,
    };
    await client.query(AUDIT_INSERT, auditValues(audit, input.userId, input.requestId));
    return updated.rows[0]!;
  }, TENANT_ID, input.userId);
}

export type PrivacyRequestType = 'export' | 'deletion';

export async function createRequest(input: {
  correlationId: string;
  userId: string;
  requestType: PrivacyRequestType;
  reason: string;
  requestId: string | undefined;
}) {
  const token = input.requestType === 'export' ? 'EXPORT_MY_DATA' : 'DELETE_MY_DATA';
  if (input.reason.trim().length < 8) throw new Error('A specific request reason is required');
  return withTenant(async (client) => {
    const digest = createHash('sha256')
      .update(`${TENANT_ID}:${input.userId}:${input.requestType}:${token}:${Date.now()}`)
      .digest('hex');
    const manifest = input.requestType === 'export'
      ? `simulated-export:sha256:${digest.slice(0, 24)}`
      : `review-required:sha256:${digest.slice(0, 24)}`;
    const inserted = await client.query<{ id: string; status: string; manifest: string }>(
      `INSERT INTO privacy_requests
         (tenant_id, user_id, request_type, confirmation_text, status, reason, manifest)
       VALUES ($1,$2,$3,$4,'queued',$5,$6)
       RETURNING id::text, status, manifest`,
      [TENANT_ID, input.userId, input.requestType, token, input.reason, manifest],
    );
    const occurredAt = new Date().toISOString();
    const audit = {
      correlationId: input.correlationId,
      tenantId: TENANT_ID,
      actorUserId: input.userId,
      purpose: 'rights_request',
      dataCategory: 'not_applicable',
      action: input.requestType === 'deletion' ? 'deletion_request' : 'export',
      decision: 'allowed',
      reasonCode: input.requestType === 'export' ? 'export_queued' : 'deletion_review_queued',
      reason: input.reason,
      occurredAt,
    };
    await client.query(AUDIT_INSERT, auditValues(audit, input.userId, input.requestId));
    return {
      ...inserted.rows[0]!,
      requestType: input.requestType,
      note: input.requestType === 'export'
        ? 'Simulated manifest only; no live personal data was exported.'
        : 'Human-reviewed request queued; no production data was deleted.',
    };
  }, TENANT_ID, input.userId);
}

export async function audit(userId: string, limit = 100) {
  return tenantQuery(
    `SELECT id, correlation_id, request_id, purpose, data_category, action, decision,
            reason_code, reason, decision_json, occurred_at
     FROM privacy_decision_audit WHERE tenant_id = $1 AND user_id = $2
     ORDER BY occurred_at DESC, id DESC LIMIT $3`,
    [TENANT_ID, userId, Math.min(Math.max(limit, 1), 200)],
    TENANT_ID,
    userId,
  );
}
