import { createHash } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../lib/async.js';
import { badRequest, forbidden, notFound } from '../../lib/errors.js';
import { requireAccess } from '../../middleware/access.js';
import { requireRole } from '../../middleware/auth.js';
import { bodyOf, paramsOf, validate } from '../../middleware/validate.js';
import * as repo from './admin.repo.js';
import { coverage } from './admin.coverage.js';
import { agentControlsRouter } from './agent-controls.routes.js';
import { marketingControlsRouter } from './marketing-controls.routes.js';

export const adminRouter = Router();

const READ_ROLES = ['super_admin', 'finance_ops', 'seller_ops', 'ai_ops', 'growth_ops', 'auditor'];
const WRITE_ROLES = ['super_admin'];
const read = requireRole(...READ_ROLES);
const write = requireRole(...WRITE_ROLES);
const internalAccess = requireAccess('admin:*:internal', { resourceType: 'admin' });

// Creating or ending elevation cannot itself require elevation. These two
// bootstrap routes still require an active Admin role and, for elevation,
// a reason and distinct named approver when break-glass is used.
const BOOTSTRAP_PATHS = new Set(['/elevation', '/session/end']);

adminRouter.use(read);
adminRouter.use((req, res, next) => {
  if (BOOTSTRAP_PATHS.has(req.path)) { next(); return; }
  internalAccess(req, res, next);
});

adminRouter.get('/overview', asyncHandler(async (_req, res) => res.json(await repo.overview())));
adminRouter.get('/users', asyncHandler(async (_req, res) => res.json({ items: await repo.users() })));
adminRouter.get('/sellers', asyncHandler(async (_req, res) => res.json({ items: await repo.sellers() })));
adminRouter.get('/orders', asyncHandler(async (_req, res) => res.json({ items: await repo.orders() })));
adminRouter.get('/logistics', asyncHandler(async (_req, res) => res.json({ items: await repo.logistics() })));
adminRouter.get('/payments', asyncHandler(async (_req, res) => res.json({ items: await repo.payments() })));
adminRouter.get('/campaigns', asyncHandler(async (_req, res) => res.json({ items: await repo.campaigns() })));
adminRouter.get('/ai', asyncHandler(async (_req, res) => res.json({ items: await repo.models() })));
adminRouter.get('/cases', asyncHandler(async (_req, res) => res.json(await repo.cases())));
adminRouter.get('/access', asyncHandler(async (req, res) => res.json(await repo.access(req.auth!.userId))));
adminRouter.get('/coverage', asyncHandler(async (_req, res) => res.json(await coverage())));

adminRouter.get('/evidence/export', asyncHandler(async (req, res) => {
  const { actions } = await repo.cases();
  const hash = createHash('sha256').update(JSON.stringify(actions)).digest('hex');
  res.json({
    exportedBy: req.auth!.userId,
    note: 'Simulated evidence manifest — no live PII',
    records: actions.length,
    manifest: `sha256:${hash.slice(0, 16)}`,
    actions,
  });
}));

const approverSchema = z.object({
  reason: z.string().trim().min(8).max(500),
  approver: z.enum(['finance_ops', 'seller_ops', 'ai_ops', 'growth_ops', 'auditor']),
}).strict();

async function resolveApprover(code: string): Promise<string> {
  // Named approvers are deliberately ordinary users, not Admin role holders.
  // Distinctness is enforced by each caller against the requester's user id.
  const rows = await repo.tenantQuery<{ id: string }>(
    'SELECT id FROM users WHERE email = $1 AND status = $2',
    [`${code}@vintora.local`, 'active'],
  );
  const id = rows[0]?.id;
  if (!id) throw badRequest('Approver account is not available');
  return id;
}

adminRouter.post('/cases/:code/assign', write,
  validate({ params: z.object({ code: z.string().min(3).max(40) }).strict() }),
  asyncHandler(async (req, res) => {
    const { code } = paramsOf<{ code: string }>(req);
    const result = await repo.withTenant(async (client) => {
      const updated = await client.query<{ case_code: string; status: string }>(
        `UPDATE admin_cases SET status = 'assigned', assignee_id = $1, updated_at = now()
         WHERE case_code = $2 AND tenant_id = $3 RETURNING case_code, status`,
        [req.auth!.userId, code, repo.TENANT_ID],
      );
      if (!updated.rowCount) throw notFound('Case not found');
      await repo.writeAudit(client, req.auth!.userId, {
        domain: 'cases', tier: 'T1', action: 'Assign case', entityType: 'case',
        entityId: code, reason: 'Assigned to current operator', requestId: req.id,
      });
      return updated.rows[0]!;
    });
    res.json(result);
  }),
);

const decisionSchema = approverSchema.extend({ decision: z.enum(['approve', 'reject']) }).strict();

