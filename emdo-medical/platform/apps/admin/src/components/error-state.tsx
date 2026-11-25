const MESSAGES: Record<string, string> = {
  AUTH_REQUIRED: 'Your session has expired. Sign in again.',
  INVALID_OR_EXPIRED_TOKEN: 'Your session has expired. Sign in again.',
  FORBIDDEN: 'Your role does not have access to this view.',
  INSIGHT_REPORT_GROUP_FORBIDDEN: 'Your role does not have access to this report group.',
  COUNTRY_MISMATCH: 'This view is outside your assigned country scope.',
  INSIGHT_METRIC_NOT_FOUND: 'That metric definition does not exist.',
  INSIGHT_REPORT_NOT_FOUND: 'That report definition does not exist.',
  INVALID_INSIGHT_CADENCE: 'Choose a daily, weekly or monthly cadence.',
  VALIDATION_ERROR: 'The submitted values are invalid.',
  API_UNAVAILABLE: 'The Insight API is unavailable. No value has been inferred.',
  SERVICE_UNAVAILABLE: 'The Insight API is unavailable. No value has been inferred.',
  INTERNAL_ERROR: 'The Insight API returned an unexpected result. No value has been inferred.',
};

export function errorMessage(code: string): string {
  return MESSAGES[code] ?? 'Access could not be confirmed. No value has been inferred.';
}

export function ErrorState({ code }: { code: string }) {
  return <p className="notice notice--error">{errorMessage(code)}</p>;
}
