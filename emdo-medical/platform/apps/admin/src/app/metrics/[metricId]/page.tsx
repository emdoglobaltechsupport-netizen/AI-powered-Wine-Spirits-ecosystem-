import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { INSIGHT_MIN_GROUP_SIZE, INSIGHT_METRIC_IDS } from '@emdo/shared';
import { ErrorState } from '../../../components/error-state';
import { EvidenceBadge } from '../../../components/evidence';
import { MetricCard } from '../../../components/metric-card';
import { PortalNav } from '../../../components/portal-nav';
import { fetchMetricValues, InsightApiError } from '../../../lib/api';
import { readPortalSession } from '../../../lib/server-session';

export const dynamic = 'force-dynamic';

export default async function MetricDetailPage({
  params,
}: {
  params: Promise<{ metricId: string }>;
}) {
  const { metricId } = await params;
  if (!INSIGHT_METRIC_IDS.includes(metricId as (typeof INSIGHT_METRIC_IDS)[number])) notFound();

  const session = await readPortalSession();
  if (!session) redirect('/login?reason=expired');

  let values: Awaited<ReturnType<typeof fetchMetricValues>> = [];
  let failed: string | null = null;
  try {
    values = await fetchMetricValues(session, metricId);
  } catch (error) {
    if (error instanceof InsightApiError && error.status === 401) redirect('/login?reason=expired');
    failed = error instanceof InsightApiError ? error.code : 'INTERNAL_ERROR';
  }

  const first = values[0];
  return (
    <main>
      <PortalNav session={session} />
      <p><Link href="/metrics">← Metric catalogue</Link></p>
      <h1>{first?.name ?? metricId}</h1>
      <p className="notice">
        De-identified aggregates only. Cells below {INSIGHT_MIN_GROUP_SIZE} are withheld; no row
        identifiers, prompts, record content or decrypted values are rendered.
      </p>
      {failed ? <ErrorState code={failed} /> : (
        <>
          {first && (
            <p className="metric-card__meta">
              {first.metricId} · v{first.metricVersion} · source: {first.sourceStatus} ·{' '}
              <EvidenceBadge status={first.evidenceStatus} />
            </p>
          )}
          <div className="metric-grid">
            {values.map((value, index) => (
              <MetricCard
                key={`${value.metricId}-${value.countryCode}-${value.generatedAt}-${index}`}
                metric={value}
              />
            ))}
          </div>
        </>
      )}
    </main>
  );
}
