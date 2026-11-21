/* Shared generated-count guard for offline @vintora/db selftests. */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REGISTER = path.resolve(HERE, '..', '..', '..', 'config', 'test-counts.json');

export async function assertGeneratedCount(suite, actual) {
  const register = JSON.parse(await readFile(REGISTER, 'utf8'));
  const expected = register.suites[suite]?.count;
  if (expected === undefined) throw new Error(`Unknown generated suite: ${suite}`);
  if (actual !== expected) {
    throw new Error(`${suite} selftest executed ${actual} assertions but generated register expects ${expected}; run npm run test-counts:generate`);
  }
  return register;
}

export function printGeneratedSummary(suite, passed, skipped = 0, failed = 0) {
  const total = passed + skipped + failed;
  console.log(`${suite} selftest: ${passed} passed / ${skipped} skipped / ${failed} failed (${total} generated assertions)`);
}
