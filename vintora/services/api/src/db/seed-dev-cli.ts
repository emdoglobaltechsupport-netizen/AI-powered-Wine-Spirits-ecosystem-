import 'dotenv/config';
import { pool } from './pool.js';
import { seedDevIdentities } from './seed.js';

seedDevIdentities()
  .then(async () => {
    console.log('[db] development-only identity seed complete');
    await pool.end();
  })
  .catch(async () => {
    // Do not interpolate the error: it can carry the env-derived database URL.
    console.error('[db] development-only identity seed failed; inspect the local database log');
    await pool.end();
    process.exitCode = 1;
  });
