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
  console.log(`Vintora API + storefront listening on http://localhost:${config.PORT}`);
  console.log(`Environment: ${config.NODE_ENV}`);
  console.log(`Payments provider: ${config.PAYMENT_PROVIDER} (no live transactions in this build)`);
  console.log(`Embedding mode: ${embedding.mode} (${embedding.detail})`);
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
