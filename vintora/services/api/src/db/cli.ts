import 'dotenv/config';
import { seedDatabase } from './seed.js';
import { pool } from './pool.js';

seedDatabase()
  .then(async () => {
    console.log('[db] setup complete');
    await pool.end();
  })
  .catch(async () => {
    // Do not interpolate the error: it can carry the env-derived database URL.
    console.error('[db] setup failed; inspect the local database log');
    await pool.end();
    process.exitCode = 1;
  });
