#!/usr/bin/env node
/** Dependency-free static server for the zero-build prototype. */
import { createReadStream, existsSync, realpathSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('../apps/prototype/', import.meta.url)));
const ROOT_REAL = realpathSync(ROOT);
const HOST = process.env.HOST ?? '0.0.0.0';
const PORT = Number(process.env.PROTOTYPE_PORT ?? 8123);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.map': 'application/json; charset=utf-8',
};

function safePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0] ?? '/');
  const relativePath = normalize(decoded).replace(/^([/\\])+/, '');
  const target = resolve(ROOT, relativePath);
  // CodeQL recognises this canonical relative-path containment check.
  const insideRoot = relative(ROOT, target);
  if (insideRoot === '..' || insideRoot.startsWith('..' + sep)) return null;
  return target;
}

// Lexical containment is not enough: a symlink inside the prototype tree could
// still point outside it. Missing paths are allowed through to the SPA fallback.
function contained(file) {
  try {
    const real = realpathSync(file);
    return real === ROOT_REAL || real.startsWith(ROOT_REAL + sep);
  } catch {
    return !existsSync(file);
  }
}

const server = createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { allow: 'GET, HEAD' }).end('Method not allowed');
    return;
  }

  const target = safePath(req.url ?? '/');
  if (!target || !contained(target)) {
    res.writeHead(403).end('Forbidden');
    return;
  }

  let file = target;
  if (!existsSync(file) || statSync(file).isDirectory()) {
    // Client-side routes fall back to the app shell; missing assets stay 404.
    if (extname(file)) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('Not found');
      return;
    }
    file = join(ROOT, 'index.html');
  }
  if (!existsSync(file) || !contained(file)) {
    res.writeHead(404).end('Not found');
    return;
  }

  res.writeHead(200, {
    'content-type': MIME[extname(file).toLowerCase()] ?? 'application/octet-stream',
    'cache-control': 'no-cache',
  });
  if (req.method === 'HEAD') {
    res.end();
    return;
  }
  createReadStream(file).pipe(res);
});

server.listen(PORT, HOST, () => {
  console.log(`Vintora static prototype listening on http://localhost:${PORT}`);
});
