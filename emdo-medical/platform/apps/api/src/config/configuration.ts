export interface AppConfiguration {
  nodeEnv: 'development' | 'test' | 'staging' | 'production';
  port: number;
  databaseUrl: string;
  testDatabaseUrl: string | undefined;
  dataEncryptionKey: string;
  jwtAccessSecret: string;
  jwtRefreshSecret: string;
  jwtAccessTtl: number;
  jwtRefreshTtl: number;
  countryProfileMode: 'sandbox' | 'approved';
  scryptCost: number;
  auditRetentionDays: number;
  maxAuditPageSize: number;
  aiModelBackend: string;
}

export default (): AppConfiguration => ({
  nodeEnv: (process.env.NODE_ENV ?? 'development') as AppConfiguration['nodeEnv'],
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: process.env.DATABASE_URL ?? '',
  testDatabaseUrl: process.env.TEST_DATABASE_URL,
  dataEncryptionKey: process.env.DATA_ENCRYPTION_KEY ?? '',
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET ?? '',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET ?? '',
  jwtAccessTtl: Number(process.env.JWT_ACCESS_TTL ?? 900),
  jwtRefreshTtl: Number(process.env.JWT_REFRESH_TTL ?? 1209600),
  countryProfileMode: (process.env.COUNTRY_PROFILE_MODE ?? 'sandbox') as AppConfiguration['countryProfileMode'],
  scryptCost: Number(process.env.SCRYPT_COST ?? 14),
  auditRetentionDays: Number(process.env.AUDIT_RETENTION_DAYS ?? 2555),
  maxAuditPageSize: Number(process.env.MAX_AUDIT_PAGE_SIZE ?? 200),
  aiModelBackend: process.env.AI_MODEL_BACKEND ?? 'offline',
});
