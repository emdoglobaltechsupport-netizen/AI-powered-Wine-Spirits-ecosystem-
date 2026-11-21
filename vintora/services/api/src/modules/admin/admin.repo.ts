import { tenantQuery, TENANT_ID, withTenant } from '../../db/tenant.js';
import type { PoolClient } from 'pg';

const maskEmail = `regexp_replace(email::text, '^([^@]{1})[^@]*(@.*)$', '\\1***\\2')`;

export async function overview() {
  const [metrics, cases, approvals, actions] = await Promise.all([
    tenantQuery<{ domain: string; metric_name: string; metric_value: string }>(
      // Seed rows are labelled demo projection constants. Use the latest row per
      // metric so an overview does not become empty when the calendar day rolls
      // over before the seed is replayed.
      `SELECT DISTINCT ON (metric_name) domain, metric_name, metric_value
       FROM admin_metrics_daily
       WHERE tenant_id = $1
       ORDER BY metric_name, metric_date DESC`, [TENANT_ID],
    ),
    tenantQuery<{ severity: string; count: string }>(
      `SELECT severity, count(*) AS count FROM admin_cases
       WHERE tenant_id = $1 AND status NOT IN ('resolved','closed') GROUP BY severity ORDER BY severity`, [TENANT_ID],
    ),
    tenantQuery<{ count: string }>(
      "SELECT count(*) AS count FROM admin_approvals WHERE tenant_id = $1 AND status = 'pending'", [TENANT_ID],
    ),
    tenantQuery<{ actor_id: string; action: string; tier: string; occurred_at: Date }>(
      `SELECT actor_id, action, tier, occurred_at FROM admin_actions
       WHERE tenant_id = $1 ORDER BY occurred_at DESC LIMIT 8`, [TENANT_ID],
    ),
  ]);
  return {
    metrics: Object.fromEntries(metrics.map((m) => [m.metric_name, Number(m.metric_value)])),
    casePressure: Object.fromEntries(cases.map((c) => [c.severity, Number(c.count)])),
    pendingApprovals: Number(approvals[0]?.count ?? 0),
    recentActions: actions,
  };
}

export async function users() {
  return tenantQuery(
    `SELECT u.id, ${maskEmail} AS email, u.display_name, u.country_code, u.status, u.created_at,
            av.status AS kyc_status, av.minimum_age
     FROM users u
     LEFT JOIN LATERAL (
       SELECT status, minimum_age FROM age_verifications
       WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1
     ) av ON true
     ORDER BY u.created_at DESC LIMIT 100`,
  );
}

export async function sellers() {
  return tenantQuery(
    `SELECT s.id, s.legal_name, s.trading_name, s.country_code, s.tier, s.status,
            s.licence_number, sr.payout_state, sr.dispute_rate_bps, sr.decision
     FROM sellers s
     LEFT JOIN LATERAL (
       SELECT payout_state, dispute_rate_bps, decision FROM admin_seller_reviews
       WHERE seller_id = s.id ORDER BY created_at DESC LIMIT 1
     ) sr ON true
     ORDER BY s.created_at DESC LIMIT 100`,
  );
}

export async function orders() {
  return tenantQuery(
    `SELECT o.order_number, o.status, o.total, o.currency_code, o.created_at, o.placed_at,
            p.id AS payment_id, p.status AS payment_status, s.status AS shipment_status
     FROM orders o
     LEFT JOIN payments p ON p.order_id = o.id
     LEFT JOIN shipments s ON s.order_id = o.id
     WHERE o.status <> 'draft'
     ORDER BY o.created_at DESC LIMIT 100`,
  );
}

export async function logistics() {
  return tenantQuery(
    `SELECT sh.id, sh.carrier, sh.status, sh.tracking_number, sh.temperature_excursion,
            sh.insured_value, sh.shipped_at, sh.delivered_at, o.order_number
     FROM shipments sh JOIN orders o ON o.id = sh.order_id
     ORDER BY sh.shipped_at DESC NULLS LAST LIMIT 100`,
  );
}

