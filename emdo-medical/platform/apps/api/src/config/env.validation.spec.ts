import { validateEnvironment } from './env.validation';

const valid = {
  DATABASE_URL: 'postgres://user:pass@127.0.0.1/db',
  DATA_ENCRYPTION_KEY: Buffer.alloc(32, 1).toString('base64'),
  JWT_ACCESS_SECRET: Buffer.alloc(48, 2).toString('base64'),
  JWT_REFRESH_SECRET: Buffer.alloc(48, 3).toString('base64'),
  NODE_ENV: 'development',
};

describe('validateEnvironment', () => {
  it('accepts a complete development configuration', () => {
    expect(() => validateEnvironment({ ...valid })).not.toThrow();
  });

  it('rejects placeholder secrets', () => {
    expect(() => validateEnvironment({ ...valid, DATA_ENCRYPTION_KEY: 'REPLACE_WITH_BASE64_32_BYTES' })).toThrow();
  });

  it('rejects production without approved country mode', () => {
    expect(() => validateEnvironment({ ...valid, NODE_ENV: 'production' })).toThrow(/COUNTRY_PROFILE_MODE/);
  });

  it('accepts the explicit offline prototype backend in development', () => {
    expect(() => validateEnvironment({ ...valid, AI_MODEL_BACKEND: 'offline' })).not.toThrow();
  });

  it('rejects unimplemented model backends and production AI', () => {
    expect(() => validateEnvironment({ ...valid, AI_MODEL_BACKEND: 'external' }))
      .toThrow(/AI_MODEL_BACKEND_NOT_CONFIGURED/);
    expect(() => validateEnvironment({
      ...valid,
      NODE_ENV: 'production',
      COUNTRY_PROFILE_MODE: 'approved',
    })).toThrow(/AI_MODEL_BACKEND_NOT_CONFIGURED/);
  });
});
