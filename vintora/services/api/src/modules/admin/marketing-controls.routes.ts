import { createHash } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import {
  evaluateExternalMarketingAction,
  evaluateMarketingRelease,
  type MarketingDecision,
  type MarketingReleaseRequest,
} from '@vintora/shared';
import { asyncHandler } from '../../lib/async.js';
import { badRequest } from '../../lib/errors.js';
import { requireRole } from '../../middleware/auth.js';
import { bodyOf, queryOf, validate } from '../../middleware/validate.js';
import * as repo from './marketing-controls.repo.js';

export const marketingControlsRouter = Router();

const read = requireRole('super_admin', 'growth_ops', 'ai_ops', 'auditor');
const write = requireRole('super_admin', 'growth_ops', 'ai_ops');

marketingControlsRouter.use(read);

marketingControlsRouter.get('/marketing/controls', asyncHandler(async (_req, res) => {
  res.json(await repo.controls());
}));

marketingControlsRouter.get('/marketing/audit',
  validate({ query: z.object({ limit: z.coerce.number().int().min(1).max(200).default(100) }).strict() }),
  asyncHandler(async (req, res) => {
    const { limit } = queryOf<{ limit: number }>(req);
    res.json({ items: await repo.audit(limit) });
  }));

const approvalSchema = z.object({
  approver: z.enum(['growth_ops', 'ai_ops', 'auditor']),
  reason: z.string().trim().min(8).max(500),
  expiresAt: z.string().datetime().optional(),
}).strict();

const provenanceSchema = z.object({
  campaignId: z.string().trim().min(3).max(120),
  createdBy: z.string().trim().min(3).max(200),
  promptHash: z.string().trim().min(8).max(200),
  evidenceRefs: z.array(z.string().trim().min(3).max(200)).min(1).max(50),
  modelOrAdapter: z.string().trim().min(3).max(120),
  reviewedAt: z.string().datetime(),
  version: z.string().trim().min(1).max(20),
}).strict();

const externalActionSchema = z.object({
  correlationId: z.string().trim().min(6).max(120),
  campaignId: z.string().trim().min(3).max(120),
  action: z.enum(['preview', 'approval', 'pause', 'kill_switch']),
  channel: z.enum(['sandbox', 'prototype_local', 'live', 'ad_platform', 'email_send', 'social_publish', 'seo_publish', 'influencer_outreach', 'paid_search', 'paid_social']).default('sandbox'),
  claims: z.array(z.string().trim().min(3).max(500)).min(1).max(50),
  audienceSegments: z.array(z.string().trim().min(2).max(80)).min(1).max(50),
  approval: z.object({
    approverUserId: z.string().trim().min(3).max(200),
    actorUserId: z.string().trim().min(3).max(200),
    reason: z.string().trim().min(8).max(500),
    recordedAt: z.string().datetime(),
    promptHash: z.string().trim().min(8).max(200),
    modelVersion: z.string().trim().min(2).max(120),
    payloadHash: z.string().trim().min(8).max(200),
  }).nullable().optional(),
  preview: z.object({
    renderedVariantId: z.string().trim().min(2).max(120),
    audienceVerified: z.boolean(),
    verifiedFields: z.array(z.string().trim().min(2).max(80)).max(20),
  }).nullable().optional(),
  budget: z.object({
    ownerUserId: z.string().trim().min(3).max(200),
    limitUsd: z.number().min(0).max(0),
    requestedUsd: z.number().min(0).max(0),
  }).nullable().optional(),
  legalApproval: z.object({
    reviewer: z.string().trim().min(3).max(200),
    jurisdiction: z.string().trim().min(2).max(40),
    claimSetHash: z.string().trim().min(8).max(200),
    approvedAt: z.string().datetime(),
  }).nullable().optional(),
  killSwitch: z.object({
    activated: z.boolean(),
    reason: z.string().trim().min(8).max(500),
    scope: z.string().trim().min(2).max(80),
  }).nullable().optional(),
}).strict();

