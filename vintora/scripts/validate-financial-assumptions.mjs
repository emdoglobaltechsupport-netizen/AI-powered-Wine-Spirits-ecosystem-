#!/usr/bin/env node
/**
 * Financial-assumption register validator and documentation generator.
 *
 * This is a governance guard, not financial validation: it proves that every
 * modelled figure has a definition, scenario range, source class, freshness
 * stamp and explicit non-performance qualifier. It does not validate the
 * forecast empirically.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => readFileSync(join(ROOT, relativePath), 'utf8');
const CONFIG_PATH = 'config/financial-assumptions.json';
const DOC_PATH = 'FINANCIAL_ASSUMPTIONS.md';
const START = '<!-- financial-assumptions:start -->';
const END = '<!-- financial-assumptions:end -->';
const args = new Set(process.argv.slice(2));
const checkOnly = args.has('--check');
const writeDocs = args.has('--write-docs');

const doc = JSON.parse(read(CONFIG_PATH));
const forecasts = JSON.parse(read('config/market-forecasts.json'));
const errors = [];
const requireText = (value, label) => {
  if (typeof value !== 'string' || !value.trim()) errors.push(`${label} must be a non-empty string`);
};

const REQUIRED_FIELDS = [
  'id', 'metric', 'claimLabel', 'definitionRef', 'value', 'unit', 'horizon',
  'method', 'formula', 'scenario', 'sources', 'sourceStatus', 'confidence',
  'evidenceRef', 'owner', 'asOf', 'freshnessMaxDays', 'refreshCadence',
  'qualifier', 'notes',
];
const ALLOWED_STATUS = new Set(doc.allowedSourceStatus ?? []);
const EXPECTED_BASE = new Map(
  forecasts.forecasts.filter((record) => record.id.startsWith('financial-')).map((record) => [record.id, record.value]),
);
const IDS = new Set();
const LOWER_IS_BETTER = new Set(['unit-economics-cac']);

function parseMagnitude(value) {
  const match = String(value).replace(/,/g, '').match(/(\d+(?:\.\d+)?)\s*([MBK%]?)/i);
  if (!match) return null;
  const scale = { K: 1e3, M: 1e6, B: 1e9, '%': 1 }[match[2].toUpperCase()] ?? 1;
  return Number(match[1]) * scale;
}

if (!/^\d+\.\d+\.\d+$/.test(doc.version ?? '')) errors.push('version must be semantic versioning');
requireText(doc.notice, 'notice');
if (!/unverified|not reported|no figure/i.test(doc.notice ?? '')) errors.push('notice must state that figures are unverified and not reported results');
if (!doc.asOf || Number.isNaN(Date.parse(doc.asOf))) errors.push('asOf must be an ISO date');
if (!doc.effectiveFrom || Number.isNaN(Date.parse(doc.effectiveFrom))) errors.push('effectiveFrom must be an ISO date');
for (const level of ['Low', 'Medium', 'High']) requireText(doc.confidenceScale?.[level], `confidenceScale.${level}`);
if (!ALLOWED_STATUS.size) errors.push('allowedSourceStatus must be a non-empty array');
for (const [key, value] of Object.entries(doc.methodology ?? {})) {
  requireText(value?.definition, `methodology.${key}.definition`);
  requireText(value?.definitionRef, `methodology.${key}.definitionRef`);
}

if (!Array.isArray(doc.assumptions) || doc.assumptions.length === 0) {
  errors.push('assumptions must be a non-empty array');
} else {
  for (const [index, record] of doc.assumptions.entries()) {
    const label = typeof record?.id === 'string' ? record.id : `assumption[${index}]`;
    if (!record || typeof record !== 'object' || Array.isArray(record)) {
      errors.push(`${label}: record must be an object`);
      continue;
    }
    for (const field of REQUIRED_FIELDS) {
      if (!(field in record)) errors.push(`${label}: missing field ${field}`);
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(record.id ?? '')) errors.push(`${label}: id must be a stable lowercase slug`);
    if (IDS.has(record.id)) errors.push(`${label}: duplicate id`);
    IDS.add(record.id);
    for (const field of ['metric', 'claimLabel', 'value', 'unit', 'horizon', 'method', 'formula', 'sourceStatus', 'confidence', 'owner', 'asOf', 'refreshCadence', 'qualifier', 'notes']) {
      requireText(record[field], `${label}.${field}`);
    }
    if (!Array.isArray(record.sources) || !record.sources.length || !record.sources.every((source) => typeof source === 'string' && source.trim())) {
      errors.push(`${label}: sources must be a non-empty string array`);
    }
    if (!ALLOWED_STATUS.has(record.sourceStatus)) errors.push(`${label}: unsupported sourceStatus ${record.sourceStatus}`);
    if (!(record.confidence in (doc.confidenceScale ?? {}))) errors.push(`${label}: unknown confidence ${record.confidence}`);
    if (record.confidence === 'Low' && record.evidenceRef !== null) errors.push(`${label}: Low confidence must not attach evidenceRef`);
    if (record.confidence === 'High' && !record.evidenceRef) errors.push(`${label}: High confidence requires evidenceRef`);
    if (!record.sources.every((source) => !/^https?:\/\//i.test(source))) errors.push(`${label}: uncited sources must not contain URLs`);

    const definitionKeys = String(record.definitionRef ?? '').split(',');
    if (!definitionKeys.length || definitionKeys.some((key) => !doc.methodology?.[key])) {
      errors.push(`${label}: definitionRef must reference methodology keys`);
    }
    for (const field of ['downside', 'base', 'upside']) requireText(record.scenario?.[field], `${label}.scenario.${field}`);
    if (record.scenario?.base !== record.value) errors.push(`${label}: scenario.base must equal value`);
    if (record.scenario?.downside === record.value || record.scenario?.upside === record.value) {
      errors.push(`${label}: downside/upside must differ from the base value`);
    }
    const down = parseMagnitude(record.scenario?.downside);
    const base = parseMagnitude(record.scenario?.base);
    const up = parseMagnitude(record.scenario?.upside);
    if ([down, base, up].some((value) => value === null)) {
      errors.push(`${label}: scenario values must include a parseable magnitude`);
    } else {
      const ordered = LOWER_IS_BETTER.has(record.id) ? down > base && base > up : down < base && base < up;
      if (!ordered) errors.push(`${label}: scenario ranges must be ordered downside/base/upside`);
    }
    if (!Number.isInteger(record.freshnessMaxDays) || record.freshnessMaxDays < 1) errors.push(`${label}: freshnessMaxDays must be a positive integer`);
    const ageDays = (Date.now() - Date.parse(record.asOf)) / 86_400_000;
    if (!Number.isNaN(ageDays) && ageDays > record.freshnessMaxDays) errors.push(`${label}: asOf is older than freshnessMaxDays`);
    if (!/not reported|planning|target|illustrative|unverified/i.test(record.qualifier ?? '')) {
      errors.push(`${label}: qualifier must state non-performance status`);
    }
    if (EXPECTED_BASE.has(record.id) && record.value !== EXPECTED_BASE.get(record.id)) {
      errors.push(`${label}: base value drifted from config/market-forecasts.json (${EXPECTED_BASE.get(record.id)})`);
    }
    if ((record.id.includes('valuation') || record.sourceStatus === 'illustrative target') && !/illustrative|not a fact|not an? (?:offer|promise)/i.test(record.qualifier ?? '')) {
      errors.push(`${label}: valuation estimates require an explicit illustrative/not-an-offer qualifier`);
    }
  }
  for (const [id] of EXPECTED_BASE) {
    if (!IDS.has(id)) errors.push(`missing financial assumption record: ${id}`);
  }
}

function renderDoc() {
  const rows = doc.assumptions.map((record) => `| \`${record.id}\` | ${record.metric} | ${record.claimLabel} | ${record.scenario.downside} | **${record.value}** | ${record.scenario.upside} | ${record.asOf} | Low / uncited |`).join('\n');
  return [
    START,
    '# Financial Assumptions — Generated Register Summary',
    '',
    `Generated by \`scripts/validate-financial-assumptions.mjs\` from [\`config/financial-assumptions.json\`](./config/financial-assumptions.json). Version **${doc.version}**, effective **${doc.effectiveFrom}**, as of **${doc.asOf}**. Do not edit this block by hand.`,
    '',
    doc.notice,
    '',
    '## Method definitions',
    '',
    ...Object.entries(doc.methodology).map(([key, value]) => `- **${key}** — ${value.definition} Definition authority: \`${value.definitionRef}\`.`),
    '',
    '## Assumptions and scenarios',
    '',
    '| ID | Metric | Claim label | Downside | Base | Upside | As of | Evidence |',
    '|---|---|---|---|---|---|---|---|',
    rows,
    '',
    'Downside/base/upside are planning scenarios, not statistical confidence intervals or validated market estimates. Every record is uncited Low confidence. Valuation figures are illustrative and are not offers, promises, IRR or MOIC claims.',
    '',
    `Refresh via \`npm run financial:docs\`; CI runs \`npm run financial:check\`.`,
    END,
  ].join('\n');
}

if (errors.length) {
  console.error(`Financial assumption check failed: ${errors.length} finding(s).`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

const generated = renderDoc();
if (checkOnly) {
  let existing = '';
  try { existing = read(DOC_PATH); } catch { /* generated doc missing */ }
  if (!existing.includes(START) || !existing.includes(END) || existing !== [existing.slice(0, existing.indexOf(START)), generated, existing.slice(existing.indexOf(END) + END.length)].join('')) {
    console.error('STALE FINANCIAL_ASSUMPTIONS.md; run npm run financial:docs');
    process.exit(1);
  }
} else {
  const existing = (() => { try { return read(DOC_PATH); } catch { return `${START}\n${END}\n`; } })();
  const before = existing.slice(0, existing.indexOf(START));
  const after = existing.slice(existing.indexOf(END) + END.length);
  writeFileSync(join(ROOT, DOC_PATH), `${before}${generated}${after}`);
  console.log(`Wrote ${DOC_PATH} from ${doc.assumptions.length} registered assumptions.`);
}

console.log(`Financial assumption check passed: ${doc.assumptions.length} dated assumptions, ${Object.keys(doc.methodology).length} method definitions, upside/base/downside ranges, no attached evidence, no reported performance.`);
