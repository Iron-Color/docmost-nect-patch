import api from "@/lib/api-client";
import {
  ICompleteDiscordRegistration,
  ICreateDiscordRegistrationConfig,
  IDiscordRegistrationAdminInfo,
  IDiscordRegistrationConfig,
  IDiscordRegistrationSession,
  IDiscordRegistrationStatus,
} from "./discord-registration.types";

export async function getDiscordRegistrationStatus(): Promise<IDiscordRegistrationStatus> {
  const req = await api.post<IDiscordRegistrationStatus>(
    "/auth/discord-registration/status",
  );
  return req.data;
}

export async function getDiscordRegistrationAdminInfo(): Promise<IDiscordRegistrationAdminInfo> {
  const req = await api.post<IDiscordRegistrationAdminInfo>(
    "/auth/discord-registration/configs",
  );
  return req.data;
}

export async function createDiscordRegistrationConfig(
  data: ICreateDiscordRegistrationConfig,
): Promise<IDiscordRegistrationConfig> {
  const req = await api.post<IDiscordRegistrationConfig>(
    "/auth/discord-registration/configs/create",
    data,
  );
  return req.data;
}

export async function deleteDiscordRegistrationConfig(
  configId: string,
): Promise<void> {
  await api.post("/auth/discord-registration/configs/delete", { configId });
}

export async function startDiscordRegistration(): Promise<{
  authorizeUrl: string;
}> {
  const req = await api.post<{ authorizeUrl: string }>(
    "/auth/discord-registration/start",
  );
  return req.data;
}

export async function getDiscordRegistrationSession(
  token: string,
): Promise<IDiscordRegistrationSession> {
  const req = await api.post<IDiscordRegistrationSession>(
    "/auth/discord-registration/session",
    { token },
  );
  return req.data;
}

export async function completeDiscordRegistration(
  data: ICompleteDiscordRegistration,
): Promise<{ requiresLogin: boolean }> {
  const req = await api.post<{ requiresLogin: boolean }>(
    "/auth/discord-registration/complete",
    data,
  );
  return req.data;
}
