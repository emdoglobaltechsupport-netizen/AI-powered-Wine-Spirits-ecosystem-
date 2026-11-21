import { Router } from 'express';
import { z } from 'zod';
import { AGENT_TOOL_REGISTRY, evaluateAgentTool, type AgentToolRequest } from '@vintora/shared';
import { asyncHandler } from '../../lib/async.js';
import { badRequest } from '../../lib/errors.js';
import { requireAccess } from '../../middleware/access.js';
import { requireRole } from '../../middleware/auth.js';
import { bodyOf, queryOf, validate } from '../../middleware/validate.js';
import * as repo from './agent-controls.repo.js';

export const agentControlsRouter = Router();

const read = requireRole('super_admin', 'ai_ops', 'auditor', 'finance_ops', 'seller_ops', 'growth_ops');
const write = requireRole('super_admin');
const internalAccess = requireAccess('admin:*:internal', { resourceType: 'admin' });

agentControlsRouter.use(read);
agentControlsRouter.use(internalAccess);

agentControlsRouter.get('/agents/controls', asyncHandler(async (_req, res) => {
  res.json(await repo.controls());
}));

agentControlsRouter.get('/agents/audit',
  validate({ query: z.object({ limit: z.coerce.number().int().min(1).max(200).default(100) }).strict() }),
  asyncHandler(async (req, res) => {
    const { limit } = queryOf<{ limit: number }>(req);
    res.json({ items: await repo.audit(limit) });
  }));

const approvalSchema = z.object({
  approverUserId: z.string().trim().min(3).max(120),
  distinct: z.boolean(),
  reason: z.string().trim().min(8).max(500),
  expiresAt: z.string().datetime().optional(),
}).strict();

const evaluateSchema = z.object({
  correlationId: z.string().trim().min(6).max(120),
  agentId: z.string().trim().regex(/^[A-Z]{2,8}-\d{2}$/),
  toolId: z.string().trim().min(3).max(80),
  intent: z.enum(['advise', 'execute']),
  mode: z.enum(['advisory', 'assist', 'guarded_auto']),
  untrustedOutputAsInstructions: z.boolean().optional(),
  credentialProfile: z.enum(['tenant-readonly', 'tenant-scoped-limited']).optional(),
  networkAccess: z.string().trim().max(120).optional(),
  humanApproval: approvalSchema.nullable().optional(),
  testEvidence: z.object({ sandbox: z.boolean(), canary: z.boolean(), replay: z.boolean() }).strict().nullable().optional(),
}).strict();

/**
 * Advisory evaluation surface. It records the decision and tool call in the
 * append-only audit, but never performs an external effect: runtime execution
 * is disabled and the independent kill switch is engaged by default.
 */
agentControlsRouter.post('/agents/tools/evaluate',
  write,
  validate({ body: evaluateSchema }),
  asyncHandler(async (req, res) => {
    const input = bodyOf<z.infer<typeof evaluateSchema>>(req);
    const controls = await repo.controls();
    const expectedCredential = AGENT_TOOL_REGISTRY.find((tool) => tool.id === input.toolId)?.credentialProfile
      ?? 'tenant-readonly';
    const evaluation: AgentToolRequest = {
      correlationId: input.correlationId,
      tenantId: req.auth!.tenantId,
      actorUserId: req.auth!.userId,
      actorIsInternalStaff: Boolean(req.auth!.staff?.active),
      staffElevationValid: Boolean(req.auth!.staff?.elevationValid),
      agentId: input.agentId,
      toolId: input.toolId,
      intent: input.intent,
      mode: input.mode,
      untrustedOutputAsInstructions: input.untrustedOutputAsInstructions,
      credentialProfile: input.credentialProfile ?? expectedCredential,
      networkAccess: input.networkAccess ?? 'none',
      humanApproval: input.humanApproval,
      testEvidence: input.testEvidence,
      killSwitchEngaged: controls.killSwitch.engaged,
    };
    const decision = evaluateAgentTool(evaluation);
    await repo.recordDecision(decision, req.auth!.userId, req.id);
    res.json({
      ...decision,
      executionEnabled: controls.executionEnabled,
      killSwitchEngaged: controls.killSwitch.engaged,
    });
  }));

const killSwitchSchema = z.object({
  action: z.literal('engage'),
  correlationId: z.string().trim().min(6).max(120),
  reason: z.string().trim().min(8).max(500),
  approver: z.enum(['ai_ops', 'auditor']),
}).strict();

agentControlsRouter.post('/agents/kill-switch',
  write,
  validate({ body: killSwitchSchema }),
  asyncHandler(async (req, res) => {
    const input = bodyOf<z.infer<typeof killSwitchSchema>>(req);
    try {
      const state = await repo.engageKillSwitch({
        correlationId: input.correlationId,
        reason: input.reason,
        approverCode: input.approver,
        actorUserId: req.auth!.userId,
        requestId: req.id,
      });
      res.json({ killSwitch: state, executionEnabled: false });
    } catch (error) {
      throw badRequest(error instanceof Error ? error.message : 'Kill-switch action rejected');
    }
  }));
