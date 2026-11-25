import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AiLabel } from '@emdo/shared';
import type { PromptDefinition } from './prompt-registry';

export interface AiSourceReference {
  kind: 'clinical_record';
  id: string;
  version: number;
  resourceType: string;
}

export interface GatewayContext {
  recordCount: number;
  resourceTypes: string[];
  sources: AiSourceReference[];
}

export interface GatewayRequest {
  prompt: PromptDefinition;
  agentId: string;
  capability: string;
  label: AiLabel;
  context: GatewayContext;
}

export interface GatewayResponse {
  text: string;
  label: AiLabel;
  sources: AiSourceReference[];
  model: string;
  modelVersion: string;
  requiresReview: boolean;
  safetyRules: readonly string[];
}

const MODEL = 'emdo-offline-policy-gateway';
const MODEL_VERSION = '0.1.0';

/**
 * Single egress boundary for every AI department. The only implemented
 * adapter is offline and deterministic: it never calls a network service and
 * never receives clinical free text. Production fails closed until an
 * approved, tested provider is configured by owner decision.
 */
@Injectable()
export class ModelGateway {
  constructor(private readonly config: ConfigService) {}

  async generate(request: GatewayRequest): Promise<GatewayResponse> {
    const backend = this.config.get<string>('aiModelBackend') ?? 'offline';
    const nodeEnv = this.config.get<string>('nodeEnv') ?? 'development';
    if (backend !== 'offline' || nodeEnv === 'production') {
      throw new Error('AI_MODEL_BACKEND_NOT_CONFIGURED');
    }
    return this.offline(request);
  }

  private offline(request: GatewayRequest): GatewayResponse {
    const { capability, context, label, prompt } = request;
    const types = context.resourceTypes.length ? context.resourceTypes.join(', ') : 'none';
    const refs = context.sources.map((source) => `${source.resourceType} v${source.version} (${source.id})`);
    const sourceLine = refs.length ? ` Sources: ${refs.join('; ')}.` : ' No record sources were supplied.';

    let text: string;
    switch (capability) {
      case 'general_information':
        text = `I can help you locate authorised information and prepare questions for a clinician. ${label} `
          + 'I cannot diagnose, prescribe, interpret results, or make clinical decisions.';
        break;
      case 'explain_authorised_record':
        text = context.recordCount === 0
          ? `No authorised records were found for this request. ${label} Ask a clinician to review the source record directly.`
          : `I found ${context.recordCount} authorised record(s) of type ${types}. ${sourceLine} ${label} `
            + 'I cannot interpret these records, diagnose, prescribe, or recommend treatment.';
        break;
      case 'draft_documentation_outline':
        text = `DRAFT DOCUMENTATION OUTLINE — no findings or conclusions. Authorised sources: ${types}. `
          + `${sourceLine} ${label} A named clinician must review and complete the note; this output is not a clinical record.`;
        break;
      case 'escalate_to_human':
        text = `A human handoff is available. ${label} No autonomous action has been taken.`;
        break;
      default:
        throw new Error('AI_CAPABILITY_NOT_ALLOWED');
    }

    return {
      text,
      label,
      sources: context.sources,
      model: MODEL,
      modelVersion: MODEL_VERSION,
      requiresReview: prompt.safetyRules.includes('clinician_review_required'),
      safetyRules: prompt.safetyRules,
    };
  }
}
