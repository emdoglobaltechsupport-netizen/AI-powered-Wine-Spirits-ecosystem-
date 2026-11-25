module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
  maxWorkers: 1,
  moduleNameMapper: { '^@emdo/shared$': '<rootDir>/../../packages/shared/src/index.ts' },
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.spec.ts', '!src/main.ts'],
};
