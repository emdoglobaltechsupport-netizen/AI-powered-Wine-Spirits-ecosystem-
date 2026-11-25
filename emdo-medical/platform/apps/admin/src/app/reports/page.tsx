import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ErrorState } from '../../components/error-state';
import { PortalNav } from '../../components/portal-nav';
import { fetchReportDefinitions, InsightApiError } from '../../lib/api';
import { readPortalSession } from '../../lib/server-session';

export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
  const session = await readPortalSession();
  if (!session) redirect('/login?reason=expired');

  let reports: Awaited<ReturnType<typeof fetchReportDefinitions>> = [];
  let failed: string | null = null;
  try {
    reports = await fetchReportDefinitions(session);
  } catch (error) {
    if (error instanceof InsightApiError && error.status === 401) redirect('/login?reason=expired');
    failed = error instanceof InsightApiError ? error.code : 'INTERNAL_ERROR';
  }

  return (
    <main>
      <PortalNav session={session} />
      <h1>Executive reports</h1>
      <p className="notice">
        Daily, weekly and monthly decision-support templates. Generation is audited; nothing is
        exported, approved or executed by this portal.
      </p>
      {failed ? <ErrorState code={failed} /> : (
        <div className="card-grid">
          {reports.map((report) => (
            <article className="panel" key={report.id}>
              <h2>{report.title}</h2>
              <p className="metric-card__meta">
                {report.group} · {report.cadences.join(', ')}
              </p>
              <p>{report.metricIds.length} versioned metric(s)</p>
              <Link href={`/reports/${report.id}`}>Generate report</Link>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
