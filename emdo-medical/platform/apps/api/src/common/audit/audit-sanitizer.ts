/**
 * Audit metadata is allowlisted so PHI cannot leak into the immutable log.
 * Unknown keys are dropped rather than logged.
 */
const ALLOWED_KEYS = new Set([
  'httpMethod',
  'path',
  'statusCode',
  'reason',
  'resourceType',
  'resourceId',
  'grantId',
  'role',
  'countryCode',
  'decision',
  'outcome',
  'model',
  'modelVersion',
  'recordCount',
  'version',
  // M9 AI telemetry. Values are allowlisted codes/IDs, never prompt bodies.
  'agentId',
  'capability',
  'promptVersion',
  'label',
  'outcome',
  'approvalId',
  'escalationId',
  'reasonCode',
  'assignedRole',
  'sourceCount',
  'state',
  'interactionId',
  'language',
  'dependency',
  // M10 aggregate reporting. Values are codes/IDs only, never report content.
  'reportId',
  'cadence',
  'period',
  'reportGroup',
  'metricId',
  'metricVersion',
  'evidenceStatus',
  'sourceStatus',
  'suppressed',
  'scope',
  'metricCount',
]);

const PHI_PATTERNS = [
  /[\w.+-]+@[\w-]+\.[\w.]+/,
  /\+?\d[\d\s-]{7,}\d/,
  /\b\d{3}-\d{2}-\d{4}\b/,
];

export function sanitizeAuditMetadata(input: unknown): Record<string, string | number | boolean> {
  const result: Record<string, string | number | boolean> = {};
  if (typeof input !== 'object' || input === null || Array.isArray(input)) return result;

  for (const [key, value] of Object.entries(input)) {
    if (!ALLOWED_KEYS.has(key)) continue;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      if (typeof value === 'string') {
        // Period is DTO-validated and must survive the phone-like pattern.
        if (key === 'period' && /^\d{4}-\d{2}(?:-\d{2})?$/.test(value)) {
          result[key] = value;
          continue;
        }
        let safe = value.slice(0, 200);
        for (const pattern of PHI_PATTERNS) safe = safe.replace(pattern, '[redacted]');
        result[key] = safe;
      } else {
        result[key] = value;
      }
    }
  }
  return result;
}
