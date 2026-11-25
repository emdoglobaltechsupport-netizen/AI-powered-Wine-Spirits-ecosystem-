import { SetMetadata } from '@nestjs/common';
import type { Role } from '@emdo/shared';

export const IS_PUBLIC_KEY = 'emdo:public';
export const ROLES_KEY = 'emdo:roles';

export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
export const RequireRoles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
