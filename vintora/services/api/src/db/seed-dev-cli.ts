import 'dotenv/config';
import { pool } from './pool.js';
import { seedDevIdentities } from './seed.js';

seedDevIdentities()
  .then(async () => {
    console.log('[db] development-only identity seed complete');
    await pool.end();
  })
  .catch(async (err) => {
    console.error('[db] development-only identity seed failed', err);
    await pool.end();
    process.exitCode = 1;
  });
