import {
  AI_AGENT_IDS,
  AI_REASON_CODES,
  type AiReasonCode,
} from '@emdo/shared';
import {
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class AskAiDto {
  @IsIn(AI_AGENT_IDS)
  agentId!: string;

  @IsString()
  @MaxLength(100)
  capability!: string;

  @IsString()
  @MaxLength(2000)
  prompt!: string;

  @IsOptional()
  @IsUUID()
  patientId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  resourceType?: string;

  @IsOptional()
  @IsIn(['en'])
  language?: 'en';
}

export class CreateAiWorkflowDto {
  @IsIn(AI_AGENT_IDS)
  agentId!: string;

  @IsString()
  @MaxLength(100)
  capability!: string;

  @IsOptional()
  @IsUUID()
  patientId?: string;

  @IsIn(['AI_DRAFT_REVIEW', 'AI_WORKFLOW_EXECUTION'])
  action!: 'AI_DRAFT_REVIEW' | 'AI_WORKFLOW_EXECUTION';

  @IsIn(AI_REASON_CODES)
  reasonCode!: AiReasonCode;

  @IsOptional()
  @IsIn(['en'])
  language?: 'en';
}

export class DecideAiApprovalDto {
  @IsIn(['approved', 'rejected'])
  decision!: 'approved' | 'rejected';

  @IsIn(AI_REASON_CODES)
  reasonCode!: AiReasonCode;
}

export class CreateEscalationDto {
  @IsIn(AI_AGENT_IDS)
  agentId!: string;

  @IsIn(AI_REASON_CODES)
  reasonCode!: AiReasonCode;

  @IsIn(['clinician', 'support', 'compliance_officer'])
  assignedRole!: 'clinician' | 'support' | 'compliance_officer';
}

export class ResolveEscalationDto {
  @IsIn(['human_reviewed', 'information_provided', 'referred', 'closed_no_action'])
  outcomeCode!: 'human_reviewed' | 'information_provided' | 'referred' | 'closed_no_action';
}
