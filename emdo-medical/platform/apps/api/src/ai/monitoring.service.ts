import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { RequestContext } from '../common/auth/request-context';

interface CountRow { count: number }
interface GroupRow { agent_id: string; outcome: string; count: number }

export interface AiMetrics {
  countryCode: string;
  totalInteractions: number;
  interactionsLast24Hours: number;
  byAgent: Record<string, number>;
  byOutcome: Record<string, number>;
  pendingApprovals: number;
  openEscalations: number;
  generatedAt: string;
}

/** API-only operational metrics. There is no client-facing dashboard. */
@Injectable()
export class AiMonitoringService {
  constructor(private readonly db: DatabaseService) {}

  async metrics(ctx: RequestContext): Promise<AiMetrics> {
    const scope = ctx.isPlatform ? '%' : ctx.countryCode;
    const [groups, totals, recent, approvals, escalations] = await Promise.all([
      this.db.query<GroupRow>(
        `SELECT agent_id, outcome, count(*)::int AS count
           FROM ai_interactions
          WHERE country_code LIKE $1
          GROUP BY agent_id, outcome`,
        [scope],
        { isSystem: true },
      ),
      this.db.query<CountRow>(
        'SELECT count(*)::int AS count FROM ai_interactions WHERE country_code LIKE $1',
        [scope],
        { isSystem: true },
      ),
      this.db.query<CountRow>(
        `SELECT count(*)::int AS count FROM ai_interactions
          WHERE country_code LIKE $1 AND created_at > now() - interval '24 hours'`,
        [scope],
        { isSystem: true },
      ),
      this.db.query<CountRow>(
        `SELECT count(*)::int AS count FROM approval_requests
          WHERE country_code LIKE $1
            AND action IN ('AI_DRAFT_REVIEW','AI_WORKFLOW_EXECUTION')
            AND decision = 'pending' AND consumed_at IS NULL`,
        [scope],
        { isSystem: true },
      ),
      this.db.query<CountRow>(
        `SELECT count(*)::int AS count FROM ai_escalations
          WHERE country_code LIKE $1 AND status <> 'resolved'`,
        [scope],
        { isSystem: true },
      ),
    ]);

    const byAgent: Record<string, number> = {};
    const byOutcome: Record<string, number> = {};
    for (const row of groups.rows) {
      byAgent[row.agent_id] = (byAgent[row.agent_id] ?? 0) + row.count;
      byOutcome[row.outcome] = (byOutcome[row.outcome] ?? 0) + row.count;
    }

    return {
      countryCode: ctx.isPlatform ? 'ALL' : ctx.countryCode,
      totalInteractions: totals.rows[0]?.count ?? 0,
      interactionsLast24Hours: recent.rows[0]?.count ?? 0,
      byAgent,
      byOutcome,
      pendingApprovals: approvals.rows[0]?.count ?? 0,
      openEscalations: escalations.rows[0]?.count ?? 0,
      generatedAt: new Date().toISOString(),
    };
  }
}