marketingControlsRouter.post('/marketing/external-actions/evaluate',
  write,
  validate({ body: externalActionSchema }),
  asyncHandler(async (req, res) => {
    const input = bodyOf<z.infer<typeof externalActionSchema>>(req);
    const result = evaluateExternalMarketingAction({
      correlationId: input.correlationId,
      tenantId: req.auth!.tenantId,
      actorUserId: req.auth!.userId,
      campaignId: input.campaignId,
      action: input.action,
      channel: input.channel,
      claims: input.claims,
      audienceSegments: input.audienceSegments,
      approval: input.approval && { ...input.approval, actorUserId: req.auth!.userId },
      preview: input.preview,
      budget: input.budget,
      legalApproval: input.legalApproval,
      killSwitch: input.killSwitch,
    });
    const auditAction = result.outcome === 'paused' || result.outcome === 'kill_switch' ? 'pause' : 'draft';
    const recorded: MarketingDecision = {
      allowed: result.allowed,
      code: result.code as MarketingDecision['code'],
      reason: result.reason,
      outcome: result.outcome === 'paused' || result.outcome === 'kill_switch' ? 'pause' : 'draft',
      requiresHumanApproval: result.requiresHumanApproval,
      requiresAlert: result.requiresAlert,
      advisoryOnly: true,
      audit: { ...result.audit, action: auditAction },
    };
    await repo.recordDecision(recorded, req.auth!.userId, req.id);
    res.json({ ...result, recordedAction: auditAction, releaseEnabled: false, liveEffects: false, externalEffects: false });
  }));

const evaluateSchema = z.object({
  correlationId: z.string().trim().min(6).max(120),
  campaignId: z.string().trim().min(3).max(120),
  action: z.enum(['draft', 'release', 'pause', 'rollback', 'budget_increase']),
  geography: z.string().trim().min(2).max(40),
  audienceSegments: z.array(z.string().trim().min(2).max(80)).min(1).max(50),
  claims: z.array(z.string().trim().min(3).max(500)).min(1).max(50),
  evidenceRefs: z.array(z.string().trim().min(3).max(200)).max(50).default([]),
  budgetIncreasePercent: z.number().min(0).max(100).default(0),
  approval: approvalSchema.nullable().optional(),
  provenance: provenanceSchema,
  alcoholValidation: z.object({
    completed: z.boolean(),
    passed: z.boolean(),
    reviewer: z.string().trim().min(3).max(200).optional(),
    jurisdiction: z.string().trim().min(2).max(40).optional(),
  }).strict().nullable().optional(),
  observedSpendVariancePct: z.number().min(0).max(1000).optional(),
  observedPerformanceShiftPct: z.number().min(0).max(1000).optional(),
}).strict();

/**
 * Advisory-only campaign evaluation. It persists an immutable decision record
 * and, for draft/pause/rollback, a simulated local state. It never releases a
 * campaign, changes a live budget, sends email or contacts an ad platform.
 */
marketingControlsRouter.post('/marketing/campaigns/evaluate',
  write,
  validate({ body: evaluateSchema }),
  asyncHandler(async (req, res) => {
    const input = bodyOf<z.infer<typeof evaluateSchema>>(req);
    // Policy denials are returned by the evaluator and appended to the audit
    // rather than rejected before a decision record exists.
    let approverUserId: string | undefined;
    if (input.approval) {
      try {
        approverUserId = await repo.resolveApprover(input.approval.approver);
      } catch (error) {
        throw badRequest(error instanceof Error ? error.message : 'Approver resolution failed');
      }
    }
    const distinctApprover = Boolean(approverUserId && approverUserId !== req.auth!.userId);

    const evaluation: MarketingReleaseRequest = {
      correlationId: input.correlationId,
      tenantId: req.auth!.tenantId,
      actorUserId: req.auth!.userId,
      campaignId: input.campaignId,
      action: input.action,
      geography: input.geography,
      audienceSegments: input.audienceSegments,
      claims: input.claims,
      evidenceRefs: input.evidenceRefs.length ? input.evidenceRefs : input.provenance.evidenceRefs,
      budgetIncreasePercent: input.budgetIncreasePercent,
      approval: input.approval && approverUserId ? {
        approverUserId,
        distinct: distinctApprover,
        reason: input.approval.reason,
        expiresAt: input.approval.expiresAt,
      } : null,
      provenance: input.provenance,
      alcoholValidation: input.alcoholValidation ?? null,
      observedSpendVariancePct: input.observedSpendVariancePct,
      observedPerformanceShiftPct: input.observedPerformanceShiftPct,
    };
    const decision = evaluateMarketingRelease(evaluation);
    await repo.recordDecision(decision, req.auth!.userId, req.id);

    if (decision.allowed && decision.outcome !== 'blocked') {
      const provenanceHash = createHash('sha256')
        .update(JSON.stringify(input.provenance))
        .digest('hex');
      await repo.recordCampaignState({
        campaignId: input.campaignId,
        actorUserId: req.auth!.userId,
        status: decision.outcome === 'pause' ? 'paused'
          : decision.outcome === 'rollback' ? 'rolled_back' : 'draft',
        provenanceHash,
      });
    }

    res.json({
      ...decision,
      releaseEnabled: false,
      liveEffects: false,
      alertRequired: decision.requiresAlert,
    });
  }));
