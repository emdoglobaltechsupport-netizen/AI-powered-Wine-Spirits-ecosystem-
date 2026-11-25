import { IsObject, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateRecordDto {
  @IsObject()
  resource!: Record<string, unknown>;
}

export class CorrectRecordDto {
  @IsObject()
  resource!: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MinLength(3)
  reason?: string;
}
