import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/auth/decorators';
import { DatabaseService } from '../database/database.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly db: DatabaseService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Liveness probe' })
  live(): { status: 'ok'; module: string; maturity: string } {
    return { status: 'ok', module: 'foundation+record', maturity: 'Prototype' };
  }

  @Public()
  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe including database connectivity' })
  async ready(): Promise<{ status: 'ok' | 'unavailable'; database: string }> {
    try {
      await this.db.query('SELECT 1');
      return { status: 'ok', database: 'connected' };
    } catch {
      return { status: 'unavailable', database: 'disconnected' };
    }
  }
}
