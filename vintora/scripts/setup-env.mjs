#!/usr/bin/env node
import { ensureEnv } from './lib/local-env.mjs';

const force = process.argv.includes('--force');
const result = ensureEnv({ force });
console.log(`${result.created ? 'Created' : 'Updated'} ${result.path}`);
console.log(`Generated ${result.filled.length} local development value(s): ${result.filled.join(', ') || 'none required'}`);
console.log('Values are local-only, non-production and gitignored. Never commit .env or share generated credentials.');
