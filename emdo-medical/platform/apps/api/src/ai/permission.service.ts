import { Injectable } from '@nestjs/common';
import { CountryProfileService } from '../config/country-profile.service';
import { RequestContext } from '../common/auth/request-context';
import { assertAgentEnabled, assertAgentRole, assertCapability, type AgentDefinition } from './agent-registry';

/** Policy envelope that runs before prompt resolution or model invocation. */
@Injectable()
export class AiPermissionService {
  constructor(private readonly profiles: CountryProfileService) {}

  authorise(
    agent: AgentDefinition,
    capability: string,
    ctx: RequestContext,
    patientId?: string,
  ): void {
    this.profiles.assertUsable(ctx.countryCode);
    assertAgentEnabled(agent);
    assertCapability(agent, capability);
    assertAgentRole(agent, ctx.roles);

    if (agent.dataDomain === 'commercial' && patientId) {
      throw new Error('AI_DATA_DOMAIN_FORBIDDEN');
    }

    if (capability === 'explain_authorised_record') {
      if (!patientId) throw new Error('AI_PATIENT_REQUIRED');
      if (patientId !== ctx.userId) throw new Error('AI_PATIENT_MISMATCH');
      if (!ctx.roles.some((role) => role === 'patient' || role === 'caregiver')) {
        throw new Error('AI_ROLE_NOT_ALLOWED');
      }
    }

    if (capability === 'draft_documentation_outline') {
      if (!patientId) throw new Error('AI_PATIENT_REQUIRED');
      if (!ctx.roles.includes('clinician')) throw new Error('AI_ROLE_NOT_ALLOWED');
    }
  }

  /** Context retrieval is denied by default for agents with no declared data domain. */
  assertContextAllowed(agent: AgentDefinition, capability: string): void {
    if (agent.dataDomain === 'none' || agent.maxContextRecords === 0) {
      if (capability === 'explain_authorised_record' || capability === 'draft_documentation_outline') {
        throw new Error('AI_DATA_DOMAIN_FORBIDDEN');
      }
    }
    if (agent.dataDomain === 'commercial') throw new Error('AI_DATA_DOMAIN_FORBIDDEN');
  }
}
