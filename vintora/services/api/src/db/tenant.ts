import type { PoolClient, QueryResultRow } from 'pg';
import { transaction } from './pool.js';

/** Single-tenant prototype deployment. Multi-tenancy replaces this from the session. */
export const TENANT_ID = '00000000-0000-0000-0000-000000000001';

/** Explicit simulated jurisdiction scope for locally registered prototype users. */
export const PROTOTYPE_JURISDICTIONS = ['US', 'GB'] as const;

/**
 * Run work with mandatory tenant context. RLS policies are fail-closed:
 * without `app.tenant_id`, admin tables return no rows.
 */
export function withTenant<T>(
  fn: (client: PoolClient) => Promise<T>,
  tenantId: string = TENANT_ID,
  userId?: string,
): Promise<T> {
  if (!tenantId) throw new Error('Tenant context is required');
  return transaction(async (client) => {
    await client.query('SELECT set_config($1, $2, true)', ['app.tenant_id', tenantId]);
    if (userId) {
      await client.query('SELECT set_config($1, $2, true)', ['app.user_id', userId]);
    }
    return fn(client);
  });
}

export function tenantQuery<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: readonly unknown[] = [],
  tenantId: string = TENANT_ID,
  userId?: string,
): Promise<T[]> {
  return withTenant(async (client) => {
    const result = await client.query<T>(text, params as unknown[]);
    return result.rows;
  }, tenantId, userId);
}
