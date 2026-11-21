/**
 * Deny-by-default operational controls for internal AI agents.
 *
 * This is a pure policy evaluator. No caller may treat its output as authority
 * to perform an external effect: prototype execution is disabled, all agents
 * are advisory unless a distinct human has explicitly approved a scoped tool.
 * The authoritative machine-readable register is config/agent-autonomy-policy.json;
 * scripts/check-agent-autonomy-policy.mjs checks these constants against it.
 */

export const AGENT_MODES = ['advisory', 'assist', 'guarded_auto'] as const;
export type AgentMode = (typeof AGENT_MODES)[number];

export const AGENT_TOOL_INTENTS = ['advise', 'execute'] as const;
export type AgentToolIntent = (typeof AGENT_TOOL_INTENTS)[number];

export const AGENT_TOOL_TIERS = ['T1', 'T2', 'T3', 'T4'] as const;
export type AgentToolTier = (typeof AGENT_TOOL_TIERS)[number];

/** Prototype fail-closed: no agent tool may execute, regardless of approval. */
export const AGENT_EXECUTION_ENABLED = false;
export const AGENT_KILL_SWITCH_DEFAULT_ENGAGED = true;
export const AGENT_KILL_SWITCH_SLO_SECONDS = 60;

export interface AgentToolDefinition {
  readonly id: string;
  readonly tier: AgentToolTier;
  readonly irreversible: boolean;
  readonly highImpact: boolean;
  readonly credentialProfile: string;
  readonly networkEgress: 'none';
}

export const AGENT_TOOL_REGISTRY: readonly AgentToolDefinition[] = Object.freeze([
  { id: 'catalogue.read', tier: 'T1', irreversible: false, highImpact: false, credentialProfile: 'tenant-readonly', networkEgress: 'none' },
  { id: 'metrics.read', tier: 'T1', irreversible: false, highImpact: false, credentialProfile: 'tenant-readonly', networkEgress: 'none' },
  { id: 'incident.draft', tier: 'T2', irreversible: false, highImpact: false, credentialProfile: 'tenant-readonly', networkEgress: 'none' },
  { id: 'ticket.create', tier: 'T2', irreversible: false, highImpact: false, credentialProfile: 'tenant-readonly', networkEgress: 'none' },
  { id: 'safe_playbook.propose', tier: 'T3', irreversible: false, highImpact: true, credentialProfile: 'tenant-scoped-limited', networkEgress: 'none' },
  { id: 'compliance.alert', tier: 'T3', irreversible: false, highImpact: true, credentialProfile: 'tenant-scoped-limited', networkEgress: 'none' },
]);

/**
 * Per-agent least-privilege allowlist. Unknown agents and tools outside their
 * declared scope are denied before any model or adapter is invoked. This is
 * checked against config/agent-autonomy-policy.json by npm run agents:check.
 */
export const AGENT_TOOL_ALLOWLIST: Readonly<Record<string, readonly string[]>> = Object.freeze({
  'CTO-01': ['metrics.read', 'safe_playbook.propose'],
  'DEV-01': ['metrics.read', 'ticket.create', 'safe_playbook.propose'],
  'SRE-01': ['metrics.read', 'incident.draft', 'safe_playbook.propose'],
  'QA-01': ['catalogue.read', 'ticket.create'],
  'SEC-01': ['metrics.read', 'incident.draft', 'compliance.alert'],
  'DBA-01': ['metrics.read', 'ticket.create', 'safe_playbook.propose'],
  'API-01': ['metrics.read', 'ticket.create'],
  'MOB-01': ['catalogue.read', 'ticket.create'],
  'WEB-01': ['catalogue.read', 'ticket.create'],
  'CLD-01': ['metrics.read', 'safe_playbook.propose'],
  'SUP-01': ['incident.draft', 'ticket.create'],
  'COST-01': ['metrics.read'],
  'REL-01': ['metrics.read', 'ticket.create', 'safe_playbook.propose'],
  'MDL-01': ['metrics.read', 'compliance.alert'],
  'CMP-01': ['catalogue.read', 'compliance.alert'],
  'PM-01': ['catalogue.read', 'ticket.create'],
  'SCRUM-01': ['ticket.create'],
  'BA-01': ['catalogue.read'],
  'DA-01': ['catalogue.read', 'metrics.read'],
  'REV-01': ['metrics.read'],
  'FRD-01': ['metrics.read', 'compliance.alert'],
  'LIC-01': ['catalogue.read', 'compliance.alert'],
  'VEN-01': ['catalogue.read', 'ticket.create'],
  'MQC-01': ['catalogue.read', 'ticket.create'],
});

