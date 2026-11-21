import { randomUUID } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';

/** Attach a request id to every request and echo it in the response. */
export function requestId(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.header('x-request-id');
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(incoming ?? '');
  req.id = isUuid ? incoming!.toLowerCase() : randomUUID();
  res.setHeader('x-request-id', req.id);
  next();
}
