import { Router } from 'express';
import { z } from 'zod';
import {
  COMMERCE_ALLOWED_RESULT_CODES,
  COMMERCE_ENFORCEMENT,
  COMMERCE_EVIDENCE_PREFIX,
  COMMERCE_MAX_AGE_EVIDENCE_HOURS,
  COMMERCE_MAX_EVIDENCE_AGE_MINUTES,
  COMMERCE_PROTOTYPE_MODE,
  COMMERCE_PUBLIC_LAUNCH,
  COMMERCE_REQUIRED_CONTROLS,
  COMMERCE_SAFEGUARDS_POLICY_VERSION,
  COMMERCE_SIMULATION_DENIED_JURISDICTIONS,
} from '@vintora/shared';
import { asyncHandler } from '../../lib/async.js';
import { requestJurisdiction } from '../../middleware/access.js';
import { requireUser } from '../../middleware/auth.js';
import { bodyOf, validate } from '../../middleware/validate.js';
import { evaluateCheckoutSafeguards } from './commerce-safeguards.service.js';

export const commerceSafeguardsRouter = Router();

commerceSafeguardsRouter.get('/commerce/safeguards/controls', requireUser, (_req, res) => {
  res.json({
    policyVersion: COMMERCE_SAFEGUARDS_POLICY_VERSION,
    prototypeMode: COMMERCE_PROTOTYPE_MODE,
    publicLaunch: COMMERCE_PUBLIC_LAUNCH,
    enforcement: COMMERCE_ENFORCEMENT,
    requiredControls: COMMERCE_REQUIRED_CONTROLS,
    allowedResultCodes: COMMERCE_ALLOWED_RESULT_CODES,
    evidencePrefix: COMMERCE_EVIDENCE_PREFIX,
    maxEvidenceAgeMinutes: COMMERCE_MAX_EVIDENCE_AGE_MINUTES,
    maxAgeEvidenceHours: COMMERCE_MAX_AGE_EVIDENCE_HOURS,
    simulationDeniedJurisdictions: COMMERCE_SIMULATION_DENIED_JURISDICTIONS,
    note: 'Fixture-only decisions. No real screening, AML, sanctions, PEP or payment adapter exists.',
  });
});

const evaluateSchema = z.object({
  jurisdiction: z.string().trim().min(2).max(30)
    .regex(/^[A-Za-z]+(?:_[A-Za-z]+)*$/).optional(),
}).strict();

commerceSafeguardsRouter.post('/commerce/safeguards/evaluate', requireUser, validate({ body: evaluateSchema }),
  asyncHandler(async (req, res) => {
    const { jurisdiction } = bodyOf<{ jurisdiction?: string }>(req);
    const outcome = await evaluateCheckoutSafeguards({
      tenantId: req.auth!.tenantId,
      userId: req.auth!.userId,
      jurisdiction: jurisdiction?.toUpperCase() ?? requestJurisdiction(req),
      ageVerified: req.auth!.ageVerified,
      ageVerifiedAt: req.auth!.ageVerifiedAt,
    }, req.id);
    res.json(outcome);
  }));