/** Tools that are structurally unavailable to agents in this repository. */
export const DENIED_AGENT_TOOLS: readonly string[] = Object.freeze([
  'content.publish',
  'campaign.spend',
  'email.send',
  'ledger.write',
  'refund.approve',
  'payout.submit',
  'trade.order.write',
  'vault.offer.publish',
  'model.promote',
  'role.change',
  'secret.read',
  'shell.exec',
  'network.fetch',
]);

export const AGENT_AUDIT_FIELDS: readonly string[] = Object.freeze([
  'correlationId', 'tenantId', 'actorUserId', 'agentId', 'toolId', 'intent',
  'mode', 'tier', 'decision', 'reasonCode', 'reason', 'occurredAt',
]);

export interface AgentHumanApproval {
  approverUserId: string;
  distinct: boolean;
  reason: string;
  expiresAt?: Date | string | null;
}

export interface AgentTestEvidence {
  sandbox: boolean;
  canary: boolean;
  replay: boolean;
}

export interface AgentToolRequest {
  correlationId: string;
  tenantId: string;
  actorUserId: string;
  actorIsInternalStaff: boolean;
  staffElevationValid: boolean;
  agentId: string;
  toolId: string;
  intent: AgentToolIntent;
  mode: AgentMode;
  untrustedOutputAsInstructions?: boolean;
  credentialProfile?: string;
  networkAccess?: string;
  humanApproval?: AgentHumanApproval | null;
  testEvidence?: AgentTestEvidence | null;
  killSwitchEngaged?: boolean;
}

export type AgentToolDecisionCode =
  | 'allowed'
  | 'unknown_tool'
  | 'denied_tool'
  | 'unknown_mode'
  | 'unknown_intent'
  | 'missing_context'
  | 'unknown_agent'
  | 'agent_tool_not_allowed'
  | 'prompt_injection_rejected'
  | 'agent_kill_switch_engaged'
  | 'credential_isolation_violation'
  | 'network_egress_denied'
  | 'human_approval_required'
  | 'self_approval_denied'
  | 'approval_expired'
  | 'strong_auth_required'
  | 'test_evidence_required'
  | 'execution_disabled';

export interface AgentToolDecision {
  allowed: boolean;
  code: AgentToolDecisionCode;
  reason: string;
  toolTier: AgentToolTier | null;
  requiresHumanApproval: boolean;
  advisoryOnly: boolean;
  audit: Record<string, unknown>;
}

function decision(
  code: AgentToolDecisionCode,
  reason: string,
  request: AgentToolRequest,
  tool: AgentToolDefinition | null,
): AgentToolDecision {
  return {
    allowed: code === 'allowed',
    code,
    reason,
    toolTier: tool?.tier ?? null,
    requiresHumanApproval: Boolean(tool?.highImpact || tool?.irreversible),
    advisoryOnly: code === 'allowed' && request.intent === 'advise',
    audit: {
      correlationId: request.correlationId,
      tenantId: request.tenantId,
      actorUserId: request.actorUserId,
      agentId: request.agentId,
      toolId: request.toolId,
      intent: request.intent,
      mode: request.mode,
      tier: tool?.tier ?? null,
      decision: code === 'allowed' ? 'allowed' : 'denied',
      reasonCode: code,
      reason,
      occurredAt: new Date().toISOString(),
    },
  };
}

