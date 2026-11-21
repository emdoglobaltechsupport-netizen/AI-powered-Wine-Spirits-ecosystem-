/**
 * Count-only coverage map for the 19-workspace Admin console.
 *
 * This endpoint never returns business rows or PII. It reports which seeded
 * Postgres tables can truthfully back each workspace and how many demo rows
 * exist. Tables with `tenant_user_isolation` (loyalty, subscriptions, vault)
 * are deliberately excluded because the Admin session sets only app.tenant_id,
 * not app.user_id. Zero counts are real zero seeded rows, not live KPIs.
 */

import { tenantQuery, TENANT_ID } from '../../db/tenant.js';

type CoverageScope = 'rls-tenant' | 'explicit-tenant' | 'single-tenant-demo' | 'shared-reference';
type CoverageStatus = 'db-backed' | 'partial' | 'simulated';

type CountSpec = {
  label: string;
  table: string;
  scope: CoverageScope;
  note: string;
};

type ModuleSpec = {
  module: string;
  title: string;
  status: CoverageStatus;
  note: string;
  counts: readonly CountSpec[];
};

const MODULES: readonly ModuleSpec[] = [
  {
    module: 'overview',
    title: 'Super Admin Dashboard',
    status: 'partial',
    note: 'Daily metrics are seeded constants; action counts are real demo rows. No live telemetry.',
    counts: [
      { label: 'Seeded daily metrics', table: 'admin_metrics_daily', scope: 'rls-tenant', note: 'Projection constants, not computed KPIs' },
      { label: 'Privileged actions', table: 'admin_actions', scope: 'rls-tenant', note: 'Append-only demo log' },
    ],
  },
  {
    module: 'users',
    title: 'User Management',
    status: 'db-backed',
    note: 'Prototype single-tenant tables. No PII is returned by this endpoint.',
    counts: [
      { label: 'Demo profiles', table: 'users', scope: 'single-tenant-demo', note: 'No tenant_id column in baseline schema' },
      { label: 'Age assertions', table: 'age_verifications', scope: 'single-tenant-demo', note: 'Seeded verification rows' },
    ],
  },
  {
    module: 'roles',
    title: 'Role & Permissions',
    status: 'partial',
    note: 'Roles exist; permission and grant tables currently have no seeded rows.',
    counts: [
      { label: 'Roles', table: 'admin_roles', scope: 'rls-tenant', note: 'Six seeded roles' },
      { label: 'Permissions', table: 'admin_permissions', scope: 'rls-tenant', note: 'No seeded rows' },
      { label: 'Staff grants', table: 'admin_staff_roles', scope: 'rls-tenant', note: 'Named demo assignments' },
      { label: 'Role grants', table: 'admin_role_permissions', scope: 'rls-tenant', note: 'No seeded rows' },
    ],
  },
  {
    module: 'products',
    title: 'Product Management',
    status: 'db-backed',
    note: 'Shared reference catalogue; price and editorial content are canonical demo data.',
    counts: [
      { label: 'SKUs', table: 'skus', scope: 'shared-reference', note: 'Reference table, not tenant-scoped' },
      { label: 'Editorial records', table: 'product_content', scope: 'shared-reference', note: 'Storefront content only' },
    ],
  },
  {
    module: 'sellers',
    title: 'Seller Management',
    status: 'db-backed',
    note: 'Seller review rows use an explicit tenant filter; no external licence source is contacted.',
    counts: [
      { label: 'Sellers', table: 'sellers', scope: 'single-tenant-demo', note: 'Prototype single-tenant table' },
      { label: 'Seller reviews', table: 'admin_seller_reviews', scope: 'explicit-tenant', note: 'Tenant column present, no RLS policy' },
    ],
  },
  {
    module: 'orders',
    title: 'Order Management',
    status: 'db-backed',
    note: 'Simulated commerce rows; no processor or fulfilment provider is contacted.',
    counts: [
      { label: 'Orders', table: 'orders', scope: 'single-tenant-demo', note: 'Prototype single-tenant table' },
      { label: 'Payments', table: 'payments', scope: 'explicit-tenant', note: 'Simulated payment adapter rows' },
    ],
  },
  {
    module: 'inventory',
    title: 'Inventory Management',
    status: 'db-backed',
    note: 'Stock positions are seeded demo rows; no warehouse system is connected.',
    counts: [
      { label: 'Stock positions', table: 'inventory_items', scope: 'single-tenant-demo', note: 'Prototype single-tenant table' },
      { label: 'Stock alerts', table: 'inventory_alerts', scope: 'explicit-tenant', note: 'No seeded alerts' },
    ],
  },
  {
    module: 'crm',
    title: 'CRM',
    status: 'db-backed',
    note: 'Pseudonymous customer rollups are RLS-scoped. Zero means no seeded rows.',
    counts: [
      { label: 'Customer rollups', table: 'seller_customers', scope: 'rls-tenant', note: 'Pseudonymous keys only' },
      { label: 'Segments', table: 'customer_segments', scope: 'explicit-tenant', note: 'Tenant column present, no RLS policy' },
    ],
  },
  {
    module: 'finance',
    title: 'Finance & Accounting',
    status: 'db-backed',
    note: 'Ledger-shaped demo rows only. No processor, settlement file or bank feed is live.',
    counts: [
      { label: 'Ledger postings', table: 'ledger_postings', scope: 'rls-tenant', note: 'No seeded postings' },
      { label: 'Settlements', table: 'payment_settlements', scope: 'explicit-tenant', note: 'Simulated adapter batches' },
      { label: 'Reconciliations', table: 'settlement_reconciliations', scope: 'explicit-tenant', note: 'No seeded reconciliations' },
    ],
  },
  {
    module: 'marketing',
    title: 'Marketing Management',
    status: 'db-backed',
    note: 'Campaign rows are RLS-scoped; review tables are not seeded. No ads or emails are sent.',
    counts: [
      { label: 'Campaigns', table: 'marketing_campaigns', scope: 'rls-tenant', note: 'Human-approval gate columns present' },
      { label: 'Campaign reviews', table: 'admin_campaign_reviews', scope: 'explicit-tenant', note: 'No seeded reviews' },
    ],
  },
  {
    module: 'loyalty',
    title: 'Loyalty Program Management',
    status: 'partial',
    note: 'Only versioned policy rules are readable. Member accounts use tenant_user_isolation and are excluded.',
    counts: [
      { label: 'Earn rules', table: 'earn_rules', scope: 'rls-tenant', note: 'No seeded rules' },
      { label: 'Tier rules', table: 'tier_rules', scope: 'explicit-tenant', note: 'Policy rows only' },
    ],
  },
  {
    module: 'subscriptions',
    title: 'Subscription Management',
    status: 'partial',
    note: 'Club plans are readable reference rows; member subscriptions are excluded from the admin read path.',
    counts: [
      { label: 'Club plans', table: 'club_plans', scope: 'shared-reference', note: 'Good / Better / Best / Icon' },
      { label: 'Member subscriptions', table: 'subscriptions', scope: 'single-tenant-demo', note: 'Counted for coverage only; not exposed as rows' },
    ],
  },
  {
    module: 'logistics',
    title: 'Logistics Management',
    status: 'db-backed',
    note: 'Shipment and customs rows are seeded demo data; no carrier API is contacted.',
    counts: [
      { label: 'Shipments', table: 'shipments', scope: 'single-tenant-demo', note: 'Prototype single-tenant table' },
      { label: 'Delivery exceptions', table: 'delivery_exceptions', scope: 'explicit-tenant', note: 'No seeded exceptions' },
      { label: 'Customs declarations', table: 'customs_declarations', scope: 'explicit-tenant', note: 'Simulated documentation' },
    ],
  },
  {
    module: 'compliance',
    title: 'Compliance Management',
    status: 'partial',
    note: 'Control flags and jurisdiction reference data are readable. No certification or live audit is claimed.',
    counts: [
      { label: 'Entity flags', table: 'admin_entity_flags', scope: 'rls-tenant', note: 'No seeded flags' },
      { label: 'Jurisdictions', table: 'countries', scope: 'shared-reference', note: 'Minimum-age reference rows' },
    ],
  },
  {
    module: 'support',
    title: 'Customer Support Management',
    status: 'db-backed',
    note: 'Unified case queue is RLS-scoped. The current domain enum predates a dedicated support domain.',
    counts: [
      { label: 'Cases', table: 'admin_cases', scope: 'rls-tenant', note: 'Unified operations queue' },
      { label: 'Case comments', table: 'admin_case_comments', scope: 'rls-tenant', note: 'No seeded comments' },
    ],
  },
  {
    module: 'ai',
    title: 'AI Operations Center',
    status: 'db-backed',
    note: 'Model controls and evaluations are simulated registry rows; no live model is served from Admin.',
    counts: [
      { label: 'Model controls', table: 'admin_ai_model_controls', scope: 'rls-tenant', note: 'Kill switch target < 1 minute' },
      { label: 'Evaluations', table: 'admin_ai_model_evaluations', scope: 'rls-tenant', note: 'No seeded evaluations' },
    ],
  },
  {
    module: 'security',
    title: 'Security Center',
    status: 'partial',
    note: 'Elevation sessions and actions are readable. Login attempts lack tenant scoping and are excluded.',
    counts: [
      { label: 'Admin sessions', table: 'admin_sessions', scope: 'rls-tenant', note: 'Seeded elevation sessions' },
      { label: 'Privileged actions', table: 'admin_actions', scope: 'rls-tenant', note: 'Append-only demo log' },
    ],
  },
  {
    module: 'global',
    title: 'Global Operations Center',
    status: 'db-backed',
    note: 'Reference data only. Provider availability and readiness labels are illustrative.',
    counts: [
      { label: 'Markets', table: 'countries', scope: 'shared-reference', note: 'Launch-market reference rows' },
      { label: 'Currencies', table: 'currencies', scope: 'shared-reference', note: 'Eight display currencies' },
      { label: 'FX rates', table: 'exchange_rates', scope: 'shared-reference', note: 'Demo rates; 15-minute UI lock' },
    ],
  },
  {
    module: 'techops',
    title: 'Ultimate AI TechOps',
    status: 'simulated',
    note: '24 specialist agents and their workflows are design-time simulations. No live telemetry, autonomous remediation or provider action exists in this build.',
    counts: [],
  },
];

