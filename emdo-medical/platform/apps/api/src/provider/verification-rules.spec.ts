import {
  assertVerificationSource,
  assertVerificationTransition,
} from './verification-rules';

describe('verification rules', () => {
  it('permits only the declared human state transitions', () => {
    expect(() => assertVerificationTransition('unverified', 'submitted')).not.toThrow();
    expect(() => assertVerificationTransition('submitted', 'under_review')).not.toThrow();
    expect(() => assertVerificationTransition('under_review', 'verified')).not.toThrow();
    expect(() => assertVerificationTransition('verified', 'suspended')).not.toThrow();
    expect(() => assertVerificationTransition('suspended', 'under_review')).not.toThrow();
    expect(() => assertVerificationTransition('rejected', 'submitted')).not.toThrow();

    expect(() => assertVerificationTransition('verified', 'under_review')).toThrow('INVALID_VERIFICATION_TRANSITION');
    expect(() => assertVerificationTransition('revoked', 'verified')).toThrow('INVALID_VERIFICATION_TRANSITION');
    expect(() => assertVerificationTransition('unverified', 'verified')).toThrow('INVALID_VERIFICATION_TRANSITION');
  });

  it('fails closed when no verification source is configured', () => {
    expect(() => assertVerificationSource({}, { nodeEnv: 'test', countryStatus: 'sandbox' }))
      .toThrow('VERIFICATION_SOURCE_NOT_CONFIGURED');
    expect(() => assertVerificationSource({ verificationSources: [] }, { nodeEnv: 'test', countryStatus: 'sandbox' }))
      .toThrow('VERIFICATION_SOURCE_NOT_CONFIGURED');
  });

  it('allows manual review only outside approved/production configurations', () => {
    const config = { verificationSources: [{ kind: 'manual', enabled: true }] };
    expect(assertVerificationSource(config, { nodeEnv: 'test', countryStatus: 'sandbox' })).toBe('manual');
    expect(() => assertVerificationSource(config, { nodeEnv: 'production', countryStatus: 'approved' }))
      .toThrow('VERIFICATION_SOURCE_NOT_CONFIGURED');
  });

  it('requires an authoritative tested source in production', () => {
    const config = {
      verificationSources: [{ kind: 'registry', enabled: true, authoritative: true, tested: true }],
    };
    expect(assertVerificationSource(config, { nodeEnv: 'production', countryStatus: 'approved' })).toBe('registry');
  });
});
