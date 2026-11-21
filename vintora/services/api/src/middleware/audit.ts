import type { Request, Response, NextFunction } from 'express';

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function safePath(req: Request): string {
  return (req.originalUrl.split('?')[0] ?? '')
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi, '/:id')
    .replace(/\/(sku|case|RFQ|VNT)-[A-Za-z0-9_-]+/gi, '/$1-:code');
}

function actionFor(req: Request): string {
  return `${req.method.toLowerCase()}:${safePath(req)}`;
}

/**
 * Structured stdout request audit baseline. Financial, approval and catalogue
 * events additionally use append-only database audit tables. Production must
 * ship these records to a retained, append-only audit store.
 */
export function auditRequests(req: Request, res: Response, next: NextFunction): void {
  if (!MUTATING.has(req.method)) {
    next();
    return;
  }

  const started = process.hrtime.bigint();
  res.on('finish', () => {
    const status = res.statusCode;
    const result = status === 401 || status === 403
      ? 'denied'
      : status >= 400 ? 'failure' : 'success';
    const record = {
      type: 'request_audit',
      at: new Date().toISOString(),
      requestId: req.id,
      action: actionFor(req),
      actor: req.auth?.userId ?? 'anonymous',
      roles: req.auth?.roles ?? [],
      source: 'api',
      method: req.method,
      path: safePath(req),
      status,
      result,
      reason: null,
      durationMs: Number(process.hrtime.bigint() - started) / 1_000_000,
      retentionClass: 'operational',
    };
    console.log(JSON.stringify(record));
  });
  next();
}
