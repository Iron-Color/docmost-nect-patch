import {
  ActionIcon,
  Alert,
  Button,
  Code,
  Group,
  Loader,
  Paper,
  SegmentedControl,
  Stack,
  Table,
  TagsInput,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { modals } from "@mantine/modals";
import {
  IconBrandDiscord,
  IconInfoCircle,
  IconTrash,
} from "@tabler/icons-react";
import { zod4Resolver } from "mantine-form-zod-resolver";
import { z } from "zod/v4";
import { useTranslation } from "react-i18next";
import SettingsTitle from "@/components/settings/settings-title";
import { DocumentTitle } from "@/components/ui/document-title";
import { CopyButton } from "@/components/common/copy-button";
import {
  useCreateDiscordRegistrationConfigMutation,
  useDeleteDiscordRegistrationConfigMutation,
  useDiscordRegistrationAdminInfoQuery,
} from "@/features/discord-registration/discord-registration.query";

const snowflakePattern = /^\d{17,20}$/;
const formSchema = z.object({
  label: z.string().trim().min(1).max(60),
  guildId: z.string().regex(snowflakePattern),
  roleIds: z
    .array(z.string().regex(snowflakePattern))
    .min(1)
    .max(10)
    .refine((roleIds) => new Set(roleIds).size === roleIds.length),
  roleMatchMode: z.enum(["any", "all"]),
});

type FormValues = z.infer<typeof formSchema>;

export default function DiscordRegistrationSettings() {
  const { t } = useTranslation();
  const infoQuery = useDiscordRegistrationAdminInfoQuery();
  const createMutation = useCreateDiscordRegistrationConfigMutation();
  const deleteMutation = useDeleteDiscordRegistrationConfigMutation();
  const form = useForm<FormValues>({
    validate: zod4Resolver(formSchema),
    initialValues: {
      label: "",
      guildId: "",
      roleIds: [],
      roleMatchMode: "any",
    },
  });

  function handleSubmit(values: FormValues) {
    createMutation.mutate(values, {
      onSuccess: () => form.reset(),
    });
  }

  function confirmDelete(configId: string, label: string) {
    modals.openConfirmModal({
      title: t("Remove Discord registration rule"),
      children: (
        <Text size="sm">
          {t("Remove the Discord registration rule {{label}}?", { label })}
        </Text>
      ),
      labels: { confirm: t("Remove"), cancel: t("Cancel") },
      confirmProps: { color: "red" },
      onConfirm: () => deleteMutation.mutate(configId),
    });
  }

  if (infoQuery.isLoading) {
    return <Loader />;
  }

  return (
    <>
      <DocumentTitle title={t("Discord registration")} />
      <SettingsTitle title={t("Discord registration")} />

      <Stack gap="lg">
        <Alert icon={<IconInfoCircle />} color="blue">
          {t(
            "People can create an account when their Discord membership matches any rule below.",
          )}
        </Alert>

        {!infoQuery.data?.oauthConfigured && (
          <Alert icon={<IconInfoCircle />} color="yellow">
            {t(
              "Set DISCORD_OAUTH_CLIENT_ID and DISCORD_OAUTH_CLIENT_SECRET on the Docmost server to enable registration.",
            )}
          </Alert>
        )}

        <Paper withBorder p="md">
          <Title order={3} size="h4" mb="xs">
            {t("Discord OAuth callback URL")}
          </Title>
          <Text size="sm" c="dimmed" mb="sm">
            {t("Add this URL to Redirects in the Discord Developer Portal.")}
          </Text>
          <Group wrap="nowrap" align="center">
            <Code style={{ flex: 1, overflowWrap: "anywhere" }}>
              {infoQuery.data?.callbackUrl}
            </Code>
            <CopyButton value={infoQuery.data?.callbackUrl ?? ""}>
              {({ copied, copy }) => (
                <Button variant="default" onClick={copy}>
                  {copied ? t("Copied") : t("Copy")}
                </Button>
              )}
            </CopyButton>
          </Group>
        </Paper>

        <Paper withBorder p="md">
          <Title order={3} size="h4" mb="md">
            {t("Add allowed Discord server and roles")}
          </Title>
          <form onSubmit={form.onSubmit(handleSubmit)}>
            <Stack>
              <TextInput
                label={t("Label")}
                description={t(
                  "A name for administrators to recognize this rule",
                )}
                placeholder={t("e.g. Approved members")}
                {...form.getInputProps("label")}
              />
              <TextInput
                label={t("Discord server ID")}
                description={t("The Discord server (guild) ID")}
                placeholder="123456789012345678"
                inputMode="numeric"
                {...form.getInputProps("guildId")}
              />
              <TagsInput
                label={t("Discord role IDs")}
                description={t("Enter one or more role IDs (up to 10)")}
                placeholder={t("Enter a role ID and press Enter")}
                splitChars={[",", " "]}
                maxDropdownHeight={0}
                maxTags={10}
                {...form.getInputProps("roleIds")}
              />
              <div>
                <Text size="sm" fw={500} mb={4}>
                  {t("Role match condition")}
                </Text>
                <Text size="xs" c="dimmed" mb={6}>
                  {t("Choose whether members need any role or all roles")}
                </Text>
                <SegmentedControl
                  fullWidth
                  data={[
                    { label: t("Any role (OR)"), value: "any" },
                    { label: t("All roles (AND)"), value: "all" },
                  ]}
                  {...form.getInputProps("roleMatchMode")}
                />
              </div>
              <Group justify="flex-end">
                <Button
                  type="submit"
                  leftSection={<IconBrandDiscord size={18} />}
                  loading={createMutation.isPending}
                >
                  {t("Add rule")}
                </Button>
              </Group>
            </Stack>
          </form>
        </Paper>

        <Paper withBorder p="md">
          <Title order={3} size="h4" mb="md">
            {t("Allowed Discord memberships")}
          </Title>
          {infoQuery.data?.configs.length ? (
            <Table.ScrollContainer minWidth={760}>
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>{t("Label")}</Table.Th>
                    <Table.Th>{t("Server ID")}</Table.Th>
                    <Table.Th>{t("Role IDs")}</Table.Th>
                    <Table.Th>{t("Match condition")}</Table.Th>
                    <Table.Th aria-label={t("Action")} />
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {infoQuery.data.configs.map((config) => (
                    <Table.Tr key={config.id}>
                      <Table.Td>{config.label}</Table.Td>
                      <Table.Td>
                        <Code>{config.guildId}</Code>
                      </Table.Td>
                      <Table.Td>
                        <Stack gap={4}>
                          {config.roleIds.map((roleId) => (
                            <Code key={roleId}>{roleId}</Code>
                          ))}
                        </Stack>
                      </Table.Td>
                      <Table.Td>
                        {t(
                          config.roleMatchMode === "all"
                            ? "All roles (AND)"
                            : "Any role (OR)",
                        )}
                      </Table.Td>
                      <Table.Td>
                        <ActionIcon
                          color="red"
                          variant="subtle"
                          aria-label={t("Remove {{name}}", {
                            name: config.label,
                          })}
                          onClick={() => confirmDelete(config.id, config.label)}
                        >
                          <IconTrash size={18} />
                        </ActionIcon>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          ) : (
            <Text c="dimmed">{t("No Discord registration rules yet.")}</Text>
          )}
        </Paper>
      </Stack>
    </>
  );
}
