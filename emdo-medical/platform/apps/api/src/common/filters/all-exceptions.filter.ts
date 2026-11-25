import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

const FORBIDDEN_CODES = new Set([
  'COUNTRY_PROFILE_NOT_USABLE',
  'CONSENT_REQUIRED',
  'CONSENT_SCOPE_EXCEEDED',
  'INSUFFICIENT_ROLE',
  'FORBIDDEN',
  'FRESH_AUTH_REQUIRED',
  'CLINICIAN_VERIFICATION_NOT_AVAILABLE',
  'COUNTRY_MISMATCH',
  'PROVIDER_NOT_VERIFIED',
  'PROVIDER_OWNER_ONLY',
  'PROVIDER_CREDENTIALS_LOCKED',
  'APPROVAL_REQUIRED',
  'APPROVAL_SAME_ACTOR_NOT_ALLOWED',
  'VERIFICATION_SOURCE_NOT_CONFIGURED',
  'TELEHEALTH_NOT_ENABLED',
  'APPOINTMENT_NOT_OWNED',
  'AI_AGENT_DISABLED',
  'AI_CAPABILITY_NOT_ALLOWED',
  'AI_ROLE_NOT_ALLOWED',
  'AI_DATA_DOMAIN_FORBIDDEN',
  'AI_PATIENT_MISMATCH',
  'AI_CONSENT_REQUIRED',
  'AI_WORKFLOW_NOT_AVAILABLE',
  'AI_APPROVER_NOT_ALLOWED',
  'AI_ESCALATION_NOT_OWNED',
  'INSIGHT_REPORT_GROUP_FORBIDDEN',
]);
const NOT_FOUND_CODES = new Set([
  'USER_NOT_FOUND', 'RECORD_NOT_FOUND', 'GRANT_NOT_FOUND',
  'PROVIDER_NOT_FOUND', 'APPROVAL_NOT_FOUND', 'SLOT_NOT_FOUND', 'APPOINTMENT_NOT_FOUND',
  'AI_AGENT_NOT_FOUND', 'AI_PROMPT_NOT_FOUND',
  'AI_APPROVAL_NOT_FOUND', 'AI_ESCALATION_NOT_FOUND',
  'INSIGHT_METRIC_NOT_FOUND', 'INSIGHT_REPORT_NOT_FOUND',
]);
const BAD_REQUEST_CODES = new Set([
  'INVALID_FHIR_RESOURCE',
  'SUBJECT_MISMATCH',
  'IDENTIFIER_ALREADY_REGISTERED',
  'INVALID_GRANT_EXPIRY',
  'GRANTEE_NOT_FOUND',
  'INVALID_STAFF_ROLE',
  'SELF_GRANT_NOT_ALLOWED',
  'RECORD_NOT_CURRENT',
  'INVALID_PROVIDER_PROFILE',
  'INVALID_LICENCE_EXPIRY',
  'EVIDENCE_REQUIRED',
  'INVALID_APPROVAL_ACTION',
  'INVALID_VERIFICATION_TRANSITION',
  'INVALID_SLOT_WINDOW',
  'SLOT_PROVIDER_MISMATCH',
  'INVALID_TELEHEALTH_FILTER',
  'AI_PROMPT_REQUIRED',
  'AI_PATIENT_REQUIRED',
  'INVALID_AI_ACTION',
  'INVALID_INSIGHT_CADENCE',
]);
const CONFLICT_CODES = new Set([
  'PROVIDER_PROFILE_EXISTS',
  'APPROVAL_REQUEST_EXISTS',
  'APPROVAL_ALREADY_DECIDED',
  'SLOT_NOT_AVAILABLE',
  'SLOT_EXPIRED',
  'APPOINTMENT_ALREADY_CANCELLED',
  'APPOINTMENT_NOT_CANCELLABLE',
  'AI_APPROVAL_ALREADY_DECIDED',
  'AI_ESCALATION_ALREADY_RESOLVED',
]);
const SERVICE_UNAVAILABLE_CODES = new Set([
  'AI_MODEL_BACKEND_NOT_CONFIGURED',
]);

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const response = http.getResponse<Response>();
    const request = http.getRequest<Request & { requestId?: string }>();

    const rawCode = exception instanceof Error
      ? (exception as Error & { code?: string }).code ?? exception.message
      : 'UNKNOWN_ERROR';
    const code = rawCode.split(':')[0]?.trim() ?? rawCode;
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let publicMessage = 'INTERNAL_ERROR';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      publicMessage = typeof body === 'string' ? body : ((body as { message?: string }).message ?? 'HTTP_ERROR');
      if (Array.isArray(publicMessage)) publicMessage = 'VALIDATION_ERROR';
    } else if (FORBIDDEN_CODES.has(code)) {
      status = HttpStatus.FORBIDDEN;
      publicMessage = code;
    } else if (NOT_FOUND_CODES.has(code)) {
      status = HttpStatus.NOT_FOUND;
      publicMessage = code;
    } else if (BAD_REQUEST_CODES.has(code)) {
      status = HttpStatus.BAD_REQUEST;
      publicMessage = code;
    } else if (CONFLICT_CODES.has(code)) {
      status = HttpStatus.CONFLICT;
      publicMessage = code;
    } else if (SERVICE_UNAVAILABLE_CODES.has(code)) {
      status = HttpStatus.SERVICE_UNAVAILABLE;
      publicMessage = code;
    }

    if (status >= 500) {
      this.logger.error(`${request.method} ${request.path} -> ${code}`);
    }

    response.status(status).json({
      error: { code: publicMessage, requestId: request.requestId ?? null },
    });
  }
}
