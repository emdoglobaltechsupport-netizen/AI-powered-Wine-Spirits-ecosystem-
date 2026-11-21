/* =========================================================
   Vintora catalogue ingestion — source adapters.

   Adapters only read. They never guess, enrich or fabricate
   product facts. Every returned raw record carries a source,
   a source URL where available, a licence and a retrieval time.
   ========================================================= */

import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

export function hashId(value) {
  return createHash('sha256').update(String(value || '')).digest('hex').slice(0, 12);
}

export async function readText(filePath) {
  return fs.readFile(path.resolve(filePath), 'utf8');
}

export async function readJson(filePath) {
  return JSON.parse(await readText(filePath));
}

/* Minimal RFC-4180 CSV parser — no external dependency. */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else quoted = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') { quoted = true; continue; }
    if (ch === ',') { row.push(field); field = ''; continue; }
    if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; continue; }
    if (ch === '\r') continue;
    field += ch;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  const cleaned = rows.filter((r) => r.some((v) => String(v).trim() !== ''));
  if (!cleaned.length) return [];
  const headers = cleaned[0].map((h) => h.trim());
  return cleaned.slice(1).map((values) => {
    const record = {};
    headers.forEach((header, index) => { record[header] = values[index] ?? ''; });
    return record;
  });
}

function recordsFromPayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.records)) return payload.records;
  if (payload && Array.isArray(payload.data)) return payload.data;
  throw new Error('Expected an array, or an object with records[] or data[].');
}

function wrap(record, meta) {
  return {
    source: meta.source,
    source_record_id: record.product_sku || record.barcode || record.code || hashId(JSON.stringify(record)),
    source_url: record.source_url || record.official_product_page || null,
    license: meta.license,
    retrieved_at: meta.retrieved_at,
    raw: record,
  };
}

/* Licensed supplier / brand feed. JSON or CSV. Values are trusted only as
   far as the feed's licence and provenance allow; no field is invented. */
export async function loadLicensedFeed({
  filePath,
  license = 'SUPPLIER_PROVIDED — record exact licence in feed metadata',
  retrievedAt = new Date().toISOString(),
  sourceId = 'licensed-feed',
} = {}) {
  if (!filePath) return [];
  const text = await readText(filePath);
  const payload = /\.csv$/i.test(filePath) ? parseCsv(text) : JSON.parse(text);
  return recordsFromPayload(payload).map((record) => wrap(record, {
    source: sourceId,
    license: payload.license || license,
    retrieved_at: payload.retrieved_at || retrievedAt,
  }));
}

/* Local fixture adapter — for pipeline tests only. Fixture rows are never
   treated as verified catalogue data and are excluded by the default import
   confidence threshold. */
export async function loadFixture(filePath, retrievedAt = new Date().toISOString()) {
  if (!filePath) return [];
  const payload = await readJson(filePath);
  return recordsFromPayload(payload).map((record) => wrap(record, {
    source: 'fixture',
    license: payload.license || 'TEST_FIXTURE_NOT_FOR_IMPORT',
    retrieved_at: payload.retrieved_at || retrievedAt,
  }));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(url, userAgent) {
  const response = await fetch(url, {
    headers: {
      'user-agent': userAgent || 'VintoraCatalogueIngest/0.1 (contact: configure VINTORA_OFF_USER_AGENT)',
      accept: 'application/json',
    },
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText} for ${url}`);
  return response.json();
}

/* Open Food Facts adapter. Provides barcodes, brand/label strings and images.
   It does NOT provide MSRP, awards, official product pages, tasting notes or
   global retail prices; those canonical fields stay null/empty. */
export async function* fetchOpenFoodFacts({
  baseUrl = 'https://world.openfoodfacts.org',
  userAgent,
  pageSize = 100,
  pagesPerQuery = 5,
  delayMs = 1000,
  queries = [],
} = {}) {
  const retrievedAt = new Date().toISOString();
  for (const query of queries) {
    for (let page = 1; page <= pagesPerQuery; page++) {
      const term = String(query).replace(/^en:/, '');
      const url = `${baseUrl}/cgi/search.pl?search_terms=${encodeURIComponent(term)}` +
        `&json=1&page_size=${pageSize}&page=${page}`;
      const payload = await fetchJson(url, userAgent);
      const products = Array.isArray(payload.products) ? payload.products : [];
      for (const product of products) {
        yield {
          source: 'openfoodfacts',
          source_record_id: product.code || hashId(JSON.stringify(product)),
          source_url: product.code ? `${baseUrl}/product/${product.code}` : null,
          license: 'ODbL-1.0',
          retrieved_at: retrievedAt,
          raw: { ...product, _off_query: query },
        };
      }
      if (products.length < pageSize) break;
      if (delayMs > 0) await sleep(delayMs);
    }
  }
}
