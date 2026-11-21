import type { Request, Response, NextFunction } from 'express';
import { badRequest } from '../lib/errors.js';

export const API_VERSION = 'v1';
const SUPPORTED = [API_VERSION] as const;

/**
 * Echo the API version on every response and validate optional client pinning.
 * Unsupported versions fail before any handler runs, including not-found routes.
 */
export function apiVersion(req: Request, res: Response, next: NextFunction): void {
  res.setHeader('X-Vintora-Api-Version', API_VERSION);

  const header = req.header('accept-version')?.trim().toLowerCase();
  if (!header) {
    next();
    return;
  }

  const requested = /^v?(\d+)$/.exec(header)?.[1];
  if (requested === '1') {
    res.setHeader('X-Vintora-Api-Version', API_VERSION);
    next();
    return;
  }

  next(badRequest('Unsupported API version', { requested: header, supported: [...SUPPORTED] }));
}
