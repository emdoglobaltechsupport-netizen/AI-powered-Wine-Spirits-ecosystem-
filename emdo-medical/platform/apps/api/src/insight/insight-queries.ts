import type { InsightMetricId } from '@emdo/shared';

/**
 * The only SQL the Insight API may execute. Queries are fixed and parameterised:
 * the caller cannot choose tables, columns, joins or predicates. No PHI table,
 * record payload, decrypted value, raw identifier or credential reference is
 * readable through this boundary.
 */
export interface InsightDimensionColumn {
  readonly column: string;
  readonly key: string;
}

export interface InsightQuerySpec {
  readonly sql: string;
  readonly dimensions: readonly InsightDimensionColumn[];
}

export const INSIGHT_QUERY_SPECS: Readonly<Partial<Record<InsightMetricId, InsightQuerySpec>>> = {
  'M10-M001': {
    dimensions: [],
    sql: `SELECT country_code, count(DISTINCT user_id)::int AS value
            FROM user_roles
           WHERE ($1 = 'ALL' OR country_code = $1)
           GROUP BY country_code
           ORDER BY country_code`,
  },
  'M10-M002': {
    dimensions: [],
    sql: `SELECT country_code, count(DISTINCT user_id)::int AS value
            FROM provider_profiles
           WHERE verification_status = 'verified'
             AND ($1 = 'ALL' OR country_code = $1)
           GROUP BY country_code
           ORDER BY country_code`,
  },
  'M10-M009': {
    dimensions: [{ column: 'period', key: 'period' }],
    sql: `SELECT u.country_code,
                 to_char(date_trunc('month', u.created_at), 'YYYY-MM') AS period,
                 count(*)::int AS value
            FROM users u
           WHERE ($1 = 'ALL' OR u.country_code = $1)
             AND EXISTS (
               SELECT 1 FROM user_roles ur
                WHERE ur.user_id = u.id AND ur.role = 'patient'
             )
           GROUP BY u.country_code, date_trunc('month', u.created_at)
           ORDER BY u.country_code, period`,
  },
  'M10-M011': {
    dimensions: [
      { column: 'agent_id', key: 'agentId' },
      { column: 'capability', key: 'capability' },
      { column: 'outcome', key: 'outcome' },
    ],
    sql: `SELECT country_code, agent_id, capability, outcome, count(*)::int AS value
            FROM ai_interactions
           WHERE ($1 = 'ALL' OR country_code = $1)
           GROUP BY country_code, agent_id, capability, outcome
           ORDER BY country_code, agent_id, capability, outcome`,
  },
};

export function getInsightQuerySpec(id: InsightMetricId): InsightQuerySpec | undefined {
  return INSIGHT_QUERY_SPECS[id];
}
