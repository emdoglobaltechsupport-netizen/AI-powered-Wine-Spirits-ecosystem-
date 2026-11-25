import Link from 'next/link';
import { redirect } from 'next/navigation';
import { INSIGHT_MIN_GROUP_SIZE } from '@emdo/shared';
import { ErrorState } from '../components/error-state';
import { PortalNav } from '../components/portal-nav';
import {
  fetchMetricDefinitions,
  fetchReportDefinitions,
  InsightApiError,
} from '../lib/api';
import { readPortalSession } from '../lib/server-session';

export const dynamic = 'force-dynamic';

function errorCode(error: unknown): string {
  return error instanceof InsightApiError ? error.code : 'INTERNAL_ERROR';
}

export default async function OverviewPage() {
  const session = await readPortalSession();
  if (!session) redirect('/login?reason=expired');

  let metrics: Awaited<ReturnType<typeof fetchMetricDefinitions>> = [];
  let reports: Awaited<ReturnType<typeof fetchReportDefinitions>> = [];
  let failed: string | null = null;
  try {
    [metrics, reports] = await Promise.all([
      fetchMetricDefinitions(session),
      fetchReportDefinitions(session),
    ]);
  } catch (error) {
    if (error instanceof InsightApiError && error.status === 401) redirect('/login?reason=expired');
    failed = errorCode(error);
  }

  return (
    <main>
      <PortalNav session={session} />
      <h1>Super Admin overview</h1>
      <p className="notice">
        Versioned aggregate API only. Every metric carries evidence; absent sources are never shown
        as zero or estimated. Minimum displayed cell size is {INSIGHT_MIN_GROUP_SIZE}.
      </p>
      {failed ? <ErrorState code={failed} /> : (
        <>
          <div className="card-grid">
            <section className="panel">
              <h2>{metrics.length}</h2>
              <p>Metric definitions visible to this role</p>
              <Link href="/metrics">Open metric catalogue</Link>
            </section>
            <section className="panel">
              <h2>{reports.length}</h2>
              <p>Report templates visible to this role</p>
              <Link href="/reports">Open reports</Link>
            </section>
            <section className="panel">
              <h2>Prototype</h2>
              <p>No client-side role bypass: the API re-checks every request.</p>
            </section>
          </div>
          <p className="notice notice--decision">
            The CEO / Super Admin retains final strategic authority. This portal cannot approve,
            sign, export or execute a clinical, financial or sensitive operation.
          </p>
        </>
      )}
    </main>
  );
}
