#!/usr/bin/env node
/**
 * Validate the machine-readable market forecast register.
 *
 * This is a governance guard, not a source of market data: it ensures every
 * documented figure carries a class, candidate sources, a confidence level and
 * an honest evidence status before it can be used in built artifacts.
 */
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FILE = join(ROOT, 'config', 'market-forecasts.json');

const REQUIRED_FIELDS = [
  'id', 'metric', 'value', 'unit', 'horizon', 'sourceClass', 'sources',
  'sourceStatus', 'confidence', 'evidenceRef', 'owner', 'refreshCadence', 'notes',
];

const ALLOWED_SOURCE_STATUS = new Set(['uncited', 'internal estimate', 'target', 'sourced', 'verified']);

const EXPECTED = new Map([
  ['market-global-alcohol-size', '~$1.8T'],
  ['market-ecommerce-penetration', '6-7%'],
  ['market-fine-wine-aum', '~$15B'],
  ['financial-2027', '2M / $120M / $18M'],
  ['financial-2028', '8M / $520M / $72M'],
  ['financial-2029', '20M / $1.2B / $180M'],
  ['financial-2031', '50M / $5.0B / $750M'],
  ['financial-2034', '100M / $15B / $2.5B'],
  ['scale-users', '100M'],
  ['scale-skus', '10M+'],
  ['scale-countries', '200+'],
  ['scale-orders-per-day', '1.2M'],
  ['scale-api-p95', '<200'],
  ['scale-availability', '99.99'],
  ['spend-advertising-cap', '8'],
  ['africa-expansion', '14'],
]);

let doc;
try {
  doc = JSON.parse(readFileSync(FILE, 'utf8'));
} catch (error) {
  console.error(`Cannot read ${FILE}: ${error.message}`);
  process.exit(1);
}

const errors = [];
const notes = [];
const seen = new Set();

if (!doc || typeof doc !== 'object') {
  errors.push('root must be an object');
} else {
  if (!doc.notice || !/management estimate|projection|design target/i.test(doc.notice)) {
    errors.push('notice must state that figures are estimates/projections/targets');
  }
  if (!doc.confidenceScale || !['Low', 'Medium', 'High'].every((level) => typeof doc.confidenceScale[level] === 'string' && doc.confidenceScale[level])) {
    errors.push('confidenceScale must define Low, Medium and High');
  }
  if (!Array.isArray(doc.forecasts) || doc.forecasts.length === 0) {
    errors.push('forecasts must be a non-empty array');
  } else {
    for (const [index, record] of doc.forecasts.entries()) {
      const label = typeof record?.id === 'string' ? record.id : `forecast[${index}]`;
      if (!record || typeof record !== 'object' || Array.isArray(record)) {
        errors.push(`${label}: record must be an object`);
        continue;
      }

      for (const field of REQUIRED_FIELDS) {
        if (!(field in record)) errors.push(`${label}: missing field ${field}`);
      }
      if (typeof record.id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(record.id)) {
        errors.push(`${label}: id must be a stable lowercase slug`);
      }
      if (seen.has(record.id)) errors.push(`${label}: duplicate id`);
      seen.add(record.id);

      for (const field of ['metric', 'value', 'unit', 'horizon', 'sourceClass', 'sourceStatus', 'confidence', 'owner', 'refreshCadence', 'notes']) {
        if (typeof record[field] !== 'string' || !record[field].trim()) {
          errors.push(`${label}: ${field} must be a non-empty string`);
        }
      }
      if (!Array.isArray(record.sources) || record.sources.length === 0 || !record.sources.every((s) => typeof s === 'string' && s.trim())) {
        errors.push(`${label}: sources must be a non-empty array of strings`);
      }

      if (!ALLOWED_SOURCE_STATUS.has(record.sourceStatus)) {
        errors.push(`${label}: unsupported sourceStatus "${record.sourceStatus}"`);
      }
      if (!doc.confidenceScale || !(record.confidence in doc.confidenceScale)) {
        errors.push(`${label}: confidence "${record.confidence}" is not in confidenceScale`);
      }

      const hasEvidence = typeof record.evidenceRef === 'string' && record.evidenceRef.trim().length > 0;
      if (record.evidenceRef !== null && typeof record.evidenceRef !== 'string') {
        errors.push(`${label}: evidenceRef must be null or a string`);
      }
      if (record.sourceStatus === 'sourced' || record.sourceStatus === 'verified') {
        if (!hasEvidence) errors.push(`${label}: ${record.sourceStatus} requires a real evidenceRef`);
      }
      if (record.confidence === 'Low' && hasEvidence) {
        errors.push(`${label}: Low confidence must not claim an attached evidenceRef`);
      }
      if (record.confidence === 'High' && !hasEvidence) {
        errors.push(`${label}: High confidence requires an evidenceRef`);
      }
      if (!hasEvidence && record.sources.some((s) => /^https?:\/\//i.test(s))) {
        errors.push(`${label}: uncited records must not contain URLs in sources[]`);
      }

      if (EXPECTED.has(record.id) && record.value !== EXPECTED.get(record.id)) {
        errors.push(`${label}: canonical value drifted (expected "${EXPECTED.get(record.id)}", got "${record.value}")`);
      }
    }

    for (const [id] of EXPECTED) {
      if (!seen.has(id)) errors.push(`missing canonical forecast record: ${id}`);
    }
  }

  const low = doc.forecasts.filter((r) => r.confidence === 'Low').length;
  notes.push(`${doc.forecasts.length} forecast records; ${low} Low confidence; ${doc.forecasts.length - low} raised confidence`);
}

if (errors.length) {
  for (const error of errors) console.error(`BLOCKER: ${error}`);
  process.exit(1);
}
for (const note of notes) console.log(note);
console.log('Forecast provenance metadata check passed: all figures are labelled with sources, confidence and evidence status; no forecast is factually validated.');
