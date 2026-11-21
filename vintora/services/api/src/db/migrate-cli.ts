import 'dotenv/config';
import { migrate } from './migrate.js';
import { pool } from './pool.js';

/** Schema-only entry point. It never seeds reference rows or demo identities. */
migrate()
  .then((result) => {
    console.log(
      `[db] migrations complete: ${result.applied.length} applied, ${result.skipped} already current, ` +
      `${result.verifiedChecksums} checksums verified.`,
    );
    return pool.end();
  })
  .catch(async (err) => {
    console.error('[db] migrations failed', err);
    await pool.end();
    process.exitCode = 1;
  });
