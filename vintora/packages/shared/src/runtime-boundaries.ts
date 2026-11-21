/**
 * Pure runtime/adapter boundary evaluator.
 *
 * The Phase 1 prototype has no licensed providers, staging/production
 * credentials or centralised audit store. This evaluator resolves a runtime
 * profile from the environment and fails closed when demo identities,
 * simulated adapters or real-provider opt-ins cross a profile boundary. It is
 * used by API startup self-tests; scripts/check-runtime-boundaries.mjs checks
 * the machine-readable policy register against this contract.
 */

export const RUNTIME_PROFILES = ['local', 'test', 'staging', 'production'] as const;
export type RuntimeProfile = (typeof RUNTIME_PROFILES)[number];

export interface RuntimeProfileRule {
  readonly nodeEnv: string;
  readonly allowed: boolean;
  readonly allowDemoIdentities: boolean;
  readonly simulatedProviders: 'default' | 'opt-in' | 'blocked';
  readonly realProvidersAllowed: boolean;
  readonly blockReason?: string;
}

export interface RuntimeProviderRule {
  readonly id: string;
  readonly env: string;
  readonly simulatedValues: readonly string[];
  readonly defaultValue: string;
  readonly realOptInEnv: string;
  readonly highRiskFeatureId: string;
  readonly commercialLicenceDomains: readonly string[];
  readonly legalReviewRequired: boolean;
}

export interface RuntimeBoundaryConfig {
  readonly prototypeMode: boolean;
  readonly publicLaunch: boolean;
  readonly productionStartupAllowed: boolean;
  readonly profileEnv: string;
  readonly globalRealOptInEnv: string;
  readonly simulatedProviderOptInEnv: string;
  readonly credentialEnvPattern: string;
  readonly profiles: Readonly<Record<RuntimeProfile, RuntimeProfileRule>>;
  readonly providers: readonly RuntimeProviderRule[];
}

export interface RuntimeLaunchState {
  readonly publicLaunch: boolean;
  readonly legalApprover?: string | null;
  readonly complianceApprover?: string | null;
  readonly guardRemovalApprovalRef?: string | null;
}

export interface RuntimeLicensingDomain {
  readonly id: string;
  readonly status: string;
  readonly evidenceRef?: string | null;
}

export interface RuntimeHighRiskFeature {
  readonly id: string;
  readonly status: string;
  readonly legalSignoff?: unknown;
  readonly complianceSignoff?: unknown;
  readonly activationGates: readonly { readonly satisfied: boolean }[];
}

export interface RuntimeBoundaryInput {
  readonly env: Readonly<Record<string, string | undefined>>;
  readonly config: RuntimeBoundaryConfig;
  readonly launch: RuntimeLaunchState;
  readonly licensingDomains: readonly RuntimeLicensingDomain[];
  readonly highRiskFeatures: readonly RuntimeHighRiskFeature[];
}

export interface RuntimeBoundaryOutcome {
  readonly ok: boolean;
  readonly profile: RuntimeProfile | null;
  readonly violations: readonly string[];
  readonly warnings: readonly string[];
}

function isProfile(value: string | undefined): value is RuntimeProfile {
  return value != null && (RUNTIME_PROFILES as readonly string[]).includes(value);
}

export function resolveRuntimeProfile(env: Readonly<Record<string, string | undefined>>,
                                      profileEnv = 'RUNTIME_PROFILE'): RuntimeProfile | null {
  const explicit = env[profileEnv]?.trim().toLowerCase();
  if (explicit) return isProfile(explicit) ? explicit : null;
  switch (env.NODE_ENV?.trim().toLowerCase()) {
    case 'development': return 'local';
    case 'test': return 'test';
    case 'staging': return 'staging';
    case 'production': return 'production';
    default: return null;
  }
}

const truthy = (value: string | undefined): boolean => value?.trim().toLowerCase() === 'true';

