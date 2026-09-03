export interface IDiscordRegistrationStatus {
  enabled: boolean;
}

export interface IDiscordRegistrationConfig {
  id: string;
  label: string;
  guildId: string;
  roleId: string;
  createdAt: Date;
}

export interface IDiscordRegistrationAdminInfo {
  oauthConfigured: boolean;
  callbackUrl: string;
  configs: IDiscordRegistrationConfig[];
}

export interface IDiscordRegistrationSession {
  name: string;
  email: string;
  expiresAt: Date;
}

export interface ICreateDiscordRegistrationConfig {
  label: string;
  guildId: string;
  roleId: string;
}

export interface ICompleteDiscordRegistration {
  token: string;
  name: string;
  password: string;
}
