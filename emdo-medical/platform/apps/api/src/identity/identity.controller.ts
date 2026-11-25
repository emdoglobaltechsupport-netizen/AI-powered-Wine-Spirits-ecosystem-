import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Ctx, RequestContext } from '../common/auth/request-context';
import { Public } from '../common/auth/decorators';
import { RequireRoles } from '../common/auth/decorators';
import { PermissionsGuard } from '../common/auth/permissions.guard';
import { IdentityService, TokenPair } from './identity.service';
import { CreateUserDto, LoginDto, RefreshDto, RegisterDto } from './dto/auth.dto';

@ApiTags('identity')
@Controller('v1/identity')
export class IdentityController {
  constructor(private readonly identity: IdentityService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a patient account in a usable country profile' })
  register(@Body() dto: RegisterDto) {
    return this.identity.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate and receive access + refresh tokens' })
  login(@Body() dto: LoginDto): Promise<TokenPair> {
    return this.identity.login(dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate a refresh token and receive a new token pair' })
  refresh(@Body() dto: RefreshDto): Promise<TokenPair> {
    return this.identity.refresh(dto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke a refresh token' })
  async logout(@Body() dto: RefreshDto, @Ctx() ctx: RequestContext): Promise<{ revoked: true }> {
    await this.identity.logout(dto.refreshToken);
    return { revoked: true };
  }

  @UseGuards(PermissionsGuard)
  @RequireRoles('platform_admin')
  @Post('users')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a staff account (platform administrator only)' })
  createStaff(@Body() dto: CreateUserDto, @Ctx() ctx: RequestContext) {
    return this.identity.createStaff(dto, ctx.userId);
  }
}