export function evaluateRuntimeBoundaries(input: RuntimeBoundaryInput): RuntimeBoundaryOutcome {
  const { env, config } = input;
  const violations: string[] = [];
  const warnings: string[] = [];
  // Match the API zod default: an unset NODE_ENV behaves as development.
  const nodeEnv = env.NODE_ENV?.trim().toLowerCase() || 'development';
  const profile = resolveRuntimeProfile({ ...env, NODE_ENV: nodeEnv }, config.profileEnv);

  if (!profile) {
    violations.push('Runtime profile is unknown; set RUNTIME_PROFILE to local, test, staging or production');
    return { ok: false, profile: null, violations, warnings };
  }

  const rule = config.profiles[profile];
  if (!rule || !rule.allowed) {
    violations.push(rule?.blockReason ?? `Runtime profile ${profile} is not allowed`);
  }
  if (nodeEnv !== rule.nodeEnv) {
    violations.push(`NODE_ENV must be ${rule.nodeEnv} when ${config.profileEnv}=${profile}`);
  }
  if (truthy(env.ALLOW_DEMO_SEED) && !rule.allowDemoIdentities) {
    violations.push(`Demo identities are not allowed in ${profile}`);
  }
  if (truthy(env.REAL_PROVIDER_OPT_IN)) {
    warnings.push('Global real-provider opt-in is set; each provider still requires its own opt-in and evidence');
  }

  const featureById = new Map(input.highRiskFeatures.map((feature) => [feature.id, feature]));
  const domainById = new Map(input.licensingDomains.map((domain) => [domain.id, domain]));

  for (const provider of config.providers) {
    const value = (env[provider.env] ?? provider.defaultValue).trim().toLowerCase();
    const simulated = provider.simulatedValues.includes(value);
    if (simulated) {
      if (profile === 'production') {
        violations.push(`${provider.id} simulated adapter is blocked in production`);
      } else if (profile === 'staging' && rule.simulatedProviders === 'opt-in' &&
                 !truthy(env[config.simulatedProviderOptInEnv])) {
        violations.push(`${provider.id} simulated adapter in staging requires ${config.simulatedProviderOptInEnv}=true`);
      }
      continue;
    }

    if (value !== 'real') {
      violations.push(`${provider.env} has unknown adapter value ${value}`);
      continue;
    }
    if (!rule.realProvidersAllowed) {
      violations.push(`Real ${provider.id} adapter is not allowed in ${profile}`);
    }
    if (!truthy(env[config.globalRealOptInEnv]) || !truthy(env[provider.realOptInEnv])) {
      violations.push(`Real ${provider.id} adapter requires ${config.globalRealOptInEnv}=true and ${provider.realOptInEnv}=true`);
    }
    const credentialKey = config.credentialEnvPattern
      .replace('{PROVIDER}', provider.id.toUpperCase())
      .replace('{PROFILE}', profile.toUpperCase());
    if (!env[credentialKey]?.trim()) {
      violations.push(`Real ${provider.id} adapter requires profile-scoped credential ${credentialKey}`);
    }

    const feature = featureById.get(provider.highRiskFeatureId);
    const launchReady = input.launch.publicLaunch === true &&
      Boolean(input.launch.legalApprover) && Boolean(input.launch.complianceApprover) &&
      Boolean(input.launch.guardRemovalApprovalRef);
    const featureReady = feature !== undefined &&
      ['approved', 'activated', 'monitored'].includes(feature.status) &&
      Boolean(feature.legalSignoff) && Boolean(feature.complianceSignoff) &&
      feature.activationGates.every((gate) => gate.satisfied);
    const domainsReady = provider.commercialLicenceDomains.length > 0 &&
      provider.commercialLicenceDomains.every((id) => {
        const domain = domainById.get(id);
        return domain !== undefined && domain.status === 'obtained' && Boolean(domain.evidenceRef);
      });

    if (provider.legalReviewRequired && (!launchReady || !featureReady || !domainsReady)) {
      violations.push(`Real ${provider.id} adapter lacks launch, high-risk feature or commercial licence evidence`);
    }
  }

  return { ok: violations.length === 0, profile, violations, warnings };
}

/** Four-state adapter capability label used by startup diagnostics. */
export const ADAPTER_MODES = ['disabled', 'mock', 'sandbox', 'live'] as const;
export type AdapterMode = (typeof ADAPTER_MODES)[number];

/**
 * Resolves a non-secret mode label for an adapter. It does not authorise the
 * adapter: `evaluateRuntimeBoundaries` remains the startup gate. Unknown values,
 * blocked profiles and missing independent opt-ins resolve to `disabled`.
 */
export function resolveAdapterMode(
  env: Readonly<Record<string, string | undefined>>,
  provider: RuntimeProviderRule,
  config: RuntimeBoundaryConfig,
  profile: RuntimeProfile | null,
): AdapterMode {
  const value = (env[provider.env] ?? provider.defaultValue).trim().toLowerCase();
  if (!provider.simulatedValues.includes(value)) return 'disabled';
  const profileRule = profile ? config.profiles[profile] : undefined;
  if (!profileRule?.allowed || profileRule.realProvidersAllowed) return 'mock';
  const globalOptIn = env[config.globalRealOptInEnv]?.trim().toLowerCase() === 'true';
  const providerOptIn = env[provider.realOptInEnv]?.trim().toLowerCase() === 'true';
  const credentialKey = config.credentialEnvPattern
    .replace('{PROVIDER}', provider.id.toUpperCase())
    .replace('{PROFILE}', (profile ?? '').toUpperCase());
  if (!globalOptIn || !providerOptIn || !env[credentialKey]?.trim()) return 'mock';
  return profile === 'staging' ? 'sandbox' : 'mock';
}
