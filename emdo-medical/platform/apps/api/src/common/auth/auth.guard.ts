import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Role } from '@emdo/shared';
import { CONTEXT_KEY, RequestContext } from './request-context';
import { IS_PUBLIC_KEY } from './decorators';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const request = context.switchToHttp().getRequest<{ path: string; headers: Record<string, string | undefined>; [key: string]: unknown }>();

    if (isPublic || request.path.startsWith('/api/docs')) return true;

    const header = request.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) throw new UnauthorizedException('AUTH_REQUIRED');

    let payload: Record<string, unknown>;
    try {
      payload = await this.jwt.verifyAsync<Record<string, unknown>>(header.slice(7), {
        secret: this.config.getOrThrow<string>('jwtAccessSecret'),
      });
    } catch {
      throw new UnauthorizedException('INVALID_OR_EXPIRED_TOKEN');
    }

    const ctx: RequestContext = {
      userId: String(payload.sub ?? ''),
      tenantId: String(payload.tenantId ?? ''),
      countryCode: String(payload.countryCode ?? ''),
      roles: Array.isArray(payload.roles) ? (payload.roles as Role[]) : [],
      assurance: Number(payload.assurance ?? 1),
      authTime: Number(payload.authTime ?? 0),
      jti: String(payload.jti ?? ''),
      isPlatform: (payload.roles as Role[] | undefined)?.includes('platform_admin') ?? false,
    };

    if (!ctx.userId || !ctx.tenantId || !ctx.countryCode || ctx.roles.length === 0) {
      throw new UnauthorizedException('MALFORMED_TOKEN');
    }

    request[CONTEXT_KEY] = ctx;
    return true;
  }
}
