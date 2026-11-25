import { AI_LABELS } from '@emdo/shared';
import { resolvePrompt, listPrompts } from './prompt-registry';

describe('AI prompt registry', () => {
  it('resolves reviewed, versioned prompts for enabled capabilities', () => {
    const general = resolvePrompt('patient_assistant', 'general_information');
    expect(general.version).toBe('1.0.0');
    expect(general.reviewed).toBe(true);
    expect(general.label).toBe(AI_LABELS.nonClinical);

    const outline = resolvePrompt('doctor_documentation', 'draft_documentation_outline');
    expect(outline.safetyRules).toContain('clinician_review_required');
    expect(outline.label).toBe(AI_LABELS.draftReview);
  });

  it('refuses capabilities not declared by the agent', () => {
    expect(() => resolvePrompt('patient_assistant', 'prescribe')).toThrow('AI_CAPABILITY_NOT_ALLOWED');
  });

  it('does not ship prompts for disabled agents', () => {
    expect(listPrompts().filter((prompt) => prompt.agentId === 'marketing')).toHaveLength(0);
    expect(() => resolvePrompt('clinic_operations', 'operational_summary')).toThrow('AI_PROMPT_NOT_FOUND');
  });
});
