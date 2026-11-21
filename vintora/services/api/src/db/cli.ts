import 'dotenv/config';
import { seedDatabase } from './seed.js';
import { pool } from './pool.js';

seedDatabase()
  .then(async () => {
    console.log('[db] setup complete');
    await pool.end();
  })
  .catch(async (err) => {
    console.error('[db] setup failed', err);
    await pool.end();
    process.exitCode = 1;
  });
