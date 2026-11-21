import type { Request, Response, NextFunction } from 'express';
import { config } from '../config.js';
import { tooMany } from '../lib/errors.js';

interface Bucket {
  count: number;
  resetAt: number;
}

// Prototype baseline only. Production requires a distributed store scoped by
// user, API key and route class (see API_POLICY.md).
const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 10_000;
const WINDOW_MS = config.RATE_LIMIT_WINDOW_MS;
const MAX_REQUESTS = config.RATE_LIMIT_MAX;

function clientKey(req: Request): string {
  return req.ip || req.socket.remoteAddress || 'unknown';
}

function prune(now: number): void {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

/** Fixed-window limiter with IETF-style RateLimit response headers. */
export function rateLimit(req: Request, res: Response, next: NextFunction): void {
  const now = Date.now();
  if (buckets.size > MAX_BUCKETS) prune(now);

  const key = clientKey(req);
  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + WINDOW_MS };
    buckets.set(key, bucket);
  }
  bucket.count += 1;

  const remaining = Math.max(0, MAX_REQUESTS - bucket.count);
  const resetSeconds = Math.max(0, Math.ceil((bucket.resetAt - now) / 1000));
  res.setHeader('RateLimit-Limit', String(MAX_REQUESTS));
  res.setHeader('RateLimit-Remaining', String(remaining));
  res.setHeader('RateLimit-Reset', String(resetSeconds));

  if (bucket.count > MAX_REQUESTS) {
    res.setHeader('Retry-After', String(resetSeconds));
    next(tooMany('Rate limit exceeded'));
    return;
  }
  next();
}
