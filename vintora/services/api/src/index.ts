import 'dotenv/config';
import { createServer } from 'node:http';
import { app } from './app.js';
import { config } from './config.js';
import { pool } from './db/pool.js';
import { embeddingModeHealth } from './db/migrate.js';

const server = createServer(app);
const embedding = await embeddingModeHealth().catch(() => ({
  mode: 'unknown' as const,
  detail: 'embedding mode diagnostic failed',
}));

server.listen(config.PORT, () => {
  // Startup logs expose fixed mode labels only. Environment-derived values are
  // validated below but never interpolated into log text (CodeQL clear-text logging).
  console.log('Vintora API + storefront listening');
  console.log('Environment: prototype (no live transactions in this build)');
  console.log('Payments provider: simulated (no live transactions in this build)');
  console.log(`Embedding mode: ${embedding.mode}`);
});

async function shutdown(signal: string): Promise<void> {
  console.log(`[shutdown] ${signal} received`);
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}

process.on('SIGINT', () => { void shutdown('SIGINT'); });
process.on('SIGTERM', () => { void shutdown('SIGTERM'); });
