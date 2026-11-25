#!/usr/bin/env node
/**
 * Run a command with the gitignored .env loaded into process.env.
 * Avoids shell-specific export/Set-Item syntax in setup documentation.
 *
 *   npm run with-env -- npm run catalogue:import
 */
import { spawnSync } from 'node:child_process';
import { config } from 'dotenv';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ENV_PATH = join(ROOT, '.env');

if (existsSync(ENV_PATH)) config({ path: ENV_PATH, override: false });

const [command, ...args] = process.argv.slice(2);
if (!command) {
  console.error('Usage: npm run with-env -- <command> [args...]');
  process.exit(1);
}

// npm.cmd cannot be spawned directly on Windows; route it through cmd.exe.
const windowsNpm = process.platform === 'win32' && (command === 'npm' || command === 'npm.cmd');
// cmd.exe quoting must escape backslashes before quotes; otherwise a trailing
// backslash would escape the closing quote and alter the spawned argument.
const quote = (value) => {
  const text = String(value);
  return /\s|["\\]/.test(text) ? `"${text.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"` : text;
};

const result = windowsNpm
  ? spawnSync('cmd.exe', ['/d', '/s', '/c', ['npm.cmd', ...args.map(quote)].join(' ')], {
    cwd: ROOT,
    env: process.env,
    stdio: 'inherit',
  })
  : spawnSync(command, args, { cwd: ROOT, env: process.env, stdio: 'inherit' });

if (result.error) {
  console.error(`Command failed: ${result.error.message}`);
  process.exit(1);
}
if (result.status !== 0) process.exit(result.status ?? 1);
