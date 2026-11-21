#!/usr/bin/env node
/**
 * Runtime/adapter boundary gate.
 *
 * Verifies that the prototype remains fail-closed: simulated providers are the
 * default in non-production, real providers require opt-in plus separate
 * credentials, demo identities are profile-scoped, every privileged action has
 * an audit event, and age assurance remains blocked without legal/provider
 * evidence. This is a Phase 1 gate only, not launch approval.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(ROOT, path), 'utf8');
const json = (path) => JSON.parse(read(path));

const boundary = json('config/runtime-boundaries.json');
const age = json('config/age-assurance-policy.json');
const launch = json('config/launch-manifest.json');
const licensing = json('config/commercial-licensing-policy.json');
const highRisk = json('config/high-risk-features.json');
const safeguards = json('config/commerce-safeguards.json');
const matrix = json('config/setup-environment-matrix.json');
const envTemplate = read('.env.example');
const boundaryDoc = existsSync(join(ROOT, 'RUNTIME_BOUNDARIES.md')) ? read('RUNTIME_BOUNDARIES.md') : '';
const ageDoc = existsSync(join(ROOT, 'AGE_ASSURANCE_BOUNDARY.md')) ? read('AGE_ASSURANCE_BOUNDARY.md') : '';

const errors = [];
const assert = (condition, message) => { if (!condition) errors.push(message); };

// 1. Prototype posture and profile rules.
assert(boundary.prototypeMode === true, 'runtime boundary must remain in prototype mode');
assert(boundary.publicLaunch === false, 'runtime boundary must not assert publicLaunch');
assert(boundary.productionStartupAllowed === false, 'prototype production startup must be disabled');
assert(typeof boundary.profileEnv === 'string' && boundary.profileEnv.length > 0, 'profileEnv is required');
assert(boundary.globalRealOptInEnv === 'REAL_PROVIDER_OPT_IN', 'global real-provider opt-in key changed without review');
assert(boundary.simulatedProviderOptInEnv === 'ALLOW_SIMULATED_PROVIDERS', 'simulated-provider opt-in key changed without review');
assert(boundary.credentialEnvPattern.includes('{PROVIDER}') && boundary.credentialEnvPattern.includes('{PROFILE}'),
  'credentialEnvPattern must include both provider and profile to keep credentials separate');

for (const [id, profile] of Object.entries(boundary.profiles)) {
  assert(typeof profile.nodeEnv === 'string', `profile ${id} must declare nodeEnv`);
  assert(profile.privilegedAuditRequired === true, `profile ${id} must require privileged-action audit`);
  if (id === 'production') {
    assert(profile.allowed === false, 'production profile must be blocked in the prototype');
    assert(profile.allowDemoIdentities === false, 'production must never allow demo identities');
    assert(profile.simulatedProviders === 'blocked', 'production must block simulated providers');
    assert(profile.realProvidersAllowed === false, 'production must not claim real provider enablement');
  } else {
    assert(profile.allowed === true, `profile ${id} should be an allowed local profile`);
    assert(profile.realProvidersAllowed === false, `profile ${id} must not allow real providers in this prototype`);
  }
  if (id === 'local' || id === 'test') {
    assert(profile.allowDemoIdentities === true, `${id} may allow throwaway demo identities`);
    assert(profile.simulatedProviders === 'default', `${id} must default to simulated providers`);
  } else {
    assert(profile.allowDemoIdentities === false, `${id} must not allow demo identities`);
  }
}

// 2. Provider defaults, opt-ins, legal/feature mappings and separate credentials.
const featureById = new Map(highRisk.features.map((feature) => [feature.id, feature]));
const licenceById = new Map(licensing.domains.map((domain) => [domain.id, domain]));
const safeguardIds = new Set(safeguards.controls.filter((control) => control.required).map((control) => control.id));
const optInKeys = new Set();
for (const provider of boundary.providers) {
  assert(provider.simulatedValues.length > 0, `${provider.id} must declare simulated values`);
  assert(provider.simulatedValues.includes(provider.defaultValue), `${provider.id} default must be a simulated value`);
  assert(/^[A-Z][A-Z0-9_]*$/.test(provider.env), `${provider.id} env name is invalid`);
  assert(/^REAL_[A-Z_]+_OPT_IN$/.test(provider.realOptInEnv), `${provider.id} real opt-in key is invalid`);
  assert(!optInKeys.has(provider.realOptInEnv), `duplicate provider opt-in ${provider.realOptInEnv}`);
  optInKeys.add(provider.realOptInEnv);

  const feature = featureById.get(provider.highRiskFeatureId);
  assert(feature, `${provider.id} maps to unknown high-risk feature ${provider.highRiskFeatureId}`);
  if (feature) {
    assert(feature.status === 'blocked', `${provider.id} high-risk feature must be blocked`);
    assert(feature.legalSignoff === null && feature.complianceSignoff === null,
      `${provider.id} high-risk feature must remain unsigned`);
    assert(feature.activationGates.every((gate) => gate.satisfied === false),
      `${provider.id} high-risk feature has a satisfied activation gate`);
  }

  for (const domainId of provider.commercialLicenceDomains) {
    const domain = licenceById.get(domainId);
    assert(domain, `${provider.id} maps to unknown licence domain ${domainId}`);
    if (domain) assert(domain.status === 'not_obtained', `${provider.id} licence domain ${domainId} must remain not_obtained`);
  }
  if (provider.legalReviewRequired) {
    assert(provider.commercialLicenceDomains.length > 0, `${provider.id} requires a commercial licence domain`);
  }

  for (const key of [provider.env, provider.realOptInEnv]) {
    assert(envTemplate.includes(`${key}=`), `.env.example is missing ${key}`);
    assert(boundaryDoc.includes(`\`${key}\``), `RUNTIME_BOUNDARIES.md is missing ${key}`);
  }
}
for (const id of ['age', 'kyc', 'payment']) {
  assert(safeguardIds.has(id), `commerce safeguards must require ${id}`);
}
assert(envTemplate.includes(`${boundary.profileEnv}=`), `.env.example is missing ${boundary.profileEnv}`);
assert(envTemplate.includes(`${boundary.globalRealOptInEnv}=`), `.env.example is missing ${boundary.globalRealOptInEnv}`);
assert(envTemplate.includes(`${boundary.simulatedProviderOptInEnv}=`), `.env.example is missing ${boundary.simulatedProviderOptInEnv}`);

// 3. Every privileged action must have a unique audit event and be documented.
const actionIds = new Set();
const auditEvents = new Set();
const adminAuditMigration = read('packages/db/migrations/0019_admin_action_audit_append_only.sql');
assert(adminAuditMigration.includes('admin_actions_append_only') && adminAuditMigration.includes('BEFORE UPDATE OR DELETE'),
  'admin_actions must have a database-enforced append-only trigger');

for (const action of boundary.privilegedActions) {
  assert(!actionIds.has(action.id), `duplicate privileged action ${action.id}`);
  assert(!auditEvents.has(action.auditEvent), `duplicate audit event ${action.auditEvent}`);
  actionIds.add(action.id);
  auditEvents.add(action.auditEvent);
  assert(typeof action.approval === 'string' && action.approval.length > 0,
    `privileged action ${action.id} must declare an approval mode`);
  assert(auditEvents.has(action.auditEvent), `audit event ${action.auditEvent} missing`);
  assert(boundaryDoc.includes(`\`${action.auditEvent}\``), `RUNTIME_BOUNDARIES.md is missing audit event ${action.auditEvent}`);
}

// 4. Age assurance remains blocked, fail-closed and evidence-minimising.
assert(age.prototypeMode === true && age.publicLaunch === false, 'age assurance must remain prototype-only');
assert(age.status === 'blocked-pending-legal-and-provider', 'age assurance status must be blocked');
assert(age.enforcement === 'fail-closed', 'age assurance must be fail-closed');
assert(age.defaultDecision === 'deny' && age.unknownJurisdictionDecision === 'deny', 'unknown age context must deny');
assert(age.legalReview.status === 'not_obtained' && age.legalReview.evidenceRef === null,
  'age assurance legal review must remain not_obtained');
assert(age.providerIntegration.status === 'not_integrated' && age.providerIntegration.independentVerification === false,
  'no independent age provider may be claimed as integrated');
assert(age.providerIntegration.signedStatusRequired === true, 'real age evidence must require signed status');
const stageIds = new Set(age.requiredStages.map((stage) => stage.id));
for (const id of ['account-age-assertion', 'checkout-safeguard', 'fulfilment-review', 'delivery-age-check']) {
  assert(stageIds.has(id), `age policy is missing stage ${id}`);
}
for (const jurisdiction of age.jurisdictions) {
  assert(jurisdiction.minimumAge === null, `${jurisdiction.code} minimum age must not be asserted without legal review`);
  assert(jurisdiction.ruleSourceRef === null, `${jurisdiction.code} rule source must be null without evidence`);
  assert(jurisdiction.decision.startsWith('deny'), `${jurisdiction.code} must deny until evidence exists`);
}
assert(age.evidence.prefix === safeguards.evidencePrefix, 'age evidence prefix must match commerce safeguards');
assert(age.evidence.maxAgeHours === safeguards.maxAgeEvidenceHours, 'age evidence expiry must match commerce safeguards');
assert(age.evidence.signatureRequired === true && age.evidence.signedStatusRequired === true,
  'age evidence contract must require signature and signed status');
for (const trigger of ['jurisdiction-change', 'transaction-risk-change', 'evidence-expiry', 'provider-or-method-change']) {
  assert(age.reverificationTriggers.some((item) => item.id === trigger), `age policy is missing trigger ${trigger}`);
}
for (const event of age.auditEvents) {
  assert(auditEvents.has(event), `age audit event ${event} is absent from privileged-action registry`);
  assert(ageDoc.includes(`\`${event}\``), `AGE_ASSURANCE_BOUNDARY.md is missing ${event}`);
}
for (const scenario of age.fraudScenarios) {
  assert(scenario.expected === 'denied', `fraud scenario ${scenario.id} must expect denial`);
  assert(existsSync(join(ROOT, scenario.coveredBy)), `fraud scenario ${scenario.id} points to missing ${scenario.coveredBy}`);
  assert(ageDoc.includes(`\`${scenario.id}\``), `AGE_ASSURANCE_BOUNDARY.md is missing scenario ${scenario.id}`);
}

// 5. Launch matrix and docs parity for the new contract keys.
const contractKeys = [...new Set([...matrix.requiredEnv, ...matrix.optionalEnv])];
for (const key of [boundary.profileEnv, boundary.globalRealOptInEnv, boundary.simulatedProviderOptInEnv,
  ...boundary.providers.flatMap((provider) => [provider.env, provider.realOptInEnv])]) {
  assert(contractKeys.includes(key), `setup environment matrix is missing ${key}`);
}
assert(boundaryDoc.includes('local') && boundaryDoc.includes('test') && boundaryDoc.includes('staging') && boundaryDoc.includes('production'),
  'all four runtime profiles must be documented');

if (errors.length) {
  console.error(`Runtime boundary check failed: ${errors.length} finding(s).`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}
console.log(`Runtime boundary check passed: ${Object.keys(boundary.profiles).length} profiles, ${boundary.providers.length} simulated-default providers, ${boundary.privilegedActions.length} audited privileged actions, ${age.fraudScenarios.length} age fraud scenarios, Phase 1 gates only.`);
