/* =========================================================
   Vintora catalogue ingestion — coverage and validation reports.

   Reports describe what verified sources actually supplied. They
   never create records or inflate counts to meet targets.
   ========================================================= */

import { CANONICAL_FIELDS } from './catalogue-normalize.mjs';

function populated(value) {
  return value !== null && value !== undefined && value !== '' &&
    !(Array.isArray(value) && value.length === 0);
}

export function buildCoverage(records, taxonomy, generatedAt = new Date().toISOString()) {
  const targets = taxonomy.targets.map((target) => {
    const observed = records.filter((record) => {
      if (record.category !== target.category) return false;
      return !target.subcategory || record.subcategory === target.subcategory;
    }).length;
    return {
      category: target.category,
      subcategory: target.subcategory || null,
      target: target.target,
      observed,
      deficit: Math.max(0, target.target - observed),
      status: observed >= target.target ? 'met' : observed > 0 ? 'partial' : 'missing',
    };
  });

  const byCategory = {};
  for (const record of records) {
    byCategory[record.category] = (byCategory[record.category] || 0) + 1;
  }

  const bySource = {};
  for (const record of records) {
    const sources = record.provenance?.sources || [record.provenance?.source || 'unknown'];
    for (const source of sources) bySource[source] = (bySource[source] || 0) + 1;
  }

  const totalTarget = targets.reduce((sum, target) => sum + target.target, 0);
  const totalObservedAgainstTargets = targets.reduce((sum, target) => sum + target.observed, 0);

  return {
    generatedAt,
    notice: 'Targets are requested coverage goals. No records are generated to fill a deficit.',
    totals: {
      records: records.length,
      targetMinimum: totalTarget,
      observedAgainstTargets: totalObservedAgainstTargets,
      coveragePct: totalTarget ? Math.round((totalObservedAgainstTargets / totalTarget) * 1000) / 10 : 0,
    },
    byCategory,
    bySource,
    unclassified: records.filter((record) => record.subcategory === 'Unclassified').length,
    targets,
  };
}

export function buildValidation(records, generatedAt = new Date().toISOString()) {
  const fieldCoverage = {};
  for (const field of CANONICAL_FIELDS) {
    fieldCoverage[field] = records.filter((record) => populated(record[field])).length;
  }

  const required = ['category', 'subcategory', 'brand_name', 'product_name', 'country_of_origin', 'abv_pct', 'bottle_size', 'product_sku', 'provenance'];
  const invalid = [];
  for (const record of records) {
    const missing = required.filter((field) => {
      if (field === 'provenance') return !record.provenance?.source;
      return !populated(record[field]);
    });
    if (missing.length) {
      invalid.push({
        product_sku: record.product_sku || null,
        source: record.provenance?.source || null,
        missing,
      });
    }
  }

  const confidenceBuckets = { high: 0, medium: 0, low: 0 };
  for (const record of records) {
    const score = record.provenance?.overall_confidence ?? 0;
    if (score >= 0.75) confidenceBuckets.high++;
    else if (score >= 0.4) confidenceBuckets.medium++;
    else confidenceBuckets.low++;
  }

  return {
    generatedAt,
    records: records.length,
    validRecords: records.length - invalid.length,
    invalidRecords: invalid.length,
    unclassifiedRecords: records.filter((record) => record.subcategory === 'Unclassified').length,
    confidenceBuckets,
    fieldCoverage,
    fieldCoveragePct: Object.fromEntries(
      Object.entries(fieldCoverage).map(([field, count]) => [
        field,
        records.length ? Math.round((count / records.length) * 1000) / 10 : 0,
      ]),
    ),
    invalid: invalid.slice(0, 100),
    invalidTruncated: invalid.length > 100,
  };
}
