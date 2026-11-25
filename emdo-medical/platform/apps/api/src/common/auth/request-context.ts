import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Role } from '@emdo/shared';

export const CONTEXT_KEY = 'emdoContext';

export interface RequestContext {
  userId: string;
  tenantId: string;
  countryCode: string;
  roles: Role[];
  assurance: number;
  authTime: number;
  jti: string;
  isPlatform: boolean;
}

export const Ctx = createParamDecorator(
  (_data: unknown, host: ExecutionContext): RequestContext => {
    const request = host.switchToHttp().getRequest<Record<string, unknown>>();
    return request[CONTEXT_KEY] as RequestContext;
  },
);
