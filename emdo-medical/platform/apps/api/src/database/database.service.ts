import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

export interface SystemContext {
  tenantId?: string;
  userId?: string;
  countryCode?: string;
  isSystem?: boolean;
  isPlatform?: boolean;
}

/**
 * All database access goes through this service. Row-level security is
 * FORCEd on every tenant table; a missing `app.tenant_id` setting yields zero
 * rows. Application checks remain authoritative; RLS is defence in depth.
 */
@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private pool: Pool | undefined;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    this.pool = new Pool({
      connectionString: this.config.getOrThrow<string>('databaseUrl'),
      max: 10,
      idleTimeoutMillis: 30000,
    });
    const client = await this.pool.connect();
    try {
      await client.query('SELECT 1');
      this.logger.log('Database connection established');
    } finally {
      client.release();
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool?.end();
  }

  getPool(): Pool {
    if (!this.pool) throw new Error('DATABASE_NOT_INITIALISED');
    return this.pool;
  }

  async query<T extends QueryResultRow = QueryResultRow>(
    sql: string,
    params: unknown[] = [],
    context: SystemContext = {},
  ): Promise<QueryResult<T>> {
    return this.withContext(context, (client) => client.query<T>(sql, params));
  }

  async withTenant<T>(tenantId: string, context: SystemContext, work: (client: PoolClient) => Promise<T>): Promise<T> {
    return this.withContext({ ...context, tenantId }, work);
  }

  async withContext<T>(context: SystemContext, work: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.getPool().connect();
    try {
      await client.query('BEGIN');
      await this.applyContext(client, context);
      const result = await work(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private async applyContext(client: PoolClient, context: SystemContext): Promise<void> {
    const settings: Array<[string, string]> = [
      ['app.tenant_id', context.tenantId ?? ''],
      ['app.user_id', context.userId ?? ''],
      ['app.country_code', context.countryCode ?? ''],
      ['app.is_system', context.isSystem ? 'on' : 'off'],
      ['app.is_platform', context.isPlatform ? 'on' : 'off'],
    ];
    for (const [key, value] of settings) {
      await client.query('SELECT set_config($1, $2, true)', [key, value]);
    }
  }

  /** Applies ordered SQL migrations. Used by CLI and test setup, not by app startup. */
  async runMigrations(directory: string): Promise<string[]> {
    await this.getPool().query(
      `CREATE TABLE IF NOT EXISTS schema_migrations (
         name text PRIMARY KEY,
         applied_at timestamptz NOT NULL DEFAULT now()
       )`,
    );
    const files = (await readdir(directory)).filter((f) => f.endsWith('.sql')).sort();
    const applied: string[] = [];
    for (const file of files) {
      const already = await this.query<{ name: string }>(
        'SELECT name FROM schema_migrations WHERE name = $1',
        [file],
        { isSystem: true },
      );
      if (already.rowCount) continue;
      const sql = await readFile(join(directory, file), 'utf8');
      const client = await this.getPool().connect();
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        applied.push(file);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    }
    return applied;
  }
}
