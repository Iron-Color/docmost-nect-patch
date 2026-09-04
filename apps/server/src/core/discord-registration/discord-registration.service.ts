import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { InjectKysely } from 'nestjs-kysely';
import { KyselyDB } from '@docmost/db/types/kysely.types';
import { UserRepo } from '@docmost/db/repos/user/user.repo';
import { GroupUserRepo } from '@docmost/db/repos/group/group-user.repo';
import { executeTx } from '@docmost/db/utils';
import { User, Workspace } from '@docmost/db/types/entity.types';
import { EnvironmentService } from '../../integrations/environment/environment.service';
import { DomainService } from '../../integrations/environment/domain.service';
import { UserRole } from '../../common/helpers/types/permission';
import { getWorkspaceDefaultPageEditMode } from '../workspace/workspace.util';
import {
  validateAllowedEmail,
  validateSsoEnforcement,
} from '../auth/auth.util';
import {
  CreateDiscordRegistrationConfigDto,
  CompleteDiscordRegistrationDto,
} from './discord-registration.dto';
import { AuditEvent, AuditResource } from '../../common/events/audit-events';
import {
  AUDIT_SERVICE,
  IAuditService,
} from '../../integrations/audit/audit.service';
import {
  DiscordRegistrationRule,
  findMatchingDiscordRegistrationRule,
} from './discord-registration.util';

const DISCORD_API_URL = 'https://discord.com/api/v10';
const REGISTRATION_TTL_MS = 10 * 60 * 1000;
const MAX_REGISTRATION_RULES = 50;

type DiscordUserResponse = {
  id?: string;
  username?: string;
  global_name?: string | null;
  email?: string | null;
  verified?: boolean;
};

type DiscordMemberResponse = {
  roles?: string[];
};

@Injectable()
export class DiscordRegistrationService {
  private readonly logger = new Logger(DiscordRegistrationService.name);

  constructor(
    private readonly environmentService: EnvironmentService,
    private readonly domainService: DomainService,
    private readonly userRepo: UserRepo,
    private readonly groupUserRepo: GroupUserRepo,
    @InjectKysely() private readonly db: KyselyDB,
    @Inject(AUDIT_SERVICE) private readonly auditService: IAuditService,
  ) {}

  async getPublicStatus(workspace: Workspace) {
    const config = await this.db
      .selectFrom('discordRegistrationConfigs')
      .select('id')
      .where('workspaceId', '=', workspace.id)
      .executeTakeFirst();

    return {
      enabled:
        this.environmentService.isSelfHosted() &&
        this.hasOAuthCredentials() &&
        !workspace.enforceSso &&
        Boolean(config),
    };
  }

  async getAdminInfo(workspace: Workspace) {
    const configs = await this.db
      .selectFrom('discordRegistrationConfigs')
      .select([
        'id',
        'label',
        'guildId',
        'roleIds',
        'roleMatchMode',
        'createdAt',
      ])
      .where('workspaceId', '=', workspace.id)
      .orderBy('createdAt', 'asc')
      .execute();

    return {
      oauthConfigured: this.hasOAuthCredentials(),
      callbackUrl: this.getCallbackUrl(workspace),
      configs,
    };
  }

  async createConfig(
    dto: CreateDiscordRegistrationConfigDto,
    workspaceId: string,
    creatorId: string,
  ) {
    const existingCount = await this.db
      .selectFrom('discordRegistrationConfigs')
      .select((eb) => eb.fn.countAll<number>().as('count'))
      .where('workspaceId', '=', workspaceId)
      .executeTakeFirstOrThrow();

    if (Number(existingCount.count) >= MAX_REGISTRATION_RULES) {
      throw new BadRequestException(
        `You cannot configure more than ${MAX_REGISTRATION_RULES} Discord registration rules`,
      );
    }

    const roleIds = [...dto.roleIds].sort();

    try {
      const config = await this.db
        .insertInto('discordRegistrationConfigs')
        .values({
          label: dto.label,
          guildId: dto.guildId,
          roleIds,
          roleMatchMode: dto.roleMatchMode,
          creatorId,
          workspaceId,
        })
        .returning([
          'id',
          'label',
          'guildId',
          'roleIds',
          'roleMatchMode',
          'createdAt',
        ])
        .executeTakeFirstOrThrow();

      this.auditService.log({
        event: AuditEvent.DISCORD_REGISTRATION_CONFIG_CREATED,
        resourceType: AuditResource.DISCORD_REGISTRATION_CONFIG,
        resourceId: config.id,
        changes: {
          after: {
            label: config.label,
            guildId: config.guildId,
            roleIds: config.roleIds,
            roleMatchMode: config.roleMatchMode,
          },
        },
      });

      return config;
    } catch (error: any) {
      if (error?.code === '23505') {
        throw new BadRequestException(
          'This Discord server, role set, and match mode rule already exists',
        );
      }
      throw error;
    }
  }

