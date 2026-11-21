import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { config } from '../config.js';
import { AppError, internal } from '../lib/errors.js';

interface PgLikeError {
  code?: string;
  constraint?: string;
  detail?: string;
  message?: string;
}

function isPgError(err: unknown): err is PgLikeError {
  return typeof err === 'object' && err !== null && 'code' in err && typeof (err as PgLikeError).code === 'string';
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: 'route_not_found' });
}

/** Single error pipeline: safe messages to clients, full detail to logs. */
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (res.headersSent) return;

  if (err instanceof AppError) {
    res.status(err.status).json({
      error: err.code,
      message: err.expose ? err.message : 'Request could not be completed',
      ...(err.details !== undefined && err.expose ? { details: err.details } : {}),
      requestId: req.id,
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'invalid_request',
      message: 'Request validation failed',
      details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      requestId: req.id,
    });
    return;
  }

  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({ error: 'malformed_json', message: 'Request body is not valid JSON', requestId: req.id });
    return;
  }

  if (isPgError(err)) {
    switch (err.code) {
      case '23505':
        res.status(409).json({ error: 'conflict', message: 'A record with that value already exists', requestId: req.id });
        return;
      case '23503':
        res.status(400).json({ error: 'invalid_reference', message: 'Referenced record does not exist', requestId: req.id });
        return;
      case '22P02':
      case '23514':
      case '23502':
        res.status(400).json({ error: 'invalid_request', message: 'A value failed database validation', requestId: req.id });
        return;
      default:
        break;
    }
  }

  const failure = internal();
  console.error('[error]', {
    requestId: req.id,
    method: req.method,
    path: req.originalUrl,
    name: err instanceof Error ? err.name : 'UnknownError',
    message: err instanceof Error ? err.message : String(err),
    stack: config.isProduction ? undefined : err instanceof Error ? err.stack : undefined,
  });
  res.status(failure.status).json({
    error: failure.code,
    message: failure.message,
    requestId: req.id,
  });
}

