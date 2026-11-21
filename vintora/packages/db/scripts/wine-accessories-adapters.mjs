/* =========================================================
   Vintora Wine Accessories catalogue ingestion — adapters.

   Adapters only read configured sources. They never invent
   products, prices, asset URLs, licences or authorisations.
   ========================================================= */

import { hashId, parseCsv, readText } from './catalogue-adapters.mjs';

export { hashId };

function recordsFromPayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.records)) return payload.records;
  if (payload && Array.isArray(payload.data)) return payload.data;
  throw new Error('Expected an array, or an object with records[] or data[].');
}

function envelope(record, meta) {
  return {
    source: meta.source,
    source_record_id: record.product_sku || record.sku || record.barcode || hashId(JSON.stringify(record)),
    source_url: record.source_url || record.official_product_page || null,
    license: meta.license,
    retrieved_at: meta.retrieved_at,
    raw: record,
  };
}

/* Licensed supplier / brand feed. JSON or CSV. Every value remains
   source-bound; the normaliser and validator do the quality gating. */
export async function loadWineAccessoriesFeed({
  filePath,
  license = 'SUPPLIER_PROVIDED — record exact licence in feed metadata',
  retrievedAt = new Date().toISOString(),
  sourceId = 'licensed-feed',
} = {}) {
  if (!filePath) return [];
  const text = await readText(filePath);
  const payload = /\.csv$/i.test(filePath) ? parseCsv(text) : JSON.parse(text);
  return recordsFromPayload(payload).map((record) => envelope(record, {
    source: sourceId,
    license: payload.license || license,
    retrieved_at: payload.retrieved_at || retrievedAt,
  }));
}

/* Local synthetic fixture. Explicitly excluded from production import
   unless a test-only flag is passed. */
export async function loadWineAccessoriesFixture(filePath, retrievedAt = new Date().toISOString()) {
  if (!filePath) return [];
  const text = await readText(filePath);
  const payload = JSON.parse(text);
  return recordsFromPayload(payload).map((record) => envelope(record, {
    source: 'fixture',
    license: payload.license || 'TEST_FIXTURE_NOT_FOR_IMPORT',
    retrieved_at: payload.retrieved_at || retrievedAt,
  }));
}
