import { AI_LABELS, type AiAgentId, type AiLabel } from '@emdo/shared';
import { AI_AGENTS, assertCapability, getAgent } from './agent-registry';

export interface PromptDefinition {
  id: string;
  agentId: AiAgentId;
  capability: string;
  version: string;
  language: 'en';
  reviewed: boolean;
  reviewedByRole: string;
  label: AiLabel;
  template: string;
  safetyRules: readonly string[];
}

/**
 * Versioned, code-reviewed prompt registry. Prompts are configuration, not
 * patient data: no prompt body may contain identifiers or clinical content.
 * Runtime editing is deliberately absent in the prototype.
 */
export const AI_PROMPTS: readonly PromptDefinition[] = [
  {
    id: 'patient-general-001',
    agentId: 'patient_assistant',
    capability: 'general_information',
    version: '1.0.0',
    language: 'en',
    reviewed: true,
    reviewedByRole: 'clinical_safety_review',
    label: AI_LABELS.nonClinical,
    template:
      'You are the EMDO Patient Assistant. Help the user find authorised information and prepare questions. '
      + 'State: "{label}". Never diagnose, interpret results, prescribe, recommend treatment or make a clinical decision.',
    safetyRules: ['no_diagnosis', 'no_prescription', 'no_result_interpretation', 'no_final_decision'],
  },
  {
    id: 'patient-record-001',
    agentId: 'patient_assistant',
    capability: 'explain_authorised_record',
    version: '1.0.0',
    language: 'en',
    reviewed: true,
    reviewedByRole: 'clinical_safety_review',
    label: AI_LABELS.nonClinical,
    template:
      'Use only the supplied authorised source references ({recordCount} record(s): {resourceTypes}). '
      + 'Describe where the information came from; do not interpret or conclude. State: "{label}".',
    safetyRules: ['authorised_sources_only', 'no_diagnosis', 'no_result_interpretation'],
  },
  {
    id: 'doctor-outline-001',
    agentId: 'doctor_documentation',
    capability: 'draft_documentation_outline',
    version: '1.0.0',
    language: 'en',
    reviewed: true,
    reviewedByRole: 'clinical_safety_review',
    label: AI_LABELS.draftReview,
    template:
      'Produce a neutral documentation outline from {recordCount} consented source(s): {resourceTypes}. '
      + 'List source references only. Do not state findings, diagnosis, treatment, prescription or assessment. '
      + 'State: "{label}".',
    safetyRules: ['consented_sources_only', 'no_findings', 'no_diagnosis', 'no_prescription', 'clinician_review_required'],
  },
  {
    id: 'escalation-patient-001',
    agentId: 'patient_assistant',
    capability: 'escalate_to_human',
    version: '1.0.0',
    language: 'en',
    reviewed: true,
    reviewedByRole: 'clinical_safety_review',
    label: AI_LABELS.nonClinical,
    template: 'Offer a human escalation route. State: "{label}". Do not collect clinical free text.',
    safetyRules: ['no_clinical_free_text', 'human_handoff'],
  },
  {
    id: 'escalation-doctor-001',
    agentId: 'doctor_documentation',
    capability: 'escalate_to_human',
    version: '1.0.0',
    language: 'en',
    reviewed: true,
    reviewedByRole: 'clinical_safety_review',
    label: AI_LABELS.draftReview,
    template: 'Offer escalation to another named human reviewer. State: "{label}". No autonomous action.',
    safetyRules: ['human_handoff', 'no_autonomous_action'],
  },
];

function assertPromptRegistryComplete(): void {
  for (const agent of AI_AGENTS.filter((item) => item.state === 'enabled')) {
    for (const capability of agent.capabilities) {
      const found = AI_PROMPTS.find((prompt) => prompt.agentId === agent.id
        && prompt.capability === capability && prompt.reviewed);
      if (!found) throw new Error('AI_PROMPT_REGISTRY_INCOMPLETE');
    }
  }
}

assertPromptRegistryComplete();

export function resolvePrompt(agentId: string, capability: string, language = 'en'): PromptDefinition {
  const agent = getAgent(agentId);
  assertCapability(agent, capability);
  const candidates = AI_PROMPTS
    .filter((prompt) => prompt.agentId === agent.id && prompt.capability === capability
      && prompt.language === language && prompt.reviewed)
    .sort((a, b) => b.version.localeCompare(a.version));
  const prompt = candidates[0];
  if (!prompt) throw new Error('AI_PROMPT_NOT_FOUND');
  return prompt;
}

export function listPrompts(): readonly PromptDefinition[] {
  return AI_PROMPTS;
}
