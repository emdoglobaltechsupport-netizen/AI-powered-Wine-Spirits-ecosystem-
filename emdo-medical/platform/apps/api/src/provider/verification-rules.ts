import type { CountryProfileStatus, ProviderVerificationStatus } from '@emdo/shared';

/**
 * Human-driven credentialing state machine. Automated transitions are not
 * permitted: submission is self-service, review/approval are named human
 * actions, and verified status is only reachable through a decided approval.
 */
export const VERIFICATION_TRANSITIONS: Readonly<Record<ProviderVerificationStatus, readonly ProviderVerificationStatus[]>> = {
  unverified: ['submitted'],
  submitted: ['under_review', 'rejected'],
  under_review: ['verified', 'rejected'],
  rejected: ['submitted'],
  verified: ['suspended', 'revoked'],
  suspended: ['under_review', 'revoked'],
  revoked: [],
};

export function assertVerificationTransition(
  from: ProviderVerificationStatus,
  to: ProviderVerificationStatus,
): void {
  if (!VERIFICATION_TRANSITIONS[from].includes(to)) {
    throw new Error('INVALID_VERIFICATION_TRANSITION');
  }
}

export interface VerificationSourceOptions {
  nodeEnv: string;
  countryStatus: CountryProfileStatus;
}

/**
 * Fail-closed verification-source gate. Manual review is permitted only in
 * non-approved/test configurations. Production or an approved country profile
 * requires a source explicitly marked authoritative and tested; no adapter is
 * bundled, so startup/use fails closed until one is contracted and configured.
 */
export function assertVerificationSource(
  countryConfig: Record<string, unknown>,
  options: VerificationSourceOptions,
): string {
  const configured = countryConfig['verificationSources'];
  const sources = Array.isArray(configured)
    ? (configured as Array<Record<string, unknown>>)
    : [];
  const strict = options.nodeEnv === 'production' || options.countryStatus === 'approved';
  const eligible = sources.find((source) => {
    if (source['enabled'] !== true) return false;
    if (strict) return source['authoritative'] === true && source['tested'] === true;
    return source['kind'] === 'manual' || source['authoritative'] === true;
  });

  if (!eligible) throw new Error('VERIFICATION_SOURCE_NOT_CONFIGURED');
  return String(eligible['kind'] ?? (strict ? 'authoritative' : 'manual'));
}
