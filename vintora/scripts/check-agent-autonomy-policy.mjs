#!/usr/bin/env node
/**
 * Machine-check the internal-agent autonomy boundary:
 * - advisory-only deny-by-default register for all 24 ADM-19 agents;
 * - least-privilege tools, human approval, credential/network isolation and
 *   prompt-injection handling implemented in the shared evaluator;
 * - append-only agent decision audit and an independent kill switch in the
 *   database/API;
 * - high-risk register remains blocked and unsigned.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(ROOT, path), 'utf8');
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

const requiredFiles = [
  'config/agent-autonomy-policy.json',
  'config/high-risk-features.json',
  'packages/shared/src/agent-controls.ts',
  'packages/shared/src/agent-controls.test.ts',
  'packages/db/migrations/0016_agent_controls.sql',
  'services/api/src/modules/admin/agent-controls.repo.ts',
  'services/api/src/modules/admin/agent-controls.routes.ts',
  'adr/ADR-0005-agent-boundaries.md',
  'AGENT_AUTONOMY_CONTROLS.md',
];
for (const file of requiredFiles) {
  check(existsSync(join(ROOT, file)), `Missing required agent control file: ${file}`);
}

const policy = JSON.parse(read('config/agent-autonomy-policy.json'));
check(policy.status === 'prototype-advisory-deny-by-default', 'Agent policy must remain advisory deny-by-default');
check(policy.defaultMode === 'advisory', 'Default agent mode must be advisory');
check(policy.executionEnabled === false, 'Agent execution must be disabled');
check(policy.autonomousModeAllowed === false, 'Autonomous mode must be disallowed');
check(policy.failClosed === true, 'Agent policy must fail closed');
check(policy.leastPrivilege?.unknownTool === 'deny', 'Unknown tools must be denied');
check(policy.leastPrivilege?.unknownAgent === 'deny', 'Unknown agents must be denied');
check(policy.humanApproval?.requiredForIrreversible === true, 'Irreversible actions require human approval');
check(policy.humanApproval?.distinctApprover === true, 'Approver must be distinct');
check(policy.humanApproval?.selfApprovalDenied === true, 'Self-approval must be denied');
check(policy.credentialIsolation?.sharedCredentials === false, 'Agent credentials must not be shared');
check(policy.credentialIsolation?.productionSecretsAvailable === false, 'Agents must not access production secrets');
check(policy.credentialIsolation?.networkEgressDefault === 'deny', 'Network egress must be deny-by-default');
check((policy.credentialIsolation?.allowedEgress ?? ['x']).length === 0, 'No agent egress allowlist entries are authorised');
check(policy.credentialIsolation?.credentialsInPrompts === false, 'Credentials must never appear in prompts');
check(policy.untrustedOutput?.treatAsDataOnly === true, 'Untrusted tool output must be data only');
check(policy.untrustedOutput?.instructionExecutionDenied === true, 'Instructions in tool output must not be executed');
check(policy.untrustedOutput?.quarantineOnViolation === true, 'Injection violations must be quarantined');
check(policy.audit?.appendOnly === true, 'Agent audit must be append-only');
check(policy.audit?.recordDenials === true, 'Agent audit must record denials');
check(policy.killControls?.agentKillSwitchIndependentOfModelKillSwitch === true, 'Agent kill switch must be independent');
check(policy.killControls?.defaultEngaged === true, 'Agent kill switch must start engaged');
check(policy.killControls?.safeStopOnEngage === true, 'Engaging the kill switch must safe-stop agents');
check(policy.killControls?.sloSeconds === 60, 'Agent kill switch SLO must be 60 seconds');
check(policy.killControls?.drillCompleted === false, 'Untested kill switch must not claim a completed drill');
check(policy.killControls?.resetAllowedInPrototype === false, 'Prototype kill switch reset must be blocked');
for (const gate of ['sandboxRequired', 'canaryRequired', 'replayRequired', 'promptInjectionSuiteRequired', 'executionBlockedUntilEvidence']) {
  check(policy.testing?.[gate] === true, `Agent testing gate ${gate} must be required`);
}
check(policy.review?.highImpactToolActionsRequireReview === true, 'High-impact tool actions require review');

const agents = Array.isArray(policy.agents) ? policy.agents : [];
check(agents.length === 24, `Expected 24 agents, found ${agents.length}`);
const agentIds = new Set(agents.map((agent) => agent.id));
check(agentIds.size === agents.length, 'Agent IDs must be unique');
for (const agent of agents) {
  check(agent.runtimeDefaultMode === 'advisory', `${agent.id}: runtime default must be advisory`);
  check(Array.isArray(agent.tools) && agent.tools.length > 0, `${agent.id}: tools must be a non-empty allowlist`);
}
const allowlist = new Set((policy.leastPrivilege?.tools ?? []).map((tool) => tool.id));
const denied = new Set(policy.leastPrivilege?.deniedTools ?? []);
for (const tool of allowlist) check(!denied.has(tool), `Tool ${tool} is both allowed and denied`);
for (const agent of agents) {
  for (const tool of agent.tools ?? []) {
    check(allowlist.has(tool), `${agent.id}: tool ${tool} is not in the allowlist`);
  }
}
for (const id of ['content.publish', 'campaign.spend', 'email.send', 'payout.submit', 'model.promote', 'role.change', 'secret.read', 'shell.exec', 'network.fetch']) {
  check(denied.has(id), `Irreversible tool ${id} must be explicitly denied`);
}

const state = read('apps/prototype/src/admin/state.js');
const uiAgentIds = [...state.matchAll(/\{\s*id:\s*'([A-Z]{2,8}-\d{2})',\s*name:/g)].map((match) => match[1]);
check(uiAgentIds.length === 24, `Expected 24 UI agents, found ${uiAgentIds.length}`);
for (const id of uiAgentIds) check(agentIds.has(id), `UI agent ${id} is missing from the runtime policy`);

const highRisk = JSON.parse(read('config/high-risk-features.json'));
const agentFeature = highRisk.features?.find((feature) => feature.id === 'ai-agent-autonomy');
check(Boolean(agentFeature), 'High-risk register must include ai-agent-autonomy');
if (agentFeature) {
  check(agentFeature.status === 'blocked', 'Agent autonomy feature must be blocked');
  check(agentFeature.legalSignoff === null && agentFeature.complianceSignoff === null, 'Agent autonomy feature must be unsigned');
  check(agentFeature.activationGates?.every((gate) => gate.satisfied === false && !gate.evidenceRef),
    'All agent autonomy activation gates must be unsatisfied and without evidence');
}

const shared = read('packages/shared/src/agent-controls.ts');
check(shared.includes('export const AGENT_EXECUTION_ENABLED = false'), 'Shared evaluator must disable execution');
check(shared.includes('export const AGENT_KILL_SWITCH_DEFAULT_ENGAGED = true'), 'Shared evaluator must start with kill switch engaged');
check(shared.includes("'prompt_injection_rejected'"), 'Shared evaluator must reject prompt injection');
check(shared.includes("'execution_disabled'"), 'Shared evaluator must deny execution in the prototype');
check(shared.includes("'human_approval_required'"), 'Shared evaluator must require human approval');
check(shared.includes("'credential_isolation_violation'"), 'Shared evaluator must enforce credential isolation');
check(shared.includes("'unknown_agent'"), 'Shared evaluator must deny unregistered agents');
check(shared.includes("'agent_tool_not_allowed'"), 'Shared evaluator must deny out-of-scope tools');
const mappingStart = shared.indexOf('export const AGENT_TOOL_ALLOWLIST');
const mappingEnd = shared.indexOf('export const DENIED_AGENT_TOOLS');
const mapping = mappingStart >= 0 && mappingEnd > mappingStart ? shared.slice(mappingStart, mappingEnd) : '';
for (const agent of agents) {
  const line = mapping.split('\n').find((entry) => entry.includes(`'${agent.id}':`));
  const listed = line ? [...line.matchAll(/'([^']+)'/g)].map((match) => match[1]).slice(1) : [];
  check(
    listed.length === agent.tools.length && agent.tools.every((tool) => listed.includes(tool)),
    `${agent.id}: shared per-agent allowlist must match the register`,
  );
}
for (const tool of allowlist) check(shared.includes(`id: '${tool}'`), `Shared registry is missing allowed tool ${tool}`);
for (const tool of denied) check(shared.includes(`'${tool}'`), `Shared deny list is missing ${tool}`);
const auditFields = policy.audit?.requiredFields ?? [];
check(auditFields.every((field) => shared.includes(field)), 'Shared audit record must include every required field');

const migration = read('packages/db/migrations/0016_agent_controls.sql');
check(migration.includes('CREATE TABLE IF NOT EXISTS agent_kill_switch'), 'Migration must create the agent kill switch');
check(migration.includes('CREATE TABLE IF NOT EXISTS agent_decision_audit'), 'Migration must create the agent decision audit');
check(migration.includes('FORCE ROW LEVEL SECURITY'), 'Agent tables must close the owner RLS bypass');
check(migration.includes('append-only'), 'Agent audit must be append-only in storage');
check(!/GRANT\s+BYPASSRLS/i.test(migration), 'Agent migration must not grant BYPASSRLS');

const repo = read('services/api/src/modules/admin/agent-controls.repo.ts');
check(repo.includes('INSERT INTO agent_decision_audit'), 'API must persist agent decisions');
check(repo.includes('SELECT id, correlation_id'), 'API must expose the append-only audit');
const routes = read('services/api/src/modules/admin/agent-controls.routes.ts');
check(routes.includes('evaluateAgentTool'), 'Agent route must use the shared evaluator');
check(routes.includes('/agents/tools/evaluate'), 'Agent route must expose advisory evaluation');
check(routes.includes('/agents/kill-switch'), 'Agent kill switch route must exist');
check(routes.includes("'engage'"), 'Prototype kill switch must only support safe-stop engage');
check(!/publish|spend|send|payout|promote/i.test(routes.replace(/promotion|compliance/g, '')), 'Agent routes must not expose execution tools');

const tests = read('packages/shared/src/agent-controls.test.ts');
for (const name of ['unknown', 'prompt injection', 'approval', 'kill switch', 'execution']) {
  check(tests.toLowerCase().includes(name), `Agent tests must cover ${name}`);
}

if (failures.length) {
  console.error(`Agent autonomy policy check FAILED: ${failures.length} problem(s).`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log(
  `Agent autonomy policy check passed: ${agents.length} agents advisory-only, `
  + `${allowlist.size} allowlisted tools, ${denied.size} denied tools, append-only audit and independent kill switch.`,
);
