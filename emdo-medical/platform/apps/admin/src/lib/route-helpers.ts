import { NextResponse } from 'next/server';
import { InsightApiError } from './api';

const SAFE_LOCAL_CODES = new Set([
  'ADMIN_SESSION_SECRET_NOT_CONFIGURED',
  'PORTAL_ROLE_FORBIDDEN',
]);

function codeFor(error: unknown): string {
  if (error instanceof InsightApiError) return error.code;
  if (error instanceof Error && SAFE_LOCAL_CODES.has(error.message)) return error.message;
  return 'INTERNAL_ERROR';
}

function statusFor(error: unknown, code: string): number {
  if (error instanceof InsightApiError) return error.status;
  if (code === 'PORTAL_ROLE_FORBIDDEN') return 403;
  if (code === 'ADMIN_SESSION_SECRET_NOT_CONFIGURED') return 500;
  return 500;
}

export function safeErrorResponse(error: unknown): NextResponse {
  const code = codeFor(error);
  return NextResponse.json({ error: { code } }, { status: statusFor(error, code) });
}

export async function readJsonBody(request: Request): Promise<Record<string, unknown>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new InsightApiError(400, 'VALIDATION_ERROR');
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new InsightApiError(400, 'VALIDATION_ERROR');
  }
  return body as Record<string, unknown>;
}