adminRouter.post('/approvals/:id/decide', write,
  validate({
    params: z.object({ id: z.string().uuid() }).strict(),
    body: decisionSchema,
  }),
  asyncHandler(async (req, res) => {
    const { id } = paramsOf<{ id: string }>(req);
    const { reason, approver, decision } = bodyOf<z.infer<typeof decisionSchema>>(req);
    const result = await repo.withTenant(async (client) => {
      const found = await client.query<{ requester_id: string; tier: string; action: string; status: string }>(
        'SELECT requester_id, tier, action, status FROM admin_approvals WHERE id = $1 AND tenant_id = $2',
        [id, repo.TENANT_ID],
      );
      const approval = found.rows[0];
      if (!approval) throw notFound('Approval not found');
      if (approval.status !== 'pending') throw badRequest('Approval is no longer pending');
      const approverId = await resolveApprover(approver);
      if (approverId === approval.requester_id) throw forbidden('Requester cannot approve their own action');

      const updated = await client.query(
        `UPDATE admin_approvals SET status = $1, approver_id = $2, decided_at = now(), decision_reason = $3
         WHERE id = $4 RETURNING id, status`,
        [decision === 'approve' ? 'approved' : 'rejected', approverId, reason, id],
      );
      await repo.writeAudit(client, req.auth!.userId, {
        domain: 'audit', tier: approval.tier,
        action: `${decision === 'approve' ? 'Approved' : 'Rejected'} ${approval.action}`,
        entityType: 'approval', entityId: id, reason: `${reason} · approver ${approver}`,
        requestId: req.id,
      });
      return updated.rows[0]!;
    });
    res.json(result);
  }),
);

adminRouter.post('/cases/:code/escalate', write,
  validate({ params: z.object({ code: z.string().min(3).max(40) }).strict() }),
  asyncHandler(async (req, res) => {
    const { code } = paramsOf<{ code: string }>(req);
    const result = await repo.withTenant(async (client) => {
      const updated = await client.query<{ case_code: string; severity: string }>(
        `UPDATE admin_cases
         SET severity = CASE severity WHEN 'P3' THEN 'P2' WHEN 'P4' THEN 'P3' ELSE 'P1' END,
             status = 'escalated', updated_at = now()
         WHERE case_code = $1 AND tenant_id = $2 RETURNING case_code, severity`,
        [code, repo.TENANT_ID],
      );
      if (!updated.rowCount) throw notFound('Case not found');
      await repo.writeAudit(client, req.auth!.userId, {
        domain: 'cases', tier: 'T2', action: 'Escalate case', entityType: 'case',
        entityId: code, reason: 'Severity escalated by operator', requestId: req.id,
      });
      return updated.rows[0]!;
    });
    res.json(result);
  }),
);

adminRouter.post('/cases/:code/resolve', write,
  validate({
    params: z.object({ code: z.string().min(3).max(40) }).strict(),
    body: z.object({ reason: z.string().trim().min(8).max(500) }).strict(),
  }),
  asyncHandler(async (req, res) => {
    const { code } = paramsOf<{ code: string }>(req);
    const { reason } = bodyOf<{ reason: string }>(req);
    const result = await repo.withTenant(async (client) => {
      const updated = await client.query<{ case_code: string; status: string }>(
        `UPDATE admin_cases SET status = 'resolved', resolved_at = now(), outcome = $1, updated_at = now()
         WHERE case_code = $2 AND tenant_id = $3 RETURNING case_code, status`,
        [reason, code, repo.TENANT_ID],
      );
      if (!updated.rowCount) throw notFound('Case not found');
      await repo.writeAudit(client, req.auth!.userId, {
        domain: 'cases', tier: 'T2', action: 'Resolve case', entityType: 'case',
        entityId: code, reason, requestId: req.id,
      });
      return updated.rows[0]!;
    });
    res.json(result);
  }),
);

adminRouter.post('/ai/kill-switch', write,
  validate({ body: approverSchema }),
  asyncHandler(async (req, res) => {
    const { reason, approver } = bodyOf<z.infer<typeof approverSchema>>(req);
    const approverId = await resolveApprover(approver);
    if (approverId === req.auth!.userId) throw forbidden('Requester cannot approve their own kill-switch action');
    const result = await repo.withTenant(async (client) => {
      const rows = await client.query<{ model_key: string }>(
        'SELECT model_key FROM admin_ai_model_controls WHERE tenant_id = $1', [repo.TENANT_ID],
      );
      const keys = rows.rows.map((r) => r.model_key);
      const kill = await client.query<{ model_key: string }>(
        `UPDATE admin_ai_model_controls
         SET kill_switch = NOT kill_switch,
             status = CASE WHEN kill_switch THEN 'active' ELSE 'halted' END,
             updated_by = $2, updated_at = now()
         WHERE tenant_id = $1 RETURNING model_key, kill_switch, status`,
        [repo.TENANT_ID, req.auth!.userId],
      );
      await repo.writeAudit(client, req.auth!.userId, {
        domain: 'ai', tier: 'T4', action: 'Toggle AI kill switch', entityType: 'model',
        entityId: keys.join(','), reason: `${reason} · approver ${approver}`, requestId: req.id,
      });
      return kill.rows;
    });
    res.json({ models: result });
  }),
);

