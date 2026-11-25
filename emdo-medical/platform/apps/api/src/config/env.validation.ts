/** Fails fast on missing or unsafe configuration. Never logs secret values. */
export function validateEnvironment(env: Record<string, unknown>): Record<string, unknown> {
  const required = [
    'DATABASE_URL',
    'DATA_ENCRYPTION_KEY',
    'JWT_ACCESS_SECRET',
    'JWT_REFRESH_SECRET',
  ];

  for (const key of required) {
    const value = env[key];
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }

  const decode = (key: string, expectedBytes: number): void => {
    const value = String(env[key]);
    const bytes = Buffer.from(value, 'base64');
    if (bytes.length !== expectedBytes) {
      throw new Error(`${key} must be base64-encoded ${expectedBytes} bytes`);
    }
    if (/REPLACE_WITH|^change-me$/i.test(value)) {
      throw new Error(`${key} still contains a placeholder value`);
    }
  };

  decode('DATA_ENCRYPTION_KEY', 32);
  decode('JWT_ACCESS_SECRET', 48);
  decode('JWT_REFRESH_SECRET', 48);

  const nodeEnv = String(env.NODE_ENV ?? 'development');
  if (!['development', 'test', 'staging', 'production'].includes(nodeEnv)) {
    throw new Error(`Unsupported NODE_ENV: ${nodeEnv}`);
  }

  if (nodeEnv === 'production' && String(env.COUNTRY_PROFILE_MODE ?? '') !== 'approved') {
    throw new Error('Production requires COUNTRY_PROFILE_MODE=approved');
  }

  // The only implemented gateway is the offline prototype. No model provider,
  // DPA or residency decision exists, so production must fail closed.
  const backend = String(env.AI_MODEL_BACKEND ?? 'offline');
  if (backend !== 'offline') {
    throw new Error('AI_MODEL_BACKEND_NOT_CONFIGURED: only offline prototype is implemented');
  }
  if (nodeEnv === 'production') {
    throw new Error('AI_MODEL_BACKEND_NOT_CONFIGURED: production requires an approved tested model provider');
  }

  return env;
}
