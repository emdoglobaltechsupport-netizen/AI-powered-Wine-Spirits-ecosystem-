import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ErrorState } from '../../components/error-state';
import { EvidenceBadge } from '../../components/evidence';
import { PortalNav } from '../../components/portal-nav';
import { fetchMetricDefinitions, InsightApiError } from '../../lib/api';
import { readPortalSession } from '../../lib/server-session';

export const dynamic = 'force-dynamic';

export default async function MetricsPage() {
  const session = await readPortalSession();
  if (!session) redirect('/login?reason=expired');

  let metrics: Awaited<ReturnType<typeof fetchMetricDefinitions>> = [];
  let failed: string | null = null;
  try {
    metrics = await fetchMetricDefinitions(session);
  } catch (error) {
    if (error instanceof InsightApiError && error.status === 401) redirect('/login?reason=expired');
    failed = error instanceof InsightApiError ? error.code : 'INTERNAL_ERROR';
  }

  return (
    <main>
      <PortalNav session={session} />
      <h1>Metric catalogue</h1>
      <p className="notice">
        Definitions are versioned and role-filtered by the API. Evidence status travels with every
        value; no definition here authorises a live business claim.
      </p>
      {failed ? <ErrorState code={failed} /> : (
        <div className="card-grid">
          {metrics.map((metric) => (
            <article className="panel" key={metric.id}>
              <header className="metric-card__header">
                <h2>{metric.name}</h2>
                <EvidenceBadge status={metric.evidenceStatus} />
              </header>
              <p>{metric.formula}</p>
              <p className="metric-card__reason">
                {metric.missingSource ?? metric.caveat ?? 'Source status: ' + metric.sourceStatus}
              </p>
              <p className="metric-card__meta">
                {metric.id} · v{metric.version} · owner: {metric.ownerRole}
              </p>
              <Link href={`/metrics/${metric.id}`}>View aggregate</Link>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
