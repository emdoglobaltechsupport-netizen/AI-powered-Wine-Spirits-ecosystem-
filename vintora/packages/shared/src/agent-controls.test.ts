import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AGENT_AUDIT_FIELDS,
  AGENT_EXECUTION_ENABLED,
  AGENT_TOOL_ALLOWLIST,
  AGENT_KILL_SWITCH_DEFAULT_ENGAGED,
  AGENT_KILL_SWITCH_SLO_SECONDS,
  AGENT_TOOL_REGISTRY,
  DENIED_AGENT_TOOLS,
  evaluateAgentTool,
  type AgentToolRequest,
} from './agent-controls.js';

const request = (overrides: Partial<AgentToolRequest> = {}): AgentToolRequest => ({
  correlationId: 'corr-001',
  tenantId: '00000000-0000-0000-0000-000000000001',
  actorUserId: 'staff-1',
  actorIsInternalStaff: true,
  staffElevationValid: true,
  agentId: 'SRE-01',
  toolId: 'metrics.read',
  intent: 'advise',
  mode: 'advisory',
  killSwitchEngaged: false,
  credentialProfile: 'tenant-readonly',
  networkAccess: 'none',
  ...overrides,
});

test('prototype posture is advisory-only with an engaged independent kill switch', () => {
  assert.equal(AGENT_EXECUTION_ENABLED, false);
  assert.equal(AGENT_KILL_SWITCH_DEFAULT_ENGAGED, true);
  assert.equal(AGENT_KILL_SWITCH_SLO_SECONDS, 60);
  assert.ok(AGENT_TOOL_REGISTRY.length > 0);
  assert.ok(DENIED_AGENT_TOOLS.includes('content.publish'));
  assert.ok(DENIED_AGENT_TOOLS.includes('campaign.spend'));
  assert.ok(DENIED_AGENT_TOOLS.includes('email.send'));
  assert.equal(Object.keys(AGENT_TOOL_ALLOWLIST).length, 24);
  for (const field of AGENT_AUDIT_FIELDS) assert.ok(field.length > 0);
});

test('unknown and explicitly denied tools are rejected before any model call', () => {
  const unknown = evaluateAgentTool(request({ toolId: 'shell.exec:unknown' }));
  assert.equal(unknown.allowed, false);
  assert.equal(unknown.code, 'unknown_tool');
  for (const toolId of ['content.publish', 'campaign.spend', 'email.send', 'secret.read', 'network.fetch']) {
    const denied = evaluateAgentTool(request({ toolId }));
    assert.equal(denied.allowed, false);
    assert.equal(denied.code, 'denied_tool');
  }
});

test('unknown agents and out-of-scope tools are denied by the per-agent allowlist', () => {
  const unknownAgent = evaluateAgentTool(request({ agentId: 'ZZ-99' }));
  assert.equal(unknownAgent.allowed, false);
  assert.equal(unknownAgent.code, 'unknown_agent');
  const outOfScope = evaluateAgentTool(request({ toolId: 'catalogue.read' }));
  assert.equal(outOfScope.allowed, false);
  assert.equal(outOfScope.code, 'agent_tool_not_allowed');
});

test('advisory use of an allowlisted tool succeeds with full audit fields', () => {
  const result = evaluateAgentTool(request());
  assert.equal(result.allowed, true);
  assert.equal(result.code, 'allowed');
  assert.equal(result.advisoryOnly, true);
  assert.equal(result.audit.decision, 'allowed');
  for (const field of AGENT_AUDIT_FIELDS) assert.ok(field in result.audit, `audit is missing ${field}`);
});

test('engaged kill switch stops all agent tool use', () => {
  const result = evaluateAgentTool(request({ killSwitchEngaged: true }));
  assert.equal(result.allowed, false);
  assert.equal(result.code, 'agent_kill_switch_engaged');
  assert.equal(result.audit.decision, 'denied');
});

test('untrusted tool output cannot become instructions (prompt injection)', () => {
  const result = evaluateAgentTool(request({ untrustedOutputAsInstructions: true }));
  assert.equal(result.allowed, false);
  assert.equal(result.code, 'prompt_injection_rejected');
});

test('credential and network isolation violations fail closed', () => {
  const credential = evaluateAgentTool(request({ credentialProfile: 'production-admin' }));
  assert.equal(credential.code, 'credential_isolation_violation');
  const network = evaluateAgentTool(request({ networkAccess: 'https://example.com' }));
  assert.equal(network.code, 'network_egress_denied');
});

test('missing correlation, tenant, actor or valid agent identity fails closed', () => {
  assert.equal(evaluateAgentTool(request({ correlationId: '' })).code, 'missing_context');
  assert.equal(evaluateAgentTool(request({ tenantId: '' })).code, 'missing_context');
  assert.equal(evaluateAgentTool(request({ actorUserId: '' })).code, 'missing_context');
  assert.equal(evaluateAgentTool(request({ agentId: 'admin' })).code, 'missing_context');
});

test('high-impact advice needs a distinct, reasoned, unexpired human approval', () => {
  const highImpact = request({
    toolId: 'safe_playbook.propose',
    credentialProfile: 'tenant-scoped-limited',
  });
  assert.equal(evaluateAgentTool(highImpact).code, 'human_approval_required');
  assert.equal(evaluateAgentTool({ ...highImpact, humanApproval: { approverUserId: 'staff-1', distinct: false, reason: 'Reviewed carefully' } }).code, 'human_approval_required');
  assert.equal(evaluateAgentTool({ ...highImpact, humanApproval: { approverUserId: 'staff-1', distinct: true, reason: 'Reviewed carefully' } }).code, 'self_approval_denied');
  assert.equal(evaluateAgentTool({ ...highImpact, humanApproval: { approverUserId: 'staff-2', distinct: true, reason: 'ok' } }).code, 'human_approval_required');
  assert.equal(evaluateAgentTool({ ...highImpact, humanApproval: { approverUserId: 'staff-2', distinct: true, reason: 'Reviewed carefully', expiresAt: '2020-01-01T00:00:00Z' } }).code, 'approval_expired');
  const approved = evaluateAgentTool({
    ...highImpact,
    humanApproval: {
      approverUserId: 'staff-2',
      distinct: true,
      reason: 'Reviewed carefully',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    },
  });
  assert.equal(approved.allowed, true);
  assert.equal(approved.requiresHumanApproval, true);
  assert.equal(approved.advisoryOnly, true);
});

test('execution is never allowed even with strong auth and complete test evidence', () => {
  const evidence = { sandbox: true, canary: true, replay: true };
  assert.equal(evaluateAgentTool(request({ intent: 'execute' })).code, 'test_evidence_required');
  assert.equal(evaluateAgentTool(request({
    intent: 'execute',
    testEvidence: evidence,
    staffElevationValid: false,
  })).code, 'strong_auth_required');
  const fullyApproved = evaluateAgentTool(request({ intent: 'execute', testEvidence: evidence }));
  assert.equal(fullyApproved.allowed, false);
  assert.equal(fullyApproved.code, 'execution_disabled');
  assert.equal(fullyApproved.audit.decision, 'denied');
});
