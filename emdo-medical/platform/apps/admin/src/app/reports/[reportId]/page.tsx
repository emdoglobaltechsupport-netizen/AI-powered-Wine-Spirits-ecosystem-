import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { INSIGHT_REPORT_IDS } from '@emdo/shared';
import { ErrorState } from '../../../components/error-state';
import { PortalNav } from '../../../components/portal-nav';
import { ReportGenerator } from '../../../components/report-generator';
import { fetchReportDefinition, InsightApiError } from '../../../lib/api';
import { readPortalSession } from '../../../lib/server-session';

export const dynamic = 'force-dynamic';

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ reportId: string }>;
}) {
  const { reportId } = await params;
  if (!INSIGHT_REPORT_IDS.includes(reportId as (typeof INSIGHT_REPORT_IDS)[number])) notFound();

  const session = await readPortalSession();
  if (!session) redirect('/login?reason=expired');

  let definition: Awaited<ReturnType<typeof fetchReportDefinition>> | null = null;
  let failed: string | null = null;
  try {
    definition = await fetchReportDefinition(session, reportId);
  } catch (error) {
    if (error instanceof InsightApiError && error.status === 401) redirect('/login?reason=expired');
    failed = error instanceof InsightApiError ? error.code : 'INTERNAL_ERROR';
  }

  return (
    <main>
      <PortalNav session={session} />
      <p><Link href="/reports">← Executive reports</Link></p>
      <h1>{definition?.title ?? reportId}</h1>
      <p className="notice">
        Report generation reads the tested aggregate API only. Unavailable sections stay explicit;
        no export or approval action is available in this prototype.
      </p>
      {failed ? <ErrorState code={failed} /> : definition ? (
        <ReportGenerator definition={definition} />
      ) : null}
    </main>
  );
}
