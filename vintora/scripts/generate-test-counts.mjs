#!/usr/bin/env node
/**
 * Generate the Phase 1 test-count register, browser manifest and documentation
 * blocks. Counts are derived from the test sources, never maintained by hand.
 *
 * Usage:
 *   npm run test-counts:generate  # write config/test-counts.json + browser manifest
 *   npm run test-counts:docs      # also refresh generated README/BUILDING/etc blocks
 *   npm run test-counts:check     # fail if any generated artefact is stale
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => readFileSync(join(ROOT, relativePath), 'utf8');
const write = (relativePath, content) => writeFileSync(join(ROOT, relativePath), content, 'utf8');
const args = new Set(process.argv.slice(2));
const checkOnly = args.has('--check');
const writeDocs = args.has('--write-docs');

const SOURCES = {
  browser: 'apps/prototype/selftest.js',
  catalogue: 'packages/db/scripts/catalogue-selftest.mjs',
  accessories: 'packages/db/scripts/wine-accessories-selftest.mjs',
  africa: 'packages/db/scripts/africa-marketplace-selftest.mjs',
};

const DOC_FILES = ['README.md', 'BUILDING.md', 'VALIDATION_STATUS.md', 'ROADMAP.md'];
const START = '<!-- test-counts:start -->';
const END = '<!-- test-counts:end -->';

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseBrowser(source) {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const sections = [];
  let currentSection = null;
  let repeat = null;
  let checkSites = 0;
  let total = 0;

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    const sectionMatch = trimmed.match(/^\/\/\s*@selftest-section:\s*(.+?)\s*$/);
    if (sectionMatch) {
      currentSection = sectionMatch[1];
      if (!sections.some((section) => section.name === currentSection)) {
        sections.push({ name: currentSection, count: 0 });
      }
      return;
    }

    const repeatStart = trimmed.match(/^\/\/\s*@selftest-repeat-start:\s*(\w+)\s*$/);
    if (repeatStart) {
      if (repeat) throw new Error(`Nested repeat annotation at selftest.js:${index + 1}`);
      repeat = { variable: repeatStart[1], count: null, callSites: 0 };
      return;
    }

    const repeatEnd = trimmed.match(/^\/\/\s*@selftest-repeat-end:\s*(\w+)\s*$/);
    if (repeatEnd) {
      if (!repeat || repeat.variable !== repeatEnd[1]) {
        throw new Error(`Unbalanced repeat annotation at selftest.js:${index + 1}`);
      }
      if (!repeat.count || !repeat.callSites) {
        throw new Error(`Repeat ${repeat.variable} did not resolve to a count and a check at selftest.js:${index + 1}`);
      }
      repeat = null;
      return;
    }

    if (repeat && repeat.count === null) {
      const arrayMatch = trimmed.match(new RegExp(`^var\\s+${escapeRegExp(repeat.variable)}\\s*=\\s*\\[(.*)\\]\\s*;\\s*$`));
      if (arrayMatch) {
        repeat.count = (arrayMatch[1].match(/'[^']*'/g) ?? []).length;
      }
    }

    if (/^\s*check\s*\(/.test(line)) {
      if (!currentSection) throw new Error(`Browser check without @selftest-section at selftest.js:${index + 1}`);
      const multiplier = repeat ? repeat.count : 1;
      if (!multiplier) throw new Error(`Unresolved repeat count at selftest.js:${index + 1}`);
      if (repeat) repeat.callSites += 1;
      checkSites += 1;
      total += multiplier;
      sections.find((section) => section.name === currentSection).count += multiplier;
    }
  });

  if (repeat) throw new Error(`Unclosed repeat annotation for ${repeat.variable}`);
  const uncategorised = sections.find((section) => section.count === 0);
  if (uncategorised) throw new Error(`Browser section ${uncategorised.name} has no checks`);
  return { count: total, checkSites, sections };
}

function countAssertCalls(source) {
  const pattern = /\bassert\.(?:equal|ok|match|deepEqual|strictEqual|notEqual|throws|rejects|fail)\s*\(/g;
  return (source.match(pattern) ?? []).length;
}

function countWrapperCalls(source) {
  return (source.match(/^\s*(?:check|equal)\s*\(/gm) ?? []).length;
}

const browser = parseBrowser(read(SOURCES.browser));
const catalogue = countAssertCalls(read(SOURCES.catalogue));
const accessories = countWrapperCalls(read(SOURCES.accessories));
const africa = countWrapperCalls(read(SOURCES.africa));
const offlineTotal = catalogue + accessories + africa;

const register = {
  schemaVersion: 1,
  generatedBy: 'scripts/generate-test-counts.mjs',
  sources: SOURCES,
  suites: {
    browser: {
      label: 'Browser self-test',
      runtime: 'Browser DOM (?selftest=1)',
      source: SOURCES.browser,
      countKind: 'checks',
      count: browser.count,
      staticCheckSites: browser.checkSites,
      sections: browser.sections,
      scope: 'Rendered age gate, catalogue, product, cart, checkout, ten market modules and the 19-workspace Admin/TechOps simulation.',
    },
    catalogue: {
      label: 'Verified catalogue pipeline',
      runtime: 'Node offline',
      source: SOURCES.catalogue,
      countKind: 'assertions',
      count: catalogue,
      scope: 'Fixture ingestion, normalisation, coverage, validation and licensed-feed example handling.',
    },
    accessories: {
      label: 'Wine Accessories pipeline',
      runtime: 'Node offline',
      source: SOURCES.accessories,
      countKind: 'assertions',
      count: accessories,
      scope: 'Accessory taxonomy, normalisation, validation rules, schema and append-only DDL contract.',
    },
    africa: {
      label: 'Africa Marketplace registry',
      runtime: 'Node offline',
      source: SOURCES.africa,
      countKind: 'assertions',
      count: africa,
      scope: 'Market registry, candidate brands, draft templates, workflows, schema, DDL and storefront snapshot source.',
    },
  },
  totals: {
    browserChecks: browser.count,
    offlineAssertions: offlineTotal,
    independentPhase1Checks: browser.count + offlineTotal,
    suites: Object.keys(SOURCES).length,
  },
  overlap: {
    invokesAnotherSuite: false,
    duplicateAssertions: 0,
    explanation: 'The browser suite asserts rendered DOM behaviour; the three offline suites run in Node against ingestion/registry artefacts. No suite invokes another and no assertion is counted in two suites. Shared product and Admin facts are separate checks at different layers, not combined totals.',
  },
};

const manifest = `/* Generated by scripts/generate-test-counts.mjs; do not edit. */\nwindow.VINTORA_SELFTEST_MANIFEST = ${JSON.stringify({
  schemaVersion: register.schemaVersion,
  generatedBy: register.generatedBy,
  expectedCount: browser.count,
  sections: browser.sections,
  source: SOURCES.browser,
}, null, 2)};\n`;

function generatedDocsBlock() {
  const sectionSummary = browser.sections.map((section) => `${section.name} ${section.count}`).join(' · ');
  return [
    START,
    '**Generated test counts** — source of truth: [`config/test-counts.json`](./config/test-counts.json). Refresh with `npm run test-counts:generate` / `npm run test-counts:docs`; CI runs `npm run test-counts:check`.',
    '',
    '| Suite | Runtime | Generated total | Scope |',
    '|---|---|---:|---|',
    `| Browser self-test | Browser DOM (\`?selftest=1\`) | ${browser.count} checks | Rendered flows, ten modules and Admin/TechOps simulation |`,
    `| Verified catalogue pipeline | Node offline | ${catalogue} assertions | Fixture provenance, normalisation and coverage |`,
    `| Wine Accessories pipeline | Node offline | ${accessories} assertions | Accessory taxonomy, validation and DDL contract |`,
    `| Africa Marketplace registry | Node offline | ${africa} assertions | Market registry, draft templates and storefront snapshot |`,
    '',
    `Browser section breakdown: ${sectionSummary}.`,
    '',
    `Offline pipelines: ${catalogue} + ${accessories} + ${africa} = ${offlineTotal} assertions.`,
    '',
    `Independent Phase 1 checks: ${browser.count + offlineTotal} across ${register.totals.suites} suites. The browser suite does not call the offline suites, and no assertion is counted twice; see \`config/test-counts.json\` for the overlap record.`,
    END,
  ].join('\n');
}

