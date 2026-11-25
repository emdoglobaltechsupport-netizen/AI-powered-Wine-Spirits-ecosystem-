import { AI_AGENT_IDS } from '@emdo/shared';
import {
  AI_AGENTS, assertAgentEnabled, assertAgentRole, assertCapability,
  assertRegisteredAgentIds, getAgent, listAgents,
} from './agent-registry';

describe('AI agent registry', () => {
  it('registers all ten departments and enables only the two gated agents', () => {
    expect(listAgents().map((agent) => agent.id).sort()).toEqual([...AI_AGENT_IDS].sort());
    expect(AI_AGENTS.filter((agent) => agent.state === 'enabled').map((agent) => agent.id)).toEqual([
      'patient_assistant',
      'doctor_documentation',
    ]);
    expect(() => assertRegisteredAgentIds()).not.toThrow();
  });

  it('never gives commercial agents a PHI domain or context budget', () => {
    for (const agent of AI_AGENTS.filter((item) => item.dataDomain === 'commercial')) {
      expect(agent.state).toBe('disabled');
      expect(agent.maxContextRecords).toBe(0);
      expect(agent.dataDomain).toBe('commercial');
    }
  });

  it('enforces agent existence, state, capability and role', () => {
    expect(() => getAgent('not_an_agent')).toThrow('AI_AGENT_NOT_FOUND');
    expect(() => assertAgentEnabled(getAgent('marketing'))).toThrow('AI_AGENT_DISABLED');
    expect(() => assertCapability(getAgent('patient_assistant'), 'prescribe')).toThrow('AI_CAPABILITY_NOT_ALLOWED');
    expect(() => assertAgentRole(getAgent('doctor_documentation'), ['patient'])).toThrow('AI_ROLE_NOT_ALLOWED');
    expect(() => assertAgentRole(getAgent('doctor_documentation'), ['clinician'])).not.toThrow();
  });
});
