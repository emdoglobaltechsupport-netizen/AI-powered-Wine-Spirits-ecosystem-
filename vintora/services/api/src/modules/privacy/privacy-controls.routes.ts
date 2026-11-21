import { Router } from 'express';
import { z } from 'zod';
import {
  evaluateDataGovernanceUse,
  evaluatePersonalDataUse,
  LAWFUL_BASES,
  PERSONAL_DATA_CATEGORIES,
  PRIVACY_PURPOSES,
  INTERNAL_AUDIT_PURPOSES,
  DATA_IDENTITY_DOMAINS,
  type DataIdentityDomain,
  type LawfulBasis,
  type PersonalDataCategory,
  type PrivacyPurpose,
} from '@vintora/shared';
import { asyncHandler } from '../../lib/async.js';
import { requireUser } from '../../middleware/auth.js';
import { bodyOf, queryOf, validate } from '../../middleware/validate.js';
import * as repo from './privacy-controls.repo.js';

export const privacyControlsRouter = Router();

privacyControlsRouter.use(requireUser);

privacyControlsRouter.get('/controls', asyncHandler(async (_req, res) => {
  res.json(await repo.controls());
}));

privacyControlsRouter.get('/consents', asyncHandler(async (req, res) => {
  res.json({ items: await repo.consents(req.auth!.userId) });
}));

const consentSchema = z.object({
  correlationId: z.string().trim().min(6).max(120),
  purpose: z.enum(['recommendations', 'closed_loop_personalization', 'marketing', 'experimentation']),
  decision: z.enum(['opt_in', 'withdraw']),
  policyVersion: z.literal('v1'),
  locale: z.enum(['en', 'fr', 'es']).default('en'),
}).strict();

privacyControlsRouter.post('/consents',
  validate({ body: consentSchema }),
  asyncHandler(async (req, res) => {
    const input = bodyOf<z.infer<typeof consentSchema>>(req);
    const record = await repo.recordConsent({
      correlationId: input.correlationId,
      userId: req.auth!.userId,
      purpose: input.purpose as PrivacyPurpose,
      state: input.decision,
      locale: input.locale,
      requestId: req.id,
    });
    res.json({ consent: record, defaults: 'off', withdrawalAvailable: true });
  }));

const evaluateSchema = z.object({
  correlationId: z.string().trim().min(6).max(120),
  purpose: z.enum(['recommendations', 'closed_loop_personalization', 'marketing', 'experimentation']),
  dataCategory: z.enum([
    'taste_profile', 'catalogue_interactions', 'purchase_history', 'consumption_events',
    'email_engagement', 'experiment_exposure', 'age_verified_region', 'age_documents',
    'health_adjacent', 'precise_location', 'biometric',
  ]),
  collectedAt: z.string().datetime().optional(),
  noticeVersion: z.literal('v1'),
}).strict();

/**
 * Advisory evaluation only. Consent state is read from the authenticated
 * subject's stored records; a caller cannot assert their own consent claims.
 */
privacyControlsRouter.post('/data-use/evaluate',
  validate({ body: evaluateSchema }),
  asyncHandler(async (req, res) => {
    const input = bodyOf<z.infer<typeof evaluateSchema>>(req);
    const consents = await repo.consents(req.auth!.userId);
    const decision = evaluatePersonalDataUse({
      correlationId: input.correlationId,
      tenantId: req.auth!.tenantId,
      actorUserId: req.auth!.userId,
      purpose: input.purpose as PrivacyPurpose,
      dataCategory: input.dataCategory as PersonalDataCategory,
      consents,
      collectedAt: input.collectedAt,
      noticeVersion: input.noticeVersion,
    });
    await repo.recordDecision(decision, req.auth!.userId, req.id);
    res.json(decision);
  }));

const governanceEvaluateSchema = z.object({
  correlationId: z.string().trim().min(6).max(120),
  purpose: z.string().refine((value) =>
    (PRIVACY_PURPOSES as readonly string[]).includes(value) ||
    (INTERNAL_AUDIT_PURPOSES as readonly string[]).includes(value)),
  dataCategory: z.string().refine((value) => (PERSONAL_DATA_CATEGORIES as readonly string[]).includes(value)),
  lawfulBasis: z.string().refine((value) => (LAWFUL_BASES as readonly string[]).includes(value)),
  identityDomain: z.string().refine((value) => Object.prototype.hasOwnProperty.call(DATA_IDENTITY_DOMAINS, value)).nullish(),
  crossDomainJoin: z.boolean().default(false),
  crossBorder: z.object({
    targetRegion: z.string().trim().min(2).max(40),
    mechanism: z.string().trim().min(2).max(120).nullish(),
    transferImpactAssessmentRef: z.string().trim().min(2).max(120).nullish(),
  }).nullable().optional(),
  collectedAt: z.string().datetime().optional(),
  noticeVersion: z.literal('v1'),
}).strict();

privacyControlsRouter.post('/data-governance/evaluate',
  validate({ body: governanceEvaluateSchema }),
  asyncHandler(async (req, res) => {
    const input = bodyOf<z.infer<typeof governanceEvaluateSchema>>(req);
    const consents = await repo.consents(req.auth!.userId);
    const decision = evaluateDataGovernanceUse({
      correlationId: input.correlationId,
      tenantId: req.auth!.tenantId,
      actorUserId: req.auth!.userId,
      purpose: input.purpose as Parameters<typeof evaluateDataGovernanceUse>[0]['purpose'],
      dataCategory: input.dataCategory as PersonalDataCategory,
      lawfulBasis: input.lawfulBasis as LawfulBasis,
      consents,
      identityDomain: input.identityDomain as DataIdentityDomain | null | undefined,
      crossDomainJoin: input.crossDomainJoin,
      crossBorder: input.crossBorder,
      collectedAt: input.collectedAt,
      noticeVersion: input.noticeVersion,
    });
    await repo.recordGovernanceDecision(decision, req.auth!.userId, req.id);
    res.json({ ...decision, externalEffects: false });
  }));

const exportSchema = z.object({
  correlationId: z.string().trim().min(6).max(120),
  confirmation: z.literal('EXPORT_MY_DATA'),
  reason: z.string().trim().min(8).max(500),
}).strict();

privacyControlsRouter.post('/export',
  validate({ body: exportSchema }),
  asyncHandler(async (req, res) => {
    const input = bodyOf<z.infer<typeof exportSchema>>(req);
    const result = await repo.createRequest({
      correlationId: input.correlationId,
      userId: req.auth!.userId,
      requestType: 'export',
      reason: input.reason,
      requestId: req.id,
    });
    res.status(202).json(result);
  }));

const deletionSchema = z.object({
  correlationId: z.string().trim().min(6).max(120),
  confirmation: z.literal('DELETE_MY_DATA'),
  reason: z.string().trim().min(8).max(500),
}).strict();

privacyControlsRouter.post('/deletion-request',
  validate({ body: deletionSchema }),
  asyncHandler(async (req, res) => {
    const input = bodyOf<z.infer<typeof deletionSchema>>(req);
    const result = await repo.createRequest({
      correlationId: input.correlationId,
      userId: req.auth!.userId,
      requestType: 'deletion',
      reason: input.reason,
      requestId: req.id,
    });
    res.status(202).json(result);
  }));

privacyControlsRouter.get('/audit',
  validate({ query: z.object({ limit: z.coerce.number().int().min(1).max(200).default(100) }).strict() }),
  asyncHandler(async (req, res) => {
    const { limit } = queryOf<{ limit: number }>(req);
    res.json({ items: await repo.audit(req.auth!.userId, limit) });
  }));