  async deleteConfig(configId: string, workspaceId: string): Promise<void> {
    const config = await this.db
      .deleteFrom('discordRegistrationConfigs')
      .where('id', '=', configId)
      .where('workspaceId', '=', workspaceId)
      .returning(['id', 'label', 'guildId', 'roleIds', 'roleMatchMode'])
      .executeTakeFirst();

    if (!config) {
      throw new NotFoundException('Discord registration rule not found');
    }

    this.auditService.log({
      event: AuditEvent.DISCORD_REGISTRATION_CONFIG_DELETED,
      resourceType: AuditResource.DISCORD_REGISTRATION_CONFIG,
      resourceId: config.id,
      changes: {
        before: {
          label: config.label,
          guildId: config.guildId,
          roleIds: config.roleIds,
          roleMatchMode: config.roleMatchMode,
        },
      },
    });
  }

  async start(workspace: Workspace): Promise<{ authorizeUrl: string }> {
    this.assertFeatureAvailable(workspace);

    const hasRule = await this.db
      .selectFrom('discordRegistrationConfigs')
      .select('id')
      .where('workspaceId', '=', workspace.id)
      .executeTakeFirst();

    if (!hasRule) {
      throw new BadRequestException('Discord registration is not enabled');
    }

    const state = this.generateOpaqueToken();
    const now = new Date();

    await executeTx(this.db, async (trx) => {
      await trx
        .deleteFrom('discordRegistrationAttempts')
        .where('expiresAt', '<', now)
        .execute();

      await trx
        .insertInto('discordRegistrationAttempts')
        .values({
          stateHash: this.hashToken(state),
          workspaceId: workspace.id,
          expiresAt: new Date(now.getTime() + REGISTRATION_TTL_MS),
        })
        .execute();
    });

    const params = new URLSearchParams({
      client_id: this.environmentService.getDiscordOAuthClientId(),
      response_type: 'code',
      redirect_uri: this.getCallbackUrl(workspace),
      scope: 'identify email guilds.members.read',
      state,
    });

    return {
      authorizeUrl: `https://discord.com/oauth2/authorize?${params.toString()}`,
    };
  }

  async handleCallback(
    code: string,
    state: string,
    workspace: Workspace,
  ): Promise<string> {
    this.assertFeatureAvailable(workspace);

    const attempt = await this.db
      .selectFrom('discordRegistrationAttempts')
      .selectAll()
      .where('stateHash', '=', this.hashToken(state))
      .where('workspaceId', '=', workspace.id)
      .where('completedAt', 'is', null)
      .executeTakeFirst();

    if (!attempt || attempt.expiresAt <= new Date()) {
      throw new BadRequestException('Discord registration session expired');
    }

    const accessToken = await this.exchangeAuthorizationCode(code, workspace);
    const discordUser = await this.getDiscordUser(accessToken);

    if (
      !discordUser.id ||
      !discordUser.email ||
      discordUser.verified !== true
    ) {
      throw new BadRequestException(
        'A verified email address is required on your Discord account',
      );
    }

    const configs = await this.db
      .selectFrom('discordRegistrationConfigs')
      .select(['id', 'guildId', 'roleIds', 'roleMatchMode'])
      .where('workspaceId', '=', workspace.id)
      .execute();

    const matchedConfig = await this.findMatchingConfig(accessToken, configs);
    if (!matchedConfig) {
      throw new ForbiddenException(
        'Your Discord account does not have an allowed server role',
      );
    }

    const existingLink = await this.db
      .selectFrom('discordAccountLinks')
      .select('id')
      .where('workspaceId', '=', workspace.id)
      .where('discordUserId', '=', discordUser.id)
      .executeTakeFirst();
    if (existingLink) {
      throw new BadRequestException(
        'This Discord account is already linked to a Docmost account',
      );
    }

    const registrationToken = this.generateOpaqueToken();
    const updated = await this.db
      .updateTable('discordRegistrationAttempts')
      .set({
        stateHash: null,
        registrationTokenHash: this.hashToken(registrationToken),
        discordUserId: discordUser.id,
        discordEmail: discordUser.email.toLowerCase(),
        discordName:
          discordUser.global_name || discordUser.username || 'Discord member',
        matchedConfigId: matchedConfig.id,
        verifiedAt: new Date(),
        expiresAt: new Date(Date.now() + REGISTRATION_TTL_MS),
      })
      .where('id', '=', attempt.id)
      .where('stateHash', 'is not', null)
      .returning('id')
      .executeTakeFirst();

    if (!updated) {
      throw new BadRequestException('Discord registration session was used');
    }

    return registrationToken;
  }

