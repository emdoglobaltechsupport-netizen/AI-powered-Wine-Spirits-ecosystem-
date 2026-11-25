import { IsArray, IsIn, IsOptional, IsString, Matches, MinLength } from 'class-validator';
import { ROLES, Role } from '@emdo/shared';

export class RegisterDto {
  @IsIn(['email', 'phone'])
  identifierType!: 'email' | 'phone';

  @IsString()
  @MinLength(5)
  identifier!: string;

  @IsString()
  @MinLength(12)
  password!: string;

  @IsString()
  @Matches(/^[A-Z]{2,8}$/, { message: 'countryCode must be an uppercase ISO-like code' })
  countryCode!: string;
}

export class LoginDto {
  @IsString()
  identifier!: string;

  @IsString()
  password!: string;
}

export class RefreshDto {
  @IsString()
  refreshToken!: string;
}

export class CreateUserDto {
  @IsString()
  @MinLength(5)
  identifier!: string;

  @IsString()
  @MinLength(12)
  password!: string;

  @IsString()
  @Matches(/^[A-Z]{2,8}$/)
  countryCode!: string;

  @IsArray()
  @IsIn(ROLES, { each: true })
  roles!: Role[];

  @IsOptional()
  @IsString()
  scopeTenantId?: string;
}