function approvalValid(request: AgentToolRequest): AgentToolDecisionCode | null {
  const approval = request.humanApproval;
  if (!approval || !approval.distinct) return 'human_approval_required';
  if (approval.approverUserId === request.actorUserId) return 'self_approval_denied';
  if (typeof approval.reason !== 'string' || approval.reason.trim().length < 8) return 'human_approval_required';
  if (approval.expiresAt) {
    const expiry = approval.expiresAt instanceof Date ? approval.expiresAt : new Date(approval.expiresAt);
    if (Number.isNaN(expiry.getTime()) || expiry <= new Date()) return 'approval_expired';
  }
  return null;
}

/**
 * Evaluate one agent tool request. Every unknown or unsafe condition fails closed.
 * `advise` may be allowed; `execute` is never allowed in the prototype.
 */
export function evaluateAgentTool(request: AgentToolRequest): AgentToolDecision {
  if (DENIED_AGENT_TOOLS.includes(request.toolId)) {
    return decision('denied_tool', 'Tool is explicitly denied to agents.', request, null);
  }
  const tool = AGENT_TOOL_REGISTRY.find((candidate) => candidate.id === request.toolId) ?? null;
  if (!tool) return decision('unknown_tool', 'Tool is not in the allowlist.', request, null);
  if (!(AGENT_MODES as readonly string[]).includes(request.mode)) {
    return decision('unknown_mode', 'Unknown agent mode.', request, tool);
  }
  if (!(AGENT_TOOL_INTENTS as readonly string[]).includes(request.intent)) {
    return decision('unknown_intent', 'Unknown tool intent.', request, tool);
  }
  if (
    !request.correlationId || !request.tenantId || !request.actorUserId ||
    !/^[A-Z]{2,8}-\d{2}$/.test(request.agentId)
  ) {
    return decision('missing_context', 'Correlation, tenant, actor and agent identity are required.', request, tool);
  }
  const agentTools = AGENT_TOOL_ALLOWLIST[request.agentId];
  if (!agentTools) {
    return decision('unknown_agent', 'Agent is not in the registered roster.', request, tool);
  }
  if (!agentTools.includes(request.toolId)) {
    return decision('agent_tool_not_allowed', 'Tool is outside this agent allowlist.', request, tool);
  }
  if (request.untrustedOutputAsInstructions) {
    return decision('prompt_injection_rejected', 'Untrusted tool output cannot be treated as instructions.', request, tool);
  }
  if (request.killSwitchEngaged !== false) {
    return decision('agent_kill_switch_engaged', 'Agent kill switch is engaged; human-only operation.', request, tool);
  }
  if (request.credentialProfile !== tool.credentialProfile) {
    return decision('credential_isolation_violation', 'Credential profile does not match the tool allowlist.', request, tool);
  }
  if (request.networkAccess !== 'none' || tool.networkEgress !== 'none') {
    return decision('network_egress_denied', 'Agent network egress is deny-by-default.', request, tool);
  }

  const needsApproval = tool.highImpact || tool.irreversible;
  if (needsApproval) {
    const approvalCode = approvalValid(request);
    if (approvalCode) {
      return decision(approvalCode, 'A distinct human approval with reason is required.', request, tool);
    }
  }

  if (request.intent === 'execute') {
    if (!request.actorIsInternalStaff || !request.staffElevationValid) {
      return decision('strong_auth_required', 'Execution requires an active internal staff session with valid elevation.', request, tool);
    }
    const evidence = request.testEvidence;
    if (!evidence?.sandbox || !evidence.canary || !evidence.replay) {
      return decision('test_evidence_required', 'Sandbox, canary and replay evidence are required before execution.', request, tool);
    }
    return decision('execution_disabled', 'Prototype agent execution is disabled; advisory output only.', request, tool);
  }

  return decision('allowed', 'Advisory-only tool use is permitted.', request, tool);
}
