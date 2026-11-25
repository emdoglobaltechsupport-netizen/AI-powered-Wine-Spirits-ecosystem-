import {
  INSIGHT_METRIC_IDS,
  INSIGHT_REPORT_CADENCES,
  INSIGHT_REPORT_IDS,
} from '@emdo/shared';
import { INSIGHT_METRICS, INSIGHT_REPORTS } from './metric-registry';
import { INSIGHT_QUERY_SPECS } from './insight-queries';

describe('Insight metric and report catalogue', () => {
  it('defines every registered metric exactly once with stable version and evidence', () => {
    expect(INSIGHT_METRICS.map((metric) => metric.id).sort()).toEqual([...INSIGHT_METRIC_IDS].sort());
    for (const metric of INSIGHT_METRICS) {
      expect(metric.version).toBe('1.0.0');
      expect(metric.formula.length).toBeGreaterThan(10);
      expect(metric.ownerRole).toBeTruthy();
      expect(metric.evidenceStatus).toBeTruthy();
      expect(metric.sourceStatus).toBeTruthy();
      if (metric.evidenceStatus !== 'AVAILABLE_TESTED'
        && metric.evidenceStatus !== 'AVAILABLE_WITH_CAVEAT') {
        expect(metric.missingSource).toBeTruthy();
      }
    }
  });

  it('has no SQL source for an unavailable metric', () => {
    for (const metric of INSIGHT_METRICS) {
      const hasSource = Boolean(INSIGHT_QUERY_SPECS[metric.id]);
      const measured = metric.evidenceStatus === 'AVAILABLE_TESTED'
        || metric.evidenceStatus === 'AVAILABLE_WITH_CAVEAT';
      expect(hasSource).toBe(measured);
    }
  });

  it('references only registered metrics and supported cadences in reports', () => {
    expect(INSIGHT_REPORTS.map((report) => report.id).sort()).toEqual([...INSIGHT_REPORT_IDS].sort());
    for (const report of INSIGHT_REPORTS) {
      expect(report.metricIds.length).toBeGreaterThan(0);
      for (const metricId of report.metricIds) expect(INSIGHT_METRIC_IDS).toContain(metricId);
      expect(report.cadences).toEqual(INSIGHT_REPORT_CADENCES);
      expect(report.title.toLowerCase()).not.toContain('clinical outcome');
      expect(report.title.toLowerCase()).not.toContain('quality ranking');
    }
  });
});