  async getRegistrationSession(token: string, workspaceId: string) {
    const attempt = await this.getVerifiedAttempt(token, workspaceId);
    return {
      name: attempt.discordName,
      email: attempt.discordEmail,
      expiresAt: attempt.expiresAt,
    };
  }

  async complete(
    dto: CompleteDiscordRegistrationDto,
    workspace: Workspace,
  ): Promise<User> {
    validateSsoEnforcement(workspace);

    let newUser: User;

    try {
      await executeTx(this.db, async (trx) => {
        const attempt = await trx
          .selectFrom('discordRegistrationAttempts')
          .selectAll()
          .where('registrationTokenHash', '=', this.hashToken(dto.token))
          .where('workspaceId', '=', workspace.id)
          .where('completedAt', 'is', null)
          .forUpdate()
          .executeTakeFirst();

        if (
          !attempt ||
          !attempt.verifiedAt ||
          !attempt.discordUserId ||
          !attempt.discordEmail ||
          !attempt.matchedConfigId ||
          attempt.expiresAt <= new Date()
        ) {
          throw new BadRequestException(
            'Discord registration session is invalid or expired',
          );
        }

        const matchedConfig = await trx
          .selectFrom('discordRegistrationConfigs')
          .select(['guildId', 'roleIds', 'roleMatchMode'])
          .where('id', '=', attempt.matchedConfigId)
          .where('workspaceId', '=', workspace.id)
          .executeTakeFirst();
        if (!matchedConfig) {
          throw new ForbiddenException(
            'The Discord registration rule is no longer active',
          );
        }

        validateAllowedEmail(attempt.discordEmail, workspace);

        const existingUser = await this.userRepo.findByEmail(
          attempt.discordEmail,
          workspace.id,
          { trx },
        );
        if (existingUser) {
          throw new BadRequestException(
            'An account with this email already exists in this workspace',
          );
        }

        const existingDiscordLink = await trx
          .selectFrom('discordAccountLinks')
          .select('id')
          .where('workspaceId', '=', workspace.id)
          .where('discordUserId', '=', attempt.discordUserId)
          .executeTakeFirst();
        if (existingDiscordLink) {
          throw new BadRequestException(
            'This Discord account is already linked to a Docmost account',
          );
        }

        newUser = await this.userRepo.insertUser(
          {
            name: dto.name,
            email: attempt.discordEmail,
            emailVerifiedAt: new Date(),
            password: dto.password,
            role: UserRole.MEMBER,
            workspaceId: workspace.id,
          },
          trx,
          { pageEditMode: getWorkspaceDefaultPageEditMode(workspace) },
        );

        await this.groupUserRepo.addUserToDefaultGroup(
          newUser.id,
          workspace.id,
          trx,
        );

        await trx
          .insertInto('discordAccountLinks')
          .values({
            discordUserId: attempt.discordUserId,
            guildId: matchedConfig.guildId,
            roleIds: matchedConfig.roleIds,
            roleMatchMode: matchedConfig.roleMatchMode,
            userId: newUser.id,
            workspaceId: workspace.id,
          })
          .execute();

        await trx
          .updateTable('discordRegistrationAttempts')
          .set({ completedAt: new Date(), registrationTokenHash: null })
          .where('id', '=', attempt.id)
          .execute();
      });
    } catch (error: any) {
      if (
        error instanceof BadRequestException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      if (error?.code === '23505') {
        throw new BadRequestException(
          'This Discord account or email is already registered',
        );
      }
      this.logger.error('Failed to complete Discord registration', error);
      throw new BadRequestException('Failed to create account');
    }

    this.auditService.log({
      event: AuditEvent.USER_CREATED,
      resourceType: AuditResource.USER,
      resourceId: newUser.id,
      changes: {
        after: {
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
        },
      },
      metadata: {
        source: 'discord_registration',
      },
    });

    return newUser;
  }

  private async getVerifiedAttempt(token: string, workspaceId: string) {
    const attempt = await this.db
      .selectFrom('discordRegistrationAttempts')
      .select([
        'discordEmail',
        'discordName',
        'discordUserId',
        'expiresAt',
        'verifiedAt',
      ])
      .where('registrationTokenHash', '=', this.hashToken(token))
      .where('workspaceId', '=', workspaceId)
      .where('completedAt', 'is', null)
      .executeTakeFirst();

    if (!attempt || !attempt.verifiedAt || attempt.expiresAt <= new Date()) {
      throw new BadRequestException(
        'Discord registration session is invalid or expired',
      );
    }

    return attempt;
  }

  private async exchangeAuthorizationCode(
    code: string,
    workspace: Workspace,
  ): Promise<string> {
    const response = await fetch(`${DISCORD_API_URL}/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.environmentService.getDiscordOAuthClientId(),
        client_secret: this.environmentService.getDiscordOAuthClientSecret(),
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.getCallbackUrl(workspace),
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      this.logger.warn(`Discord token exchange failed (${response.status})`);
      throw new BadRequestException('Discord authorization failed');
    }

    const payload = (await response.json()) as { access_token?: string };
    if (!payload.access_token) {
      throw new BadRequestException('Discord authorization failed');
    }
    return payload.access_token;
  }

  private async getDiscordUser(
    accessToken: string,
  ): Promise<DiscordUserResponse> {
    const response = await fetch(`${DISCORD_API_URL}/users/@me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      throw new BadRequestException('Could not read your Discord profile');
    }
    return (await response.json()) as DiscordUserResponse;
  }

  private async findMatchingConfig(
    accessToken: string,
    configs: DiscordRegistrationRule[],
  ): Promise<DiscordRegistrationRule | null> {
    const configsByGuild = new Map<string, DiscordRegistrationRule[]>();
    for (const config of configs) {
      const rules = configsByGuild.get(config.guildId) ?? [];
      rules.push(config);
      configsByGuild.set(config.guildId, rules);
    }

    for (const [guildId, rules] of configsByGuild) {
      const response = await fetch(
        `${DISCORD_API_URL}/users/@me/guilds/${guildId}/member`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: AbortSignal.timeout(10_000),
        },
      );

      if (!response.ok) {
        continue;
      }

      const member = (await response.json()) as DiscordMemberResponse;
      const match = findMatchingDiscordRegistrationRule(
        guildId,
        member.roles ?? [],
        rules,
      );
      if (match) {
        return match;
      }
    }

    return null;
  }

  private assertFeatureAvailable(workspace: Workspace): void {
    if (!this.environmentService.isSelfHosted()) {
      throw new ForbiddenException(
        'Discord registration is only available for self-hosted workspaces',
      );
    }
    if (!this.hasOAuthCredentials()) {
      throw new BadRequestException('Discord OAuth is not configured');
    }
    validateSsoEnforcement(workspace);
  }

  private hasOAuthCredentials(): boolean {
    return Boolean(
      this.environmentService.getDiscordOAuthClientId() &&
      this.environmentService.getDiscordOAuthClientSecret(),
    );
  }

  private getCallbackUrl(workspace: Workspace): string {
    return `${this.domainService.getUrl(workspace.hostname)}/api/auth/discord-registration/callback`;
  }

  private generateOpaqueToken(): string {
    return randomBytes(32).toString('base64url');
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
