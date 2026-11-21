#!/usr/bin/env node
/**
 * One-command, platform-neutral verified setup.
 *
 *   npm run setup          generate .env, start containers, migrate, verify
 *   npm run setup:verify   regenerate/fill .env and run offline checks only
 */
import { spawnSync } from 'node:child_process';
import { ensureEnv } from './lib/local-env.mjs';

const VERIFY_ONLY = process.argv.includes('--verify-only');
const API_BASE = process.env.API_BASE_URL ?? `http://localhost:${process.env.API_PORT ?? '4000'}`;
const NPM = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function run(command, args, { optional = false } = {}) {
  console.log(`\n▸ ${command} ${args.join(' ')}`);
  // Windows .cmd shims cannot be spawned directly; use cmd.exe explicitly so
  // arguments stay quoted and Node does not emit the shell:true warning.
  const windows = process.platform === 'win32';
  const spawnCommand = windows ? 'cmd.exe' : command;
  const spawnArgs = windows
    ? ['/d', '/s', '/c', [command, ...args.map((arg) => (/\s/.test(arg) ? `"${arg}"` : arg))].join(' ')]
    : args;
  const result = spawnSync(spawnCommand, spawnArgs, { stdio: 'inherit' });
  if (result.error) {
    if (optional) return false;
    throw result.error;
  }
  if (result.status !== 0) {
    if (optional) return false;
    throw new Error(`${command} ${args.join(' ')} exited with ${result.status}`);
  }
  return true;
}

function compose(args, optional = false) {
  return run('docker', ['compose', ...args], { optional });
}

async function waitForApi(timeoutMs = 180_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(`${API_BASE}/health`);
      if (response.ok) {
        const body = await response.json();
        if (body?.db?.ok === true) return;
      }
    } catch { /* API is still starting. */ }
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  throw new Error(`API did not become healthy at ${API_BASE}/health within ${timeoutMs / 1000}s`);
}

async function main() {
  const env = ensureEnv();
  console.log(`${env.created ? 'Created' : 'Updated'} .env (generated: ${env.filled.join(', ') || 'none required'}).`);
  console.log('Credentials are local-only, non-production and gitignored; they are not printed.');

  if (!VERIFY_ONLY) {
    if (!compose(['version'], true)) {
      throw new Error('Docker Compose is required for `npm run setup`. Start Docker, then retry.');
    }
    compose(['config', '--quiet']);
    compose(['up', '-d', '--build']);
    await waitForApi();
    compose(['exec', '-T', 'api', 'npm', 'run', 'db:seed:dev']);
    compose(['exec', '-T', 'api', 'npm', 'run', 'ci:verify']);
    compose(['exec', '-T', 'api', 'npm', 'run', 'test:smoke']);
  } else {
    console.log('\n▸ --verify-only: skipping container startup and API smoke.');
    run(NPM, ['run', 'ci:verify']);
  }

  run(NPM, ['run', 'ci:build']);

  console.log('\nVintora local verification complete.');
  if (!VERIFY_ONLY) {
    console.log('Storefront: http://localhost:4000/ (static: http://localhost:8123/)');
    console.log('Self-test:  http://localhost:4000/?selftest=1');
    console.log('Admin:      http://localhost:4000/?view=admin');
    console.log('Local-only demo identities are in .env. Run `npm run dev:down` to stop the stack.');
  }
  console.log('NO-GO for public launch. Prototype mode — no real orders are placed.');
}

try {
  await main();
} catch (error) {
  console.error(`\nSetup failed: ${error.message}`);
  if (!VERIFY_ONLY) {
    console.error('Diagnostics: docker compose logs --tail=100');
    compose(['logs', '--tail=100'], true);
  }
  process.exit(1);
}
