import type { SafeInsightReport } from '../lib/contracts';
import { EvidenceBadge } from './evidence';
import { MetricCard } from './metric-card';

export function ReportView({ report }: { report: SafeInsightReport }) {
  return (
    <section className="report-view" aria-label="Generated report">
      <header className="report-view__header">
        <h2>{report.title}</h2>
        <p>
          {report.cadence} · {report.period} · {report.countryCode} · generated{' '}
          <time dateTime={report.generatedAt}>{report.generatedAt}</time>
        </p>
      </header>
      <p className="notice notice--decision">
        Final decision authority: {report.finalDecisionAuthority}. This report is decision support
        only and does not approve, sign or execute any action.
      </p>
      <ol className="report-sections">
        {report.sections.map((section) => (
          <li key={section.metricId}>
            <div className="report-section__title">
              <h3>{section.name}</h3>
              <EvidenceBadge status={section.evidenceStatus} />
            </div>
            <p className="report-section__id">
              {section.metricId} · v{section.metricVersion} · source: {section.sourceStatus}
            </p>
            <div className="metric-grid">
              {section.values.map((value, index) => (
                <MetricCard
                  key={`${section.metricId}-${value.countryCode}-${value.generatedAt}-${index}`}
                  metric={value}
                />
              ))}
            </div>
          </li>
        ))}
      </ol>
      <p className="notice">{report.note}</p>
    </section>
  );
}
