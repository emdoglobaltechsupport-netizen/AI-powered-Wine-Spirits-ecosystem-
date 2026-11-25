import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Role } from '@emdo/shared';
import { ROLES_KEY } from './decorators';
import { CONTEXT_KEY, RequestContext } from './request-context';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest<{ [key: string]: unknown }>();
    const ctx = request[CONTEXT_KEY] as RequestContext | undefined;
    if (!ctx) throw new ForbiddenException('INSUFFICIENT_ROLE');
    if (ctx.isPlatform) return true;
    if (!required.some((role) => ctx.roles.includes(role))) throw new ForbiddenException('INSUFFICIENT_ROLE');
    return true;
  }
}