adminRouter.post('/ai/:key/promote', write,
  validate({
    params: z.object({ key: z.string().min(2).max(60) }).strict(),
    body: approverSchema,
  }),
  asyncHandler(async (req, res) => {
    const { key } = paramsOf<{ key: string }>(req);
    const { reason, approver } = bodyOf<z.infer<typeof approverSchema>>(req);
    const approverId = await resolveApprover(approver);
    if (approverId === req.auth!.userId) throw forbidden('Requester cannot approve their own action');
    const result = await repo.withTenant(async (client) => {
      const updated = await client.query(
        `UPDATE admin_ai_model_controls SET stage = 'champion', rollout_pct = 100,
                updated_by = $2, updated_at = now()
         WHERE tenant_id = $1 AND model_key = $3 RETURNING model_key, stage`,
        [repo.TENANT_ID, req.auth!.userId, key],
      );
      if (!updated.rowCount) throw notFound('Model not found');
      await repo.writeAudit(client, req.auth!.userId, {
        domain: 'ai', tier: 'T4', action: `Promote ${key}`, entityType: 'model',
        entityId: key, reason: `${reason} · approver ${approver}`, requestId: req.id,
      });
      return updated.rows[0]!;
    });
    res.json(result);
  }),
);

const elevationSchema = z.object({
  mode: z.enum(['jit', 'break_glass']),
  reason: z.string().trim().min(8).max(500),
  approver: z.enum(['finance_ops', 'seller_ops', 'ai_ops', 'growth_ops', 'auditor']).optional(),
  minutes: z.number().int().min(5).max(120).default(15),
}).strict();

adminRouter.post('/elevation', write,
  validate({ body: elevationSchema }),
  asyncHandler(async (req, res) => {
    const { mode, reason, approver, minutes } = bodyOf<z.infer<typeof elevationSchema>>(req);
    const approverId = approver ? await resolveApprover(approver) : null;
    if (mode === 'break_glass' && !approverId) throw badRequest('Break-glass requires a named approver');
    if (approverId === req.auth!.userId) throw forbidden('Requester cannot approve their own elevation');

    const result = await repo.withTenant(async (client) => {
      await client.query(
        `UPDATE admin_sessions SET ends_at = now()
         WHERE staff_user_id = $1 AND tenant_id = $2 AND ends_at IS NULL`,
        [req.auth!.userId, repo.TENANT_ID],
      );
      const inserted = await client.query(
        `INSERT INTO admin_sessions
           (tenant_id, staff_user_id, auth_method, mfa_verified, hardware_mfa,
            break_glass, elevation_scope, elevation_reason, approver_id,
            elevation_expires_at, roles_json)
         VALUES ($1, $2, 'local-session', true, true, $3, 'all', $4, $5,
                 now() + ($6 || ' minutes')::interval, $7)
         RETURNING id, break_glass, elevation_expires_at`,
        [repo.TENANT_ID, req.auth!.userId, mode === 'break_glass', reason, approverId,
         String(minutes), JSON.stringify(req.auth!.roles)],
      );
      await repo.writeAudit(client, req.auth!.userId, {
        domain: 'settings', tier: mode === 'break_glass' ? 'T4' : 'T2',
        action: mode === 'break_glass' ? 'Break-glass elevation' : 'JIT elevation',
        entityType: 'session', entityId: 'self', reason, requestId: req.id,
      });
      return inserted.rows[0]!;
    });
    res.status(201).json(result);
  }),
);

adminRouter.post('/session/end', write, asyncHandler(async (req, res) => {
  await repo.withTenant(async (client) => {
    await client.query(
      `UPDATE admin_sessions SET ends_at = now()
       WHERE staff_user_id = $1 AND tenant_id = $2 AND ends_at IS NULL`,
      [req.auth!.userId, repo.TENANT_ID],
    );
    await repo.writeAudit(client, req.auth!.userId, {
      domain: 'settings', tier: 'T1', action: 'End admin session',
      entityType: 'session', entityId: 'self', reason: 'Operator ended session', requestId: req.id,
    });
  });
  res.json({ ok: true });
}));

// AI marketing release and ADM-19 agent controls inherit the Admin role,
// time-boxed elevation and internal-access guards above.
adminRouter.use(marketingControlsRouter);
adminRouter.use(agentControlsRouter);
