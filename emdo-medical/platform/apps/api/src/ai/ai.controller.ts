import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Ctx, RequestContext } from '../common/auth/request-context';
import { RequireRoles } from '../common/auth/decorators';
import { PermissionsGuard } from '../common/auth/permissions.guard';
import { listAgents } from './agent-registry';
import { listPrompts } from './prompt-registry';
import { AiAssistantService } from './assistant.service';
import { AiWorkflowService } from './workflow.service';
import { AiEscalationService } from './escalation.service';
import {
  AskAiDto, CreateAiWorkflowDto, DecideAiApprovalDto,
  CreateEscalationDto, ResolveEscalationDto,
} from './dto/ai.dto';

@ApiTags('emdo-assist')
@ApiBearerAuth()
@Controller('v1/ai')
export class AiController {
  constructor(
    private readonly assistant: AiAssistantService,
    private readonly workflows: AiWorkflowService,
    private readonly escalations: AiEscalationService,
  ) {}

  @Get('agents')
  @ApiOperation({ summary: 'List all registered AI agents and their enabled state' })
  agents() {
    return listAgents();
  }

  @Get('prompts')
  @UseGuards(PermissionsGuard)
  @RequireRoles('compliance_officer', 'auditor', 'platform_admin')
  @ApiOperation({ summary: 'List code-reviewed, versioned prompt definitions' })
  prompts() {
    return listPrompts();
  }

  @Post('ask')
  @UseGuards(PermissionsGuard)
  @RequireRoles('patient', 'caregiver', 'clinician')
  @ApiOperation({ summary: 'Ask an enabled AI agent; returns a labelled response with source references' })
  ask(@Ctx() ctx: RequestContext, @Body() dto: AskAiDto) {
    return this.assistant.ask(ctx, dto);
  }

  @Post('workflows')
  @UseGuards(PermissionsGuard)
  @RequireRoles('clinician')
  @ApiOperation({ summary: 'Request named human review of a draft; no autonomous execution' })
  createWorkflow(@Ctx() ctx: RequestContext, @Body() dto: CreateAiWorkflowDto) {
    return this.workflows.create(ctx, dto);
  }

  @Post('approvals/:id/decision')
  @HttpCode(HttpStatus.OK)
  @UseGuards(PermissionsGuard)
  @RequireRoles('clinician', 'compliance_officer')
  @ApiOperation({ summary: 'Record a named second-person decision on an AI action' })
  decideApproval(@Ctx() ctx: RequestContext, @Param('id') id: string, @Body() dto: DecideAiApprovalDto) {
    return this.workflows.decide(ctx, id, dto);
  }

  @Post('escalations')
  @UseGuards(PermissionsGuard)
  @RequireRoles('patient', 'caregiver', 'clinician', 'support', 'compliance_officer')
  @ApiOperation({ summary: 'Escalate to a named human role without autonomous action' })
  createEscalation(@Ctx() ctx: RequestContext, @Body() dto: CreateEscalationDto) {
    return this.escalations.create(ctx, dto);
  }

  @Get('escalations')
  @UseGuards(PermissionsGuard)
  @RequireRoles('patient', 'caregiver', 'clinician', 'support', 'compliance_officer')
  @ApiOperation({ summary: 'List escalations visible to the authenticated human' })
  listEscalations(@Ctx() ctx: RequestContext) {
    return this.escalations.list(ctx);
  }

  @Post('escalations/:id/resolve')
  @HttpCode(HttpStatus.OK)
  @UseGuards(PermissionsGuard)
  @RequireRoles('clinician', 'support', 'compliance_officer')
  @ApiOperation({ summary: 'Resolve an owned escalation with a code; no free-text PHI is stored' })
  resolveEscalation(@Ctx() ctx: RequestContext, @Param('id') id: string, @Body() dto: ResolveEscalationDto) {
    return this.escalations.resolve(ctx, id, dto);
  }
}
