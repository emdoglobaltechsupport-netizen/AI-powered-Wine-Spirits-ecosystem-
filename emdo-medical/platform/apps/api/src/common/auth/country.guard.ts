import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CountryProfileService } from '../../config/country-profile.service';
import { IS_PUBLIC_KEY } from './decorators';
import { CONTEXT_KEY, RequestContext } from './request-context';

/** Fail-closed country gate. No activated country exists in this repository. */
@Injectable()
export class CountryGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly profiles: CountryProfileService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<{ path: string; [key: string]: unknown }>();
    if (request.path.startsWith('/api/docs')) return true;

    const ctx = request[CONTEXT_KEY] as RequestContext | undefined;
    if (!ctx) return true; // AuthGuard owns unauthenticated rejection.

    try {
      this.profiles.assertUsable(ctx.countryCode);
      return true;
    } catch {
      throw new ForbiddenException('COUNTRY_PROFILE_NOT_USABLE');
    }
  }
}
