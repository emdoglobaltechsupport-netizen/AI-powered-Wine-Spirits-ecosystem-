import { IsArray, IsIn, IsISO8601, IsOptional, IsString } from 'class-validator';
import { CONSENT_PURPOSES, SUPPORTED_FHIR_RESOURCES } from '@emdo/shared';

export class ConsentScopeDto {
  @IsOptional()
  @IsArray()
  @IsIn(SUPPORTED_FHIR_RESOURCES, { each: true })
  resourceTypes?: string[];
}

export class CreateConsentDto {
  @IsString()
  granteeUserId!: string;

  @IsIn(CONSENT_PURPOSES)
  purpose!: string;

  @IsOptional()
  scope?: ConsentScopeDto;

  @IsISO8601()
  expiresAt!: string;
}
