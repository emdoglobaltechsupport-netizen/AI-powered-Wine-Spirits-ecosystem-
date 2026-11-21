import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { z, type ZodTypeAny } from 'zod';

interface Schemas {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

/** Validate and normalise input once; handlers read the parsed values. */
export function validate(schemas: Schemas): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.parsed = req.parsed || {};
      if (schemas.body) req.parsed.body = schemas.body.parse(req.body);
      if (schemas.query) req.parsed.query = schemas.query.parse(req.query);
      if (schemas.params) req.parsed.params = schemas.params.parse(req.params);
      next();
    } catch (err) {
      next(err);
    }
  };
}

export function bodyOf<T>(req: Request): T {
  return req.parsed.body as T;
}
export function queryOf<T>(req: Request): T {
  return (req.parsed.query ?? req.query) as T;
}
export function paramsOf<T>(req: Request): T {
  return (req.parsed.params ?? req.params) as T;
}

/** Reusable strict object schema (unknown keys are rejected). */
export function strictObject<T extends z.ZodRawShape>(shape: T) {
  return z.object(shape).strict();
}
