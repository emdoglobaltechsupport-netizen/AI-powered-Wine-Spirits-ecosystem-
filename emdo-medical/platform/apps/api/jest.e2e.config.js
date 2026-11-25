module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/test/**/*.e2e-spec.ts'],
  setupFiles: ['<rootDir>/test/setup-env.js'],
  moduleNameMapper: { '^@emdo/shared$': '<rootDir>/../../packages/shared/src/index.ts' },
  // Password hashing is intentionally memory-hard (scrypt N=2^14). Several
  // accounts are created/logged in per suite, so integration hooks need a
  // longer budget than the default without weakening production settings.
  testTimeout: 300000,
};
