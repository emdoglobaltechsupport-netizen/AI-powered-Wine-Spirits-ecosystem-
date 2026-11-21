#!/usr/bin/env node
/**
 * External-adapter capability isolation gate.
 *
 * Verifies four explicit modes, mock/disabled defaults per profile, two
 * independent live-mode checks, mock-credential production blocking and a
 * secret-free startup mode log. It does not create or test a live provider.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(ROOT, path), 'utf8');
const policy = JSON.parse(read('config/adapter-capability-policy.json'));
const runtime = JSON.parse(read('config/runtime-boundaries.json'));
const credential = JSON.parse(read('config/credential-policy.json'));
const errors = [];
const fail = (message) => errors.push(message);
const requireText = (haystack, needle, label) => {
  if (!haystack.includes(needle)) fail(`${label} must contain ${JSON.stringify(needle)}`);
};

if (JSON.stringify(policy.adapterModes) !== JSON.stringify(['disabled', 'mock', 'sandbox', 'live'])) {
  fail('adapter modes must be disabled, mock, sandbox and live');
}
if (policy.defaultMode !== 'mock' || policy.prototypeMode !== true || policy.productionStartupAllowed !== false || policy.failClosed !== true) {
  fail('adapter defaults and prototype flags are incorrect');
}
for (const profile of ['local', 'test', 'staging']) {
  const rule = policy.profiles[profile];
  if (rule?.defaultMode !== 'mock' || rule.externalEffectsAllowed !== false || !rule.allowedModes?.every((mode) => ['disabled', 'mock'].includes(mode))) {
    fail(`${profile} must default to mock with no external effects`);
  }
}
if (policy.profiles.production?.defaultMode !== 'disabled' || policy.profiles.production?.allowedModes?.length !== 0) {
  fail('production adapter capability must be disabled in the prototype');
}
if (policy.liveModeChecks?.twoIndependentEnvironmentChecksRequired !== true || policy.liveModeChecks?.profileMustAllowLive !== true || policy.liveModeChecks?.launchClearanceRequired !== true || policy.liveModeChecks?.productionProfileBlocked !== true) {
  fail('live mode requires two independent checks, profile clearance and launch evidence');
}
if (policy.credentialGuards?.productionMockCredentialsBlocked !== true || policy.credentialGuards?.secretsNeverLogged !== true || policy.credentialGuards?.profileScopedCredentialRequiredForLive !== true) {
  fail('mock credentials must be blocked in production and never logged');
}
if (policy.startupLog?.credentialsLogged !== false || policy.startupLog?.neverLogEnvValues !== true || !policy.startupLog.fields?.includes('adapterModes')) {
  fail('startup log must expose modes only and never credentials');
}
if (policy.testRequirements?.localLiveCapableCodeBlocked !== true || policy.testRequirements?.unknownAdapterValueDenied !== true || policy.testRequirements?.evidenceRef !== null) {
  fail('local live-capable execution and unknown values must be fail-closed with no evidence attached');
}

if (policy.providers?.length !== runtime.providers?.length) fail('adapter capability provider list must match runtime boundaries');
for (const provider of policy.providers ?? []) {
  const runtimeProvider = runtime.providers.find((record) => record.id === provider.id);
  if (!runtimeProvider) fail(`${provider.id}: missing runtime boundary provider`);
  if (runtimeProvider.env !== provider.env) fail(`${provider.id}: provider env key drifted`);
  if (provider.defaultMode !== 'mock' || provider.localMode !== 'mock' || provider.sandboxAvailable !== false) {
    fail(`${provider.id}: must be mock-only with no sandbox implementation`);
  }
}
if (runtime.profiles.production?.allowed !== false || runtime.profiles.production?.realProvidersAllowed !== false) {
  fail('runtime boundary production profile must remain blocked');
}
if (credential.sessionSecretMinimumLength !== 32) fail('session secret minimum must remain 32');

const shared = read('packages/shared/src/runtime-boundaries.ts');
const config = read('services/api/src/config.ts');
const runtimeChecker = read('scripts/check-runtime-boundaries.mjs');
const runtimeTest = read('packages/shared/src/runtime-boundaries.test.ts');
const doc = read('ADAPTER_CAPABILITIES.md');
const readme = read('README.md');

requireText(shared, "['disabled', 'mock', 'sandbox', 'live'] as const", 'runtime-boundaries.ts');
requireText(shared, 'export function resolveAdapterMode', 'runtime-boundaries.ts');
requireText(shared, 'globalOptIn', 'runtime-boundaries.ts');
requireText(shared, 'providerOptIn', 'runtime-boundaries.ts');
requireText(shared, 'credentialKey', 'runtime-boundaries.ts');
for (const key of ['REAL_PROVIDER_OPT_IN', 'REAL_AGE_PROVIDER_OPT_IN', 'REAL_KYC_PROVIDER_OPT_IN', 'REAL_PAYMENT_PROVIDER_OPT_IN', 'REAL_MARKETING_PROVIDER_OPT_IN', 'REAL_CUSTODY_PROVIDER_OPT_IN', 'REAL_AI_PROVIDER_OPT_IN']) {
  requireText(config, key, 'config.ts');
}
requireText(config, 'resolveAdapterMode', 'config.ts');
requireText(config, "event: 'vintora.runtime.adapters'", 'config.ts');
requireText(config, 'adapterModes', 'config.ts');
requireText(config, 'externalEffectsAllowed: false', 'config.ts');
requireText(config, 'credentialsLogged: false', 'config.ts');
requireText(config, 'Fixed development session secrets are not permitted', 'config.ts');
requireText(config, 'Production startup is disabled', 'config.ts');
requireText(shared, 'Real ${provider.id} adapter is not allowed in ${profile}', 'runtime-boundaries.ts');
requireText(runtimeTest, 'real adapters require both opt-ins and a profile-scoped credential', 'runtime-boundaries.test.ts');
requireText(runtimeTest, 'local allows throwaway demo identities and simulated defaults', 'runtime-boundaries.test.ts');
requireText(doc, 'No licensed live adapter implementation exists', 'ADAPTER_CAPABILITIES.md');
requireText(doc, 'two independent environment checks', 'ADAPTER_CAPABILITIES.md');
requireText(readme, '[`ADAPTER_CAPABILITIES.md`](./ADAPTER_CAPABILITIES.md)', 'README.md');

for (const ref of policy.codeBoundaryRefs) {
  if (!existsSync(join(ROOT, ref))) fail(`missing adapter capability reference: ${ref}`);
}

if (errors.length) {
  console.error(`Adapter capability check failed: ${errors.length} finding(s).`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}
console.log(`Adapter capability check passed: ${policy.adapterModes.length} modes, ${policy.providers.length} providers mock-only by default, live checks fail closed.`);
console.log('Startup logs expose mode labels only; no credentials, env values or external effects are emitted.');
console.log('This gate does not provision or validate a live provider.');
