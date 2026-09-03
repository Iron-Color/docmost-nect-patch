import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notifications } from "@mantine/notifications";
import {
  createDiscordRegistrationConfig,
  deleteDiscordRegistrationConfig,
  getDiscordRegistrationAdminInfo,
  getDiscordRegistrationSession,
  getDiscordRegistrationStatus,
} from "./discord-registration.service";
import { ICreateDiscordRegistrationConfig } from "./discord-registration.types";
import { useTranslation } from "react-i18next";

export function useDiscordRegistrationStatusQuery() {
  return useQuery({
    queryKey: ["discord-registration-status"],
    queryFn: getDiscordRegistrationStatus,
    staleTime: 60_000,
  });
}

export function useDiscordRegistrationAdminInfoQuery() {
  return useQuery({
    queryKey: ["discord-registration-configs"],
    queryFn: getDiscordRegistrationAdminInfo,
  });
}

export function useDiscordRegistrationSessionQuery(token: string | null) {
  return useQuery({
    queryKey: ["discord-registration-session", token],
    queryFn: () => getDiscordRegistrationSession(token as string),
    enabled: Boolean(token),
    retry: false,
  });
}

export function useCreateDiscordRegistrationConfigMutation() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (data: ICreateDiscordRegistrationConfig) =>
      createDiscordRegistrationConfig(data),
    onSuccess: () => {
      notifications.show({ message: t("Discord registration rule added") });
      queryClient.invalidateQueries({
        queryKey: ["discord-registration-configs"],
      });
      queryClient.invalidateQueries({
        queryKey: ["discord-registration-status"],
      });
    },
    onError: (error) => {
      notifications.show({
        message: error["response"]?.data?.message,
        color: "red",
      });
    },
  });
}

export function useDeleteDiscordRegistrationConfigMutation() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (configId: string) => deleteDiscordRegistrationConfig(configId),
    onSuccess: () => {
      notifications.show({
        message: t("Discord registration rule removed"),
      });
      queryClient.invalidateQueries({
        queryKey: ["discord-registration-configs"],
      });
      queryClient.invalidateQueries({
        queryKey: ["discord-registration-status"],
      });
    },
    onError: (error) => {
      notifications.show({
        message: error["response"]?.data?.message,
        color: "red",
      });
    },
  });
}
