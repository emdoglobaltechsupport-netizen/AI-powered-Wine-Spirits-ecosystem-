import type { InsightEvidenceStatus } from '@emdo/shared';

const STATUS_LABELS: Record<InsightEvidenceStatus, string> = {
  AVAILABLE_TESTED: 'Available — tested',
  AVAILABLE_WITH_CAVEAT: 'Available — caveat applies',
  PARTIAL_ONLY: 'Partial only',
  UNAVAILABLE_NO_SOURCE: 'Unavailable — no trusted source',
  BLOCKED_BY_GOVERNANCE: 'Blocked — governance gate',
};

export function EvidenceBadge({ status }: { status: InsightEvidenceStatus }) {
  const tone = status === 'AVAILABLE_TESTED'
    ? 'good'
    : status === 'AVAILABLE_WITH_CAVEAT'
      ? 'caution'
      : 'blocked';
  return (
    <span className={`badge badge--${tone}`} data-evidence={status}>
      {STATUS_LABELS[status]}
    </span>
  );
}

export function isUnavailable(status: InsightEvidenceStatus): boolean {
  return status === 'UNAVAILABLE_NO_SOURCE' || status === 'BLOCKED_BY_GOVERNANCE';
}

export function displayValue(
  status: InsightEvidenceStatus,
  suppressed: boolean,
  value: number | null,
): string {
  if (suppressed) return 'Withheld — below minimum group size';
  if (isUnavailable(status) || value === null) return 'No value reported';
  return value.toLocaleString('en-US');
}
