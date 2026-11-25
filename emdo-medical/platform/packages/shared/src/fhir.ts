/**
 * Minimal FHIR R4-compatible structure validation for the EMDO Record module.
 * This is a compatibility layer, not a full FHIR validator. A conformant FHIR
 * validator is a documented dependency for pilot/production (see docs).
 */

export const SUPPORTED_FHIR_RESOURCES = [
  'Patient',
  'Observation',
  'Condition',
  'AllergyIntolerance',
  'MedicationStatement',
  'Immunization',
  'DocumentReference',
  'Encounter',
] as const;

export type SupportedFhirResource = (typeof SUPPORTED_FHIR_RESOURCES)[number];

export interface FhirValidationResult {
  valid: boolean;
  errors: string[];
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const hasText = (value: unknown): boolean => typeof value === 'string' && value.trim().length > 0;

/** Validates the structural minimums EMDO requires before encrypting a resource. */
export function validateFhirResource(input: unknown): FhirValidationResult {
  const errors: string[] = [];

  if (!isObject(input)) {
    return { valid: false, errors: ['resource must be a JSON object'] };
  }

  const resourceType = input['resourceType'];
  if (typeof resourceType !== 'string' || !SUPPORTED_FHIR_RESOURCES.includes(resourceType as SupportedFhirResource)) {
    errors.push(`resourceType must be one of: ${SUPPORTED_FHIR_RESOURCES.join(', ')}`);
    return { valid: false, errors };
  }

  if (!hasText(input['id'])) {
    errors.push('id must be a non-empty string');
  }

  if (!isObject(input['meta']) || !hasText(input.meta['versionId'])) {
    errors.push('meta.versionId must be a non-empty string');
  }

  const subject = input['subject'];
  if (!isObject(subject) || !hasText(subject['reference'])) {
    errors.push('subject.reference must be a non-empty string (Patient/<id>)');
  } else if (!String(subject['reference']).startsWith('Patient/')) {
    errors.push('subject.reference must start with "Patient/"');
  }

  if (resourceType === 'Observation') {
    if (!hasText(input['status'])) errors.push('Observation.status is required');
    if (!isObject(input['code'])) errors.push('Observation.code is required');
  }

  if (resourceType === 'DocumentReference') {
    if (!hasText(input['status'])) errors.push('DocumentReference.status is required');
  }

  return { valid: errors.length === 0, errors };
}

/** Rejects free-text fields that must never be written by an automated principal. */
export function assertNoAutomatedSignature(input: unknown): FhirValidationResult {
  const errors: string[] = [];
  if (isObject(input)) {
    const actor = input['author'];
    if (Array.isArray(actor) && actor.some((a) => isObject(a) && String(a['reference'] ?? '').startsWith('AI/'))) {
      errors.push('an AI principal may not author a clinical record');
    }
  }
  return { valid: errors.length === 0, errors };
}