const registerText = `${JSON.stringify(register, null, 2)}\n`;
const docsText = generatedDocsBlock();

function compare(relativePath, expected) {
  const actual = read(relativePath);
  if (actual !== expected) {
    console.error(`STALE ${relativePath}; run npm run test-counts:generate and npm run test-counts:docs`);
    process.exitCode = 1;
  }
}

function upsertDocsBlock(content) {
  if (!content.includes(START) || !content.includes(END)) {
    throw new Error('Documentation is missing test-count markers');
  }
  const before = content.slice(0, content.indexOf(START));
  const after = content.slice(content.indexOf(END) + END.length);
  return `${before}${docsText}${after}`;
}

if (checkOnly) {
  compare('config/test-counts.json', registerText);
  compare('apps/prototype/selftest-manifest.js', manifest);
  for (const file of DOC_FILES) compare(file, upsertDocsBlock(read(file)));
  if (!process.exitCode) console.log(`Test-count check passed: ${browser.count} browser checks, ${offlineTotal} offline assertions, ${register.totals.independentPhase1Checks} independent Phase 1 checks.`);
} else {
  write('config/test-counts.json', registerText);
  write('apps/prototype/selftest-manifest.js', manifest);
  if (writeDocs) {
    for (const file of DOC_FILES) write(file, upsertDocsBlock(read(file)));
  }
  console.log(`Generated test counts: ${browser.count} browser checks (${browser.checkSites} static sites), ${catalogue}/${accessories}/${africa} offline assertions (${offlineTotal} total).`);
  if (!writeDocs) console.log('Documentation blocks not rewritten; pass --write-docs via npm run test-counts:docs.');
}
