#!/usr/bin/env node
/**
 * Repository secret scanner (no external service, no network, no credentials).
 *
 * Complements gitleaks in CI with deterministic checks that work on Windows,
 * macOS and Linux. `.env` is intentionally excluded: generated local secrets
 * belong there and are gitignored. `.env.example` is checked separately and
 * must contain empty placeholders only.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SCAN_EXTENSIONS = new Set(['.js', '.mjs', '.cjs', '.ts', '.tsx', '.json', '.yml', '.yaml', '.md', '.ps1', '.sh', '.example']);
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', '.next', 'out', 'coverage', '.turbo', 'sbom']);
const SKIP_FILES = new Set(['package-lock.json', 'vintora.cdx.json']);
const DEMO_PASSWORD_GENERATORS = new Set([
  'scripts/lib/local-env.mjs',
  '.github/workflows/ci-migrations.yml',
]);

const SENSITIVE_KEY = /(?:KEY|SECRET|PASSWORD|TOKEN|CREDENTIAL)/i;
const GENERIC_ASSIGNMENT = /\b([A-Z0-9_]*(?:SECRET|PASSWORD|TOKEN|API_KEY|ACCESS_KEY)[A-Z0-9_]*)\b\s*[:=]\s*['"]([^'"\n]{16,})['"]/g;

const RULES = [
  { id: 'aws-access-key-id', regex: /\bAKIA[0-9A-Z]{16}\b/g },
  { id: 'github-token', regex: /\bgh[pousr]_[A-Za-z0-9_]{36,}\b/g },
  { id: 'openai-key', regex: /\bsk-[A-Za-z0-9_-]{20,}\b/g },
  { id: 'slack-token', regex: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g },
  { id: 'google-api-key', regex: /\bAIza[0-9A-Za-z_-]{35}\b/g },
  { id: 'private-key', regex: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g },
  { id: 'known-demo-password', regex: /Vintora(?:Admin|Demo)![A-Za-z0-9]{4,}/g },
  {
    id: 'generated-demo-password-literal',
    regex: /LocalDev-[A-Za-z0-9_-]{8,}/g,
    allowFile: (file) => DEMO_PASSWORD_GENERATORS.has(file),
  },
  {
    id: 'database-password-literal',
    regex: /postgres(?:ql)?:\/\/[^:\/@\s]+:([^@\/\s]+)@/g,
    allow: (match) => match[1].startsWith('${') || match[1] === 'ci-only-local-db',
  },
  {
    id: 'fixed-local-database-password',
    regex: new RegExp('postgres(?:ql)?://[^:/@\\s]+:' + 'vintora@', 'g'),
  },
  { id: 'fixed-session-secret-placeholder', regex: /local-dev-session-secret-[A-Za-z0-9-]{8,}/g },
];

const findings = [];
let filesScanned = 0;

function walk(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      walk(path);
      continue;
    }
    if (!entry.isFile()) continue;
    if (SKIP_FILES.has(entry.name)) continue;
    if (entry.name === '.env' || entry.name.startsWith('.env.') && entry.name !== '.env.example') continue;
    if (!SCAN_EXTENSIONS.has(extname(entry.name))) continue;
    if (statSync(path).size > 1_000_000) continue;
    scanFile(path);
  }
}

function addFinding(path, lineNumber, line, rule, detail) {
  findings.push({
    file: relative(ROOT, path).replace(/\\/g, '/'),
    line: lineNumber,
    rule,
    detail,
    excerpt: line.trim().slice(0, 160),
  });
}

function scanFile(path) {
  const content = readFileSync(path, 'utf8');
  const relativePath = relative(ROOT, path).replace(/\\/g, '/');
  filesScanned += 1;
  const lines = content.split(/\r?\n/);

  for (const [index, line] of lines.entries()) {
    const lineNumber = index + 1;

    for (const rule of RULES) {
      if (rule.allowFile && !rule.allowFile(relativePath)) continue;
      rule.regex.lastIndex = 0;
      let match;
      while ((match = rule.regex.exec(line)) !== null) {
        if (!rule.allow || !rule.allow(match)) {
          addFinding(path, lineNumber, line, rule.id, match[0]);
        }
        if (match[0].length === 0) rule.regex.lastIndex += 1;
      }
    }

    if (path.endsWith('.env.example')) {
      const match = /^([A-Z][A-Z0-9_]*)=(.*)$/.exec(line);
      if (match && SENSITIVE_KEY.test(match[1]) && match[2].trim()) {
        addFinding(path, lineNumber, line, 'env-example-secret-placeholder', `${match[1]} must be empty in the template`);
      }
      continue;
    }

    GENERIC_ASSIGNMENT.lastIndex = 0;
    let generic;
    while ((generic = GENERIC_ASSIGNMENT.exec(line)) !== null) {
      const value = generic[2];
      if (/^(?:replace|example|your-|placeholder|localdev-)/i.test(value)) continue;
      if (/^[${<]/.test(value)) continue;
      addFinding(path, lineNumber, line, 'high-entropy-secret-assignment', `${generic[1]} = <redacted>`);
    }
  }
}

walk(ROOT);

if (findings.length) {
  console.error(`Secret scan failed: ${findings.length} finding(s).`);
  for (const finding of findings) {
    console.error(`  ${finding.file}:${finding.line} [${finding.rule}] ${finding.detail}`);
    console.error(`    ${finding.excerpt}`);
  }
  process.exit(1);
}

console.log(`Secret scan passed: ${filesScanned} files checked, 0 findings.`);
console.log('.env is excluded by design; .env.example contains empty secret placeholders only.');