type CoverageCount = CountSpec & { value: number };
type CoverageModule = Omit<ModuleSpec, 'counts'> & { counts: CoverageCount[] };

const DISCLAIMER =
  'Counts are computed from seeded demo rows at request time. They are not live commerce, ' +
  'payment, model, regulatory or infrastructure metrics. All Admin mutations remain simulated.';

function countQuery(spec: CountSpec): { text: string; params: unknown[] } {
  const scoped = spec.scope === 'rls-tenant' || spec.scope === 'explicit-tenant';
  return {
    text: `SELECT count(*)::bigint AS count FROM ${spec.table}${scoped ? ' WHERE tenant_id = $1' : ''}`,
    params: scoped ? [TENANT_ID] : [],
  };
}

async function readCount(spec: CountSpec): Promise<CoverageCount> {
  const query = countQuery(spec);
  const rows = await tenantQuery<{ count: string }>(query.text, query.params);
  return { ...spec, value: Number(rows[0]?.count ?? 0) };
}

export async function coverage() {
  const modules: CoverageModule[] = await Promise.all(
    MODULES.map(async (spec): Promise<CoverageModule> => ({
      module: spec.module,
      title: spec.title,
      status: spec.status,
      note: spec.note,
      counts: await Promise.all(spec.counts.map(readCount)),
    })),
  );

  const counts = modules.flatMap((module) => module.counts);
  const computedAt = new Date().toISOString();
  return {
    computedAt,
    generatedAt: computedAt,
    source: 'seeded-postgres-demo',
    asOf: 'seeded-demo-data',
    environment: 'local-demo',
    disclaimer: DISCLAIMER,
    summary: {
      modules: modules.length,
      dbBacked: modules.filter((module) => module.status === 'db-backed').length,
      partial: modules.filter((module) => module.status === 'partial').length,
      simulated: modules.filter((module) => module.status === 'simulated').length,
      totalCounts: counts.length,
      rlsTenantCounts: counts.filter((count) => count.scope === 'rls-tenant').length,
      explicitTenantCounts: counts.filter((count) => count.scope === 'explicit-tenant').length,
      singleTenantDemoCounts: counts.filter((count) => count.scope === 'single-tenant-demo').length,
      sharedReferenceCounts: counts.filter((count) => count.scope === 'shared-reference').length,
    },
    modules,
  };
}

export default coverage;
