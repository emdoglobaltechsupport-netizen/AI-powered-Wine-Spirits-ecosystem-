import { PROVIDER_VERIFICATION_STATUSES } from '@emdo/shared';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
} from 'class-validator';

export class CreateProviderProfileDto {
  @IsString()
  @MinLength(2)
  professionalName!: string;

  @IsString()
  @MinLength(2)
  specialty!: string;

  @IsArray()
  @IsString({ each: true })
  languages!: string[];

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsBoolean()
  telehealthEnabled?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  consultationFee?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsString()
  @MinLength(4)
  licenceNumber!: string;

  @IsString()
  @MinLength(2)
  licenceJurisdiction!: string;

  @IsOptional()
  @IsISO8601()
  licenceExpiresAt?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  credentialReference?: string;
}

export class AddCredentialDto {
  @IsIn(['licence', 'registration', 'qualification', 'identity'])
  credentialType!: 'licence' | 'registration' | 'qualification' | 'identity';

  @IsIn(['registry', 'document', 'manual'])
  sourceType!: 'registry' | 'document' | 'manual';

  @IsString()
  @MinLength(3)
  reference!: string;

  @IsString()
  @MinLength(2)
  jurisdiction!: string;

  @IsOptional()
  @IsISO8601()
  expiresAt?: string;
}

export class TransitionProviderDto {
  @IsIn(PROVIDER_VERIFICATION_STATUSES)
  toStatus!: (typeof PROVIDER_VERIFICATION_STATUSES)[number];

  @IsString()
  @MinLength(3)
  reason!: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  evidenceRef?: string;
}

export class DecideApprovalDto {
  @IsIn(['approved', 'rejected'])
  decision!: 'approved' | 'rejected';

  @IsString()
  @MinLength(3)
  reason!: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  evidenceRef?: string;
}

export class CreateSlotDto {
  @IsISO8601()
  startsAt!: string;

  @IsISO8601()
  endsAt!: string;
}

export class BookAppointmentDto {
  @IsUUID()
  providerId!: string;

  @IsUUID()
  slotId!: string;

  @IsIn(['in_person', 'telehealth'])
  channel!: 'in_person' | 'telehealth';
}
