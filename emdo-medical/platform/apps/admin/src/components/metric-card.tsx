import type { SafeInsightMetricValue } from '../lib/contracts';
import { displayValue, EvidenceBadge, isUnavailable } from './evidence';

export function MetricCard({ metric }: { metric: SafeInsightMetricValue }) {
  const unavailable = isUnavailable(metric.evidenceStatus) || metric.suppressed;
  const dimensions = metric.dimensions ? Object.entries(metric.dimensions) : [];

  return (
    <article className={`metric-card${unavailable ? ' metric-card--unavailable' : ''}`}>
      <header className="metric-card__header">
        <h3>{metric.name}</h3>
        <EvidenceBadge status={metric.evidenceStatus} />
      </header>
      <p className="metric-card__value" data-testid={`value-${metric.metricId}`}>
        {displayValue(metric.evidenceStatus, metric.suppressed, metric.value)}
      </p>
      {unavailable && metric.missingSource && (
        <p className="metric-card__reason">Missing source: {metric.missingSource}</p>
      )}
      {metric.caveat && <p className="metric-card__reason">{metric.caveat}</p>}
      {dimensions.length > 0 && (
        <dl className="metric-card__dimensions">
          {dimensions.map(([key, value]) => (
            <div key={key}>
              <dt>{key}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      )}
      <footer className="metric-card__meta">
        <span>{metric.metricId}</span>
        <span>v{metric.metricVersion}</span>
        <span>{metric.countryCode}</span>
        <time dateTime={metric.generatedAt}>{metric.generatedAt}</time>
      </footer>
    </article>
  );
}
