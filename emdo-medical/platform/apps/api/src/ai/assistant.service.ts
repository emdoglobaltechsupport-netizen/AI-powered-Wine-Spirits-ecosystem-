import { Injectable } from '@nestjs/common';
import { getAgent, type AgentDefinition } from './agent-registry';
import { RequestContext } from '../common/auth/request-context';
import { AiPermissionService } from './permission.service';
import { resolvePrompt } from './prompt-registry';
import { AiContextService } from './context.service';
import { ModelGateway, type AiSourceReference } from './model-gateway';
import { AiAuditService } from './ai-audit.service';
import { AskAiDto } from './dto/ai.dto';

const MODEL = 'emdo-offline-policy-gateway';
const MODEL_VERSION = '0.1.0';

export interface AiAskResponse {
  agentId: string;
  capability: string;
  promptVersion: string;
  language: 'en';
  text: string;
  label: string;
  sources: AiSourceReference[];
  sourceCount: number;
  model: string;
  modelVersion: string;
  requiresReview: boolean;
  humanApprovalRequired: boolean;
  safetyRules: readonly string[];
  outcome: 'answered';
}

/** Policy failures are blocked, implementation/configuration failures are errors. */
const POLICY_CODES = new Set([
  'AI_AGENT_DISABLED', 'AI_CAPABILITY_NOT_ALLOWED', 'AI_ROLE_NOT_ALLOWED',
  'AI_DATA_DOMAIN_FORBIDDEN', 'AI_PATIENT_REQUIRED', 'AI_PATIENT_MISMATCH',
  'AI_CONSENT_REQUIRED', 'FRESH_AUTH_REQUIRED', 'COUNTRY_MISMATCH',
  'COUNTRY_PROFILE_NOT_USABLE', 'COUNTRY_PROFILE_MISSING',
]);

/**
 * Central, single-path AI interaction pipeline. Free-text prompts are used for
 * interaction only: they are never persisted, logged, echoed or sent to an
 * external service. Every response carries a fixed safety label and sources.
 */
@Injectable()
export class AiAssistantService {
  constructor(
    private readonly permissions: AiPermissionService,
    private readonly context: AiContextService,
    private readonly gateway: ModelGateway,
    private readonly audit: AiAuditService,
  ) {}

  async ask(ctx: RequestContext, dto: AskAiDto): Promise<AiAskResponse> {
    const agent = getAgent(dto.agentId);
    if (dto.prompt.trim().length === 0) throw new Error('AI_PROMPT_REQUIRED');

    try {
      this.permissions.authorise(agent, dto.capability, ctx, dto.patientId);
      const prompt = resolvePrompt(dto.agentId, dto.capability, dto.language ?? 'en');
      const retrieved = await this.context.retrieve(
        ctx, agent, dto.capability, dto.patientId, dto.resourceType,
      );
      const generated = await this.gateway.generate({
        prompt,
        agentId: dto.agentId,
        capability: dto.capability,
        label: prompt.label,
        context: retrieved,
      });

      await this.audit.interaction({
        ctx, agentId: agent.id, capability: dto.capability,
        promptVersion: prompt.version, model: generated.model,
        modelVersion: generated.modelVersion, dataDomain: agent.dataDomain,
        outcome: 'answered', decision: 'allowed', label: generated.label,
        sourceCount: retrieved.recordCount,
      });

      return {
        agentId: agent.id,
        capability: dto.capability,
        promptVersion: prompt.version,
        language: prompt.language,
        text: generated.text,
        label: generated.label,
        sources: generated.sources,
        sourceCount: retrieved.recordCount,
        model: generated.model,
        modelVersion: generated.modelVersion,
        requiresReview: generated.requiresReview,
        humanApprovalRequired: agent.requiresHumanReview,
        safetyRules: generated.safetyRules,
        outcome: 'answered',
      };
    } catch (error) {
      await this.recordFailure(ctx, agent, dto, error);
      throw error;
    }
  }

  /** Best-effort telemetry for denials. Never includes prompt text. */
  private async recordFailure(
    ctx: RequestContext,
    agent: AgentDefinition,
    dto: AskAiDto,
    error: unknown,
  ): Promise<void> {
    const code = error instanceof Error ? error.message.split(':')[0]?.trim() ?? 'ERROR' : 'ERROR';
    try {
      await this.audit.interaction({
        ctx, agentId: agent.id, capability: dto.capability,
        promptVersion: 'n/a', model: MODEL, modelVersion: MODEL_VERSION,
        dataDomain: agent.dataDomain,
        outcome: POLICY_CODES.has(code) ? 'blocked' : 'error',
        decision: 'denied', label: agent.label, sourceCount: 0,
      });
    } catch {
      // Telemetry must never turn a denied request into an accepted one.
    }
  }
}
