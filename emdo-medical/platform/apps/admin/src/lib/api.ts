import {
  INSIGHT_METRIC_IDS,
  INSIGHT_REPORT_CADENCES,
  INSIGHT_REPORT_IDS,
  type InsightMetricId,
  type InsightReportId,
} from '@emdo/shared';
import type {
  GenerateReportInput,
  PortalSession,
  SafeInsightMetricDefinition,
  SafeInsightMetricValue,
  SafeInsightReport,
  SafeInsightReportDefinition,
} from './contracts';
import {
  sanitizeMetricDefinition,
  sanitizeMetricValue,
  sanitizeReport,
  sanitizeReportDefinition,
} from './sanitize';

const DEFAULT_API_BASE = 'http://127.0.0.1:3000';
const API_TIMEOUT_MS = 10_000;
const SAFE_ERROR_CODES = new Set([
  'AUTH_REQUIRED',
  'INVALID_OR_EXPIRED_TOKEN',
  'MALFORMED_TOKEN',
  'INVALID_CREDENTIALS',
  'INSUFFICIENT_ROLE',
  'FORBIDDEN',
  'PORTAL_ROLE_FORBIDDEN',
  'COUNTRY_MISMATCH',
  'INSIGHT_METRIC_NOT_FOUND',
  'INSIGHT_REPORT_NOT_FOUND',
  'INSIGHT_REPORT_GROUP_FORBIDDEN',
  'INVALID_INSIGHT_CADENCE',
  'VALIDATION_ERROR',
  'INTERNAL_ERROR',
  'ADMIN_SESSION_SECRET_NOT_CONFIGURED',
]);

export class InsightApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(code);
    this.name = 'InsightApiError';
  }
}

function apiBase(): string {
  return (process.env.INSIGHT_API_BASE_URL ?? DEFAULT_API_BASE).replace(/\/$/, '');
}

function errorCode(status: number, rawCode: unknown): string {
  if (typeof rawCode === 'string' && SAFE_ERROR_CODES.has(rawCode)) return rawCode;
  if (status === 401) return 'AUTH_REQUIRED';
  if (status === 403) return 'FORBIDDEN';
  if (status === 404) return 'NOT_FOUND';
  if (status === 400) return 'VALIDATION_ERROR';
  if (status === 503) return 'SERVICE_UNAVAILABLE';
  return 'INTERNAL_ERROR';
}

async function requestJson<T>(
  path: string,
  token?: string,
  init: RequestInit = {},
): Promise<T> {
  if (!/^\/v1\/(insight|identity)\/[A-Za-z0-9_/-]+$/.test(path)) {
    throw new Error('INVALID_API_PATH');
  }
  const headers = new Headers(init.headers);
  headers.set('accept', 'application/json');
  if (token) headers.set('authorization', `Bearer ${token}`);
  if (init.body) headers.set('content-type', 'application/json');

  let response: Response;
  try {
    response = await fetch(`${apiBase()}${path}`, {
      ...init,
      headers,
      cache: 'no-store',
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
    });
  } catch {
    throw new InsightApiError(503, 'API_UNAVAILABLE');
  }

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  if (!response.ok) {
    const rawCode = (payload as { error?: { code?: unknown } } | null)?.error?.code;
    throw new InsightApiError(response.status, errorCode(response.status, rawCode));
  }
  return payload as T;
}

function asArray(value: unknown, label: string): readonly unknown[] {
  if (!Array.isArray(value)) throw new Error(`INVALID_${label}`);
  return value;
}

export function assertMetricId(value: unknown): InsightMetricId {
  if (typeof value !== 'string' || !INSIGHT_METRIC_IDS.includes(value as InsightMetricId)) {
    throw new InsightApiError(404, 'INSIGHT_METRIC_NOT_FOUND');
  }
  return value as InsightMetricId;
}

export function assertReportId(value: unknown): InsightReportId {
  if (typeof value !== 'string' || !INSIGHT_REPORT_IDS.includes(value as InsightReportId)) {
    throw new InsightApiError(404, 'INSIGHT_REPORT_NOT_FOUND');
  }
  return value as InsightReportId;
}

export function assertGenerateReportInput(value: unknown): GenerateReportInput {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new InsightApiError(400, 'VALIDATION_ERROR');
  }
  const source = value as Record<string, unknown>;
  const reportId = assertReportId(source['reportId']);
  if (typeof source['cadence'] !== 'string'
    || !INSIGHT_REPORT_CADENCES.includes(source['cadence'] as GenerateReportInput['cadence'])) {
    throw new InsightApiError(400, 'INVALID_INSIGHT_CADENCE');
  }
  if (typeof source['period'] !== 'string' || !/^\d{4}-\d{2}(?:-\d{2})?$/.test(source['period'])) {
    throw new InsightApiError(400, 'VALIDATION_ERROR');
  }
  return {
    reportId,
    cadence: source['cadence'] as GenerateReportInput['cadence'],
    period: source['period'],
  };
}

export async function loginWithApi(
  identifier: string,
  password: string,
): Promise<{ accessToken: string; expiresIn: number }> {
  if (typeof identifier !== 'string' || identifier.length < 5 || identifier.length > 254
    || typeof password !== 'string' || password.length < 12 || password.length > 256) {
    throw new InsightApiError(400, 'VALIDATION_ERROR');
  }
  const result = await requestJson<{ accessToken?: unknown; expiresIn?: unknown }>(
    '/v1/identity/login',
    undefined,
    {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    },
  );
  if (typeof result.accessToken !== 'string' || typeof result.expiresIn !== 'number') {
    throw new Error('INVALID_LOGIN_RESPONSE');
  }
  // Refresh tokens are deliberately discarded; the portal holds one short-lived access token only.
  return { accessToken: result.accessToken, expiresIn: result.expiresIn };
}

export async function fetchMetricDefinitions(
  session: PortalSession,
): Promise<readonly SafeInsightMetricDefinition[]> {
  const payload = await requestJson<unknown>('/v1/insight/metrics', session.accessToken);
  return asArray(payload, 'METRIC_LIST').map(sanitizeMetricDefinition);
}

export async function fetchMetricValues(
  session: PortalSession,
  rawMetricId: unknown,
): Promise<readonly SafeInsightMetricValue[]> {
  const metricId = assertMetricId(rawMetricId);
  const payload = await requestJson<unknown>(
    `/v1/insight/metrics/${metricId}`,
    session.accessToken,
  );
  return asArray(payload, 'METRIC_VALUE_LIST').map(sanitizeMetricValue);
}

export async function fetchReportDefinitions(
  session: PortalSession,
): Promise<readonly SafeInsightReportDefinition[]> {
  const payload = await requestJson<unknown>('/v1/insight/reports', session.accessToken);
  return asArray(payload, 'REPORT_LIST').map(sanitizeReportDefinition);
}

export async function fetchReportDefinition(
  session: PortalSession,
  rawReportId: unknown,
): Promise<SafeInsightReportDefinition> {
  const reportId = assertReportId(rawReportId);
  const payload = await requestJson<unknown>(
    `/v1/insight/reports/${reportId}`,
    session.accessToken,
  );
  return sanitizeReportDefinition(payload);
}

export async function generateReport(
  session: PortalSession,
  rawInput: unknown,
): Promise<SafeInsightReport> {
  const input = assertGenerateReportInput(rawInput);
  const payload = await requestJson<unknown>('/v1/insight/reports/generate', session.accessToken, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return sanitizeReport(payload);
}
