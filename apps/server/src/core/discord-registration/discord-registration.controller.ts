import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { FastifyReply } from 'fastify';
import { SkipThrottle, ThrottlerGuard } from '@nestjs/throttler';
import { DiscordRegistrationService } from './discord-registration.service';
import {
  CompleteDiscordRegistrationDto,
  CreateDiscordRegistrationConfigDto,
  DeleteDiscordRegistrationConfigDto,
  DiscordOAuthCallbackDto,
  DiscordRegistrationTokenDto,
} from './discord-registration.dto';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthWorkspace } from '../../common/decorators/auth-workspace.decorator';
import { AuthUser } from '../../common/decorators/auth-user.decorator';
import { User, Workspace } from '@docmost/db/types/entity.types';
import WorkspaceAbilityFactory from '../casl/abilities/workspace-ability.factory';
import {
  WorkspaceCaslAction,
  WorkspaceCaslSubject,
} from '../casl/interfaces/workspace-ability.type';
import { SessionService } from '../session/session.service';
import { EnvironmentService } from '../../integrations/environment/environment.service';
import {
  ALL_NAMED_THROTTLERS_SKIPPED,
  AUTH_THROTTLER,
} from '../../integrations/throttle/throttler-names';
import { SkipTransform } from '../../common/decorators/skip-transform.decorator';
import { DomainService } from '../../integrations/environment/domain.service';

@SkipThrottle({ ...ALL_NAMED_THROTTLERS_SKIPPED, [AUTH_THROTTLER]: false })
@UseGuards(JwtAuthGuard, ThrottlerGuard)
@Controller('auth/discord-registration')
export class DiscordRegistrationController {
  constructor(
    private readonly discordRegistrationService: DiscordRegistrationService,
    private readonly workspaceAbility: WorkspaceAbilityFactory,
    private readonly sessionService: SessionService,
    private readonly environmentService: EnvironmentService,
    private readonly domainService: DomainService,
  ) {}

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('status')
  async status(@AuthWorkspace() workspace: Workspace) {
    return this.discordRegistrationService.getPublicStatus(workspace);
  }

  @Post('configs')
  @HttpCode(HttpStatus.OK)
  async configs(@AuthUser() user: User, @AuthWorkspace() workspace: Workspace) {
    this.assertCanManage(user, workspace);
    return this.discordRegistrationService.getAdminInfo(workspace);
  }

  @Post('configs/create')
  @HttpCode(HttpStatus.OK)
  async createConfig(
    @Body() dto: CreateDiscordRegistrationConfigDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    this.assertCanManage(user, workspace);
    return this.discordRegistrationService.createConfig(
      dto,
      workspace.id,
      user.id,
    );
  }

  @Post('configs/delete')
  @HttpCode(HttpStatus.OK)
  async deleteConfig(
    @Body() dto: DeleteDiscordRegistrationConfigDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    this.assertCanManage(user, workspace);
    await this.discordRegistrationService.deleteConfig(
      dto.configId,
      workspace.id,
    );
  }

  @Public()
  @Post('start')
  @HttpCode(HttpStatus.OK)
  async start(@AuthWorkspace() workspace: Workspace) {
    return this.discordRegistrationService.start(workspace);
  }

  @Public()
  @Get('callback')
  @SkipTransform()
  async callback(
    @Query() query: DiscordOAuthCallbackDto,
    @AuthWorkspace() workspace: Workspace,
    @Res() res: FastifyReply,
  ) {
    const registrationPage = `${this.domainService.getUrl(workspace.hostname)}/register/discord`;

    if (query.error || !query.code) {
      return res.redirect(
        `${registrationPage}?error=oauth_denied`,
        HttpStatus.FOUND,
      );
    }

    try {
      const token = await this.discordRegistrationService.handleCallback(
        query.code,
        query.state,
        workspace,
      );
      return res.redirect(
        `${registrationPage}#token=${encodeURIComponent(token)}`,
        HttpStatus.FOUND,
      );
    } catch (error) {
      const reason =
        error instanceof ForbiddenException ? 'not_eligible' : 'oauth_failed';
      return res.redirect(
        `${registrationPage}?error=${reason}`,
        HttpStatus.FOUND,
      );
    }
  }

  @Public()
  @Post('session')
  @HttpCode(HttpStatus.OK)
  async session(
    @Body() dto: DiscordRegistrationTokenDto,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.discordRegistrationService.getRegistrationSession(
      dto.token,
      workspace.id,
    );
  }

  @Public()
  @Post('complete')
  @HttpCode(HttpStatus.OK)
  async complete(
    @Body() dto: CompleteDiscordRegistrationDto,
    @AuthWorkspace() workspace: Workspace,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const user = await this.discordRegistrationService.complete(dto, workspace);

    if (workspace.enforceMfa) {
      return { requiresLogin: true };
    }

    const authToken = await this.sessionService.createSessionAndToken(user);
    res.setCookie('authToken', authToken, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      expires: this.environmentService.getCookieExpiresIn(),
      secure: this.environmentService.isHttps(),
    });

    return { requiresLogin: false };
  }

  private assertCanManage(user: User, workspace: Workspace): void {
    const ability = this.workspaceAbility.createForUser(user, workspace);
    if (
      ability.cannot(WorkspaceCaslAction.Manage, WorkspaceCaslSubject.Settings)
    ) {
      throw new ForbiddenException();
    }
  }
}
