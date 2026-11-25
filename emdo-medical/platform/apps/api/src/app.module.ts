import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { APP_GUARD } from '@nestjs/core';
import { join } from 'node:path';
import configuration from './config/configuration';
import { validateEnvironment } from './config/env.validation';
import { CountryProfileService } from './config/country-profile.service';
import { DatabaseService } from './database/database.service';
import { CryptoService } from './common/crypto/crypto.service';
import { PasswordService } from './common/crypto/password.service';
import { AuditService } from './common/audit/audit.service';
import { AuthGuard } from './common/auth/auth.guard';
import { CountryGuard } from './common/auth/country.guard';
import { PermissionsGuard } from './common/auth/permissions.guard';
import { IdentityService } from './identity/identity.service';
import { IdentityController } from './identity/identity.controller';
import { ConsentService } from './consent/consent.service';
import { ConsentController } from './consent/consent.controller';
import { RecordService } from './record/record.service';
import { RecordController } from './record/record.controller';
import { HealthController } from './health/health.controller';
import { AuditController } from './common/audit/audit.controller';
import { VerificationService } from './provider/verification.service';
import { VerificationController } from './provider/verification.controller';
import { ApprovalController } from './provider/approval.controller';
import { DirectoryService } from './provider/directory.service';
import { DirectoryController } from './provider/directory.controller';
import { AppointmentService } from './provider/appointment.service';
import { AppointmentController } from './provider/appointment.controller';
import { AiPermissionService } from './ai/permission.service';
import { AiContextService } from './ai/context.service';
import { ModelGateway } from './ai/model-gateway';
import { AiAuditService } from './ai/ai-audit.service';
import { AiAssistantService } from './ai/assistant.service';
import { AiWorkflowService } from './ai/workflow.service';
import { AiEscalationService } from './ai/escalation.service';
import { AiMonitoringService } from './ai/monitoring.service';
import { AiController } from './ai/ai.controller';
import { AiMonitoringController } from './ai/ai-monitoring.controller';
import { InsightPermissionService } from './insight/insight-permissions';
import { InsightService } from './insight/insight.service';
import { InsightController } from './insight/insight.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnvironment,
      envFilePath: [join(process.cwd(), '.env'), join(process.cwd(), '../../.env')],
    }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('jwtAccessSecret'),
      }),
    }),
  ],
  controllers: [
    IdentityController, ConsentController, RecordController, HealthController, AuditController,
    VerificationController, ApprovalController, DirectoryController, AppointmentController,
    AiController, AiMonitoringController, InsightController,
  ],
  providers: [
    DatabaseService,
    CountryProfileService,
    CryptoService,
    PasswordService,
    AuditService,
    IdentityService,
    ConsentService,
    RecordService,
    VerificationService,
    DirectoryService,
    AppointmentService,
    AiPermissionService,
    AiContextService,
    ModelGateway,
    AiAuditService,
    AiAssistantService,
    AiWorkflowService,
    AiEscalationService,
    AiMonitoringService,
    InsightPermissionService,
    InsightService,
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: CountryGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
