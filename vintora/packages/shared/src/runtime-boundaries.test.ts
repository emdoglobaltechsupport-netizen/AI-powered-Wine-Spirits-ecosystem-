import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  evaluateRuntimeBoundaries,
  resolveRuntimeProfile,
  type RuntimeBoundaryConfig,
} from './runtime-boundaries.js';

const config: RuntimeBoundaryConfig = {
  prototypeMode: true,
  publicLaunch: false,
  productionStartupAllowed: false,
  profileEnv: 'RUNTIME_PROFILE',
  globalRealOptInEnv: 'REAL_PROVIDER_OPT_IN',
  simulatedProviderOptInEnv: 'ALLOW_SIMULATED_PROVIDERS',
  credentialEnvPattern: 'REAL_{PROVIDER}_KEY_{PROFILE}',
  profiles: {
    local: { nodeEnv: 'development', allowed: true, allowDemoIdentities: true, simulatedProviders: 'default', realProvidersAllowed: false },
    test: { nodeEnv: 'test', allowed: true, allowDemoIdentities: true, simulatedProviders: 'default', realProvidersAllowed: false },
    staging: { nodeEnv: 'staging', allowed: true, allowDemoIdentities: false, simulatedProviders: 'opt-in', realProvidersAllowed: false },
    production: {
      nodeEnv: 'production', allowed: false, allowDemoIdentities: false,
      simulatedProviders: 'blocked', realProvidersAllowed: false,
      blockReason: 'production startup disabled',
    },
  },
  providers: [{
    id: 'age', env: 'AGE_VERIFICATION_PROVIDER', simulatedValues: ['local', 'simulated'],
    defaultValue: 'local', realOptInEnv: 'REAL_AGE_PROVIDER_OPT_IN',
    highRiskFeatureId: 'age-kyc', commercialLicenceDomains: ['alcohol-retail'], legalReviewRequired: true,
  }],
};

const launch = {
  publicLaunch: false,
  legalApprover: null,
  complianceApprover: null,
  guardRemovalApprovalRef: null,
};
const licensingDomains = [{ id: 'alcohol-retail', status: 'not_obtained', evidenceRef: null }];
const highRiskFeatures = [{
  id: 'age-kyc', status: 'blocked', legalSignoff: null, complianceSignoff: null,
  activationGates: [{ satisfied: false }],
}];

const evaluate = (env: Record<string, string | undefined>) => evaluateRuntimeBoundaries({
  env, config, launch, licensingDomains, highRiskFeatures,
});

test('runtime profile resolves from NODE_ENV or an explicit override', () => {
  assert.equal(resolveRuntimeProfile({ NODE_ENV: 'development' }), 'local');
  assert.equal(resolveRuntimeProfile({ NODE_ENV: 'test' }), 'test');
  assert.equal(resolveRuntimeProfile({ NODE_ENV: 'staging' }), 'staging');
  assert.equal(resolveRuntimeProfile({ NODE_ENV: 'development', RUNTIME_PROFILE: 'production' }), 'production');
});

test('unknown runtime profiles fail closed', () => {
  const outcome = evaluate({ NODE_ENV: 'development', RUNTIME_PROFILE: 'qa' });
  assert.equal(outcome.ok, false);
  assert.equal(outcome.profile, null);
  assert.match(outcome.violations[0] ?? '', /unknown/i);
});

test('local allows throwaway demo identities and simulated defaults', () => {
  const outcome = evaluate({ NODE_ENV: 'development', ALLOW_DEMO_SEED: 'true' });
  assert.equal(outcome.profile, 'local');
  assert.equal(outcome.ok, true);
  assert.deepEqual(outcome.violations, []);
});

test('unset NODE_ENV defaults to the local development profile', () => {
  const outcome = evaluate({ ALLOW_DEMO_SEED: 'true' });
  assert.equal(outcome.profile, 'local');
  assert.equal(outcome.ok, true);
  assert.deepEqual(outcome.violations, []);
});

test('production remains blocked and cannot enable demo identities', () => {
  const outcome = evaluate({ NODE_ENV: 'production', RUNTIME_PROFILE: 'production', ALLOW_DEMO_SEED: 'true' });
  assert.equal(outcome.ok, false);
  assert.ok(outcome.violations.some((value) => value.includes('production startup disabled')));
  assert.ok(outcome.violations.some((value) => value.includes('Demo identities')));
});

test('staging simulated adapters require an explicit opt-in', () => {
  const missing = evaluate({ NODE_ENV: 'staging', RUNTIME_PROFILE: 'staging' });
  assert.equal(missing.ok, false);
  assert.ok(missing.violations.some((value) => value.includes('ALLOW_SIMULATED_PROVIDERS')));

  const allowed = evaluate({ NODE_ENV: 'staging', RUNTIME_PROFILE: 'staging', ALLOW_SIMULATED_PROVIDERS: 'true' });
  assert.equal(allowed.ok, true);
});

test('real adapters require both opt-ins and a profile-scoped credential', () => {
  const partial = evaluate({
    NODE_ENV: 'development', AGE_VERIFICATION_PROVIDER: 'real',
    REAL_PROVIDER_OPT_IN: 'true', REAL_AGE_PROVIDER_OPT_IN: 'true',
  });
  assert.equal(partial.ok, false);
  assert.ok(partial.violations.some((value) => value.includes('REAL_AGE_KEY_LOCAL')));

  const withCredential = evaluate({
    NODE_ENV: 'development', AGE_VERIFICATION_PROVIDER: 'real',
    REAL_PROVIDER_OPT_IN: 'true', REAL_AGE_PROVIDER_OPT_IN: 'true',
    REAL_AGE_KEY_LOCAL: 'unused-in-prototype',
  });
  assert.equal(withCredential.ok, false);
  assert.ok(withCredential.violations.some((value) => value.includes('not allowed in local')));
});

test('real regulated adapters still need launch, feature and licence evidence', () => {
  const readyProfiles: RuntimeBoundaryConfig = {
    ...config,
    profiles: {
      ...config.profiles,
      staging: { ...config.profiles.staging, realProvidersAllowed: true, simulatedProviders: 'opt-in' },
    },
  };
  const outcome = evaluateRuntimeBoundaries({
    env: {
      NODE_ENV: 'staging', AGE_VERIFICATION_PROVIDER: 'real',
      REAL_PROVIDER_OPT_IN: 'true', REAL_AGE_PROVIDER_OPT_IN: 'true',
      REAL_AGE_KEY_STAGING: 'unused-in-prototype',
    },
    config: readyProfiles,
    launch, licensingDomains, highRiskFeatures,
  });
  assert.equal(outcome.ok, false);
  assert.ok(outcome.violations.some((value) => value.includes('licence evidence')));
});

test('unknown adapter labels fail closed', () => {
  const outcome = evaluate({ NODE_ENV: 'development', AGE_VERIFICATION_PROVIDER: 'unlisted-vendor' });
  assert.equal(outcome.ok, false);
  assert.ok(outcome.violations.some((value) => value.includes('unknown adapter value')));
});
