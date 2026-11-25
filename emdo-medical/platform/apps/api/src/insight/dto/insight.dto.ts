import { IsIn, IsOptional, IsString, Matches } from 'class-validator';
import {
  INSIGHT_REPORT_CADENCES,
  INSIGHT_REPORT_IDS,
  type InsightReportCadence,
  type InsightReportId,
} from '@emdo/shared';

export class InsightCountryQueryDto {
  @IsOptional()
  @IsString()
  @Matches(/^(ALL|[A-Z]{2,8})$/i, { message: 'country must be ALL or an uppercase country code' })
  country?: string;
}

export class GenerateInsightReportDto extends InsightCountryQueryDto {
  @IsIn(INSIGHT_REPORT_IDS)
  reportId!: InsightReportId;

  @IsIn(INSIGHT_REPORT_CADENCES)
  cadence!: InsightReportCadence;

  @IsString()
  @Matches(/^\d{4}-\d{2}(?:-\d{2})?$/, { message: 'period must be YYYY-MM or YYYY-MM-DD' })
  period!: string;
}