export async function payments() {
  return tenantQuery(
    `SELECT p.id, p.processor, p.amount, p.currency_code, p.status, p.created_at, o.order_number
     FROM payments p JOIN orders o ON o.id = p.order_id
     ORDER BY p.created_at DESC LIMIT 100`,
  );
}

export async function campaigns() {
  return tenantQuery(
    `SELECT mc.id, s.trading_name AS seller, mc.channel, mc.compliance_status,
            mc.brand_voice_score, mc.human_approved, mc.created_at
     FROM marketing_campaigns mc JOIN sellers s ON s.id = mc.seller_id
     ORDER BY mc.created_at DESC LIMIT 100`,
  );
}

export async function models() {
  return tenantQuery(
    `SELECT model_key, model_version, stage, status, rollout_pct, spend_cap_usd,
            kill_switch, fallback_model_version, eval_summary_json, updated_at
     FROM admin_ai_model_controls
     WHERE tenant_id = $1 ORDER BY model_key`, [TENANT_ID],
  );
}

export async function cases() {
  const [queue, approvals, actions] = await Promise.all([
    tenantQuery(
      `SELECT c.case_code, c.domain, c.severity, c.status, c.title, c.description,
              c.entity_type, c.entity_id, c.sla_due_at, c.assignee_id, c.resolved_at
       FROM admin_cases c WHERE c.tenant_id = $1
       ORDER BY CASE c.severity WHEN 'P1' THEN 1 WHEN 'P2' THEN 2 ELSE 3 END, c.sla_due_at`,
      [TENANT_ID],
    ),
    tenantQuery(
      `SELECT a.id, a.tier, a.action, a.domain, a.entity_id, a.status, a.reason,
              a.requester_id, a.approver_id, a.requested_at, a.decided_at
       FROM admin_approvals a WHERE a.tenant_id = $1
       ORDER BY a.requested_at DESC LIMIT 100`, [TENANT_ID],
    ),
    tenantQuery(
      `SELECT id, actor_id, action, domain, tier, entity_type, entity_id, reason, occurred_at
       FROM admin_actions WHERE tenant_id = $1 ORDER BY occurred_at DESC LIMIT 100`, [TENANT_ID],
    ),
  ]);
  return { queue, approvals, actions };
}

export async function access(userId: string) {
  const [roles, session] = await Promise.all([
    tenantQuery(
      `SELECT r.code, r.name, r.description FROM admin_roles r
       JOIN admin_staff_roles sr ON sr.role_id = r.id
       WHERE sr.staff_user_id = $1 AND sr.active = true AND r.active = true`, [userId],
    ),
    tenantQuery<{ break_glass: boolean; elevation_scope: string | null; elevation_expires_at: Date | null }>(
      `SELECT break_glass, elevation_scope, elevation_expires_at FROM admin_sessions
       WHERE staff_user_id = $1 AND ends_at IS NULL
       ORDER BY started_at DESC LIMIT 1`, [userId],
    ),
  ]);
  const s = session[0];
  return {
    roles,
    elevation: s ? {
      active: !!s.elevation_expires_at && s.elevation_expires_at > new Date(),
      breakGlass: s.break_glass,
      scope: s.elevation_scope,
      expiresAt: s.elevation_expires_at,
    } : { active: false, breakGlass: false, scope: null, expiresAt: null },
  };
}

export async function writeAudit(
  client: PoolClient,
  actorId: string,
  fields: {
    domain: string; tier: string; action: string; entityType: string;
    entityId?: string | null; reason: string; requestId?: string | null;
    before?: unknown; after?: unknown;
  },
): Promise<void> {
  await client.query(
    `INSERT INTO admin_actions
       (tenant_id, actor_id, domain, tier, action, entity_type, entity_id,
        reason, request_id, before_json, after_json)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [
      TENANT_ID, actorId, fields.domain, fields.tier, fields.action,
      fields.entityType, fields.entityId ?? null, fields.reason,
      fields.requestId ?? null,
      fields.before ? JSON.stringify(fields.before) : null,
      fields.after ? JSON.stringify(fields.after) : null,
    ],
  );
}

export { withTenant, tenantQuery, TENANT_ID };
