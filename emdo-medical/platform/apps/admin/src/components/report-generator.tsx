'use client';

import { useState, type FormEvent } from 'react';
import type { InsightReportCadence } from '@emdo/shared';
import type { SafeInsightReport, SafeInsightReportDefinition } from '../lib/contracts';
import { sanitizeReport } from '../lib/sanitize';
import { ErrorState } from './error-state';
import { ReportView } from './report-view';

function currentPeriod(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function ReportGenerator({ definition }: { definition: SafeInsightReportDefinition }) {
  const [cadence, setCadence] = useState(definition.cadences[0] ?? 'daily');
  const [period, setPeriod] = useState('');
  const [report, setReport] = useState<SafeInsightReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setReport(null);
    try {
      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ reportId: definition.id, cadence, period: period || currentPeriod() }),
      });
      const payload = await response.json() as {
        report?: unknown;
        error?: { code?: unknown };
      };
      if (!response.ok) {
        setError(typeof payload.error?.code === 'string' ? payload.error.code : 'INTERNAL_ERROR');
        return;
      }
      setReport(sanitizeReport(payload.report));
    } catch {
      setError('API_UNAVAILABLE');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <form className="report-form" onSubmit={onSubmit}>
        <label>
          Cadence
          <select value={cadence} onChange={(event) => setCadence(event.target.value as InsightReportCadence)}>
            {definition.cadences.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label>
          Period (UTC month)
          <input
            type="month"
            required
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
          />
        </label>
        <button type="submit" disabled={busy}>
          {busy ? 'Generating…' : 'Generate decision-support report'}
        </button>
      </form>
      {error && <ErrorState code={error} />}
      {report && <ReportView report={report} />}
    </section>
  );
}
