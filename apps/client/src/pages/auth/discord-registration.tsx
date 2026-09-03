import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Alert,
  Anchor,
  Box,
  Button,
  Container,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { IconBrandDiscord, IconInfoCircle } from "@tabler/icons-react";
import { useForm } from "@mantine/form";
import { zod4Resolver } from "mantine-form-zod-resolver";
import { z } from "zod/v4";
import { notifications } from "@mantine/notifications";
import { useTranslation } from "react-i18next";
import { AuthLayout } from "@/features/auth/components/auth-layout";
import classes from "@/features/auth/components/auth.module.css";
import { DocumentTitle } from "@/components/ui/document-title";
import { useRedirectIfAuthenticated } from "@/features/auth/hooks/use-redirect-if-authenticated";
import {
  useDiscordRegistrationSessionQuery,
  useDiscordRegistrationStatusQuery,
} from "@/features/discord-registration/discord-registration.query";
import {
  completeDiscordRegistration,
  startDiscordRegistration,
} from "@/features/discord-registration/discord-registration.service";
import APP_ROUTE from "@/lib/app-route";

const formSchema = z.object({
  name: z.string().trim().min(2).max(60),
  password: z.string().min(8).max(70),
});

type FormValues = z.infer<typeof formSchema>;

function readRegistrationToken(): string | null {
  const hash = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash;
  return new URLSearchParams(hash).get("token");
}

export default function DiscordRegistrationPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [token] = useState(readRegistrationToken);
  const [isStarting, setIsStarting] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const statusQuery = useDiscordRegistrationStatusQuery();
  const sessionQuery = useDiscordRegistrationSessionQuery(token);
  useRedirectIfAuthenticated();

  const errorMessage = useMemo(() => {
    switch (searchParams.get("error")) {
      case "oauth_denied":
        return t("Discord authorization was cancelled");
      case "not_eligible":
        return t("Your Discord account does not have an allowed role");
      case "oauth_failed":
        return t("Discord verification failed. Please try again.");
      default:
        return null;
    }
  }, [searchParams, t]);

  const form = useForm<FormValues>({
    validate: zod4Resolver(formSchema),
    initialValues: { name: "", password: "" },
  });

  useEffect(() => {
    if (sessionQuery.data?.name && !form.values.name) {
      form.setFieldValue("name", sessionQuery.data.name);
    }
  }, [sessionQuery.data?.name]);

  async function handleStart() {
    setIsStarting(true);
    try {
      const result = await startDiscordRegistration();
      window.location.assign(result.authorizeUrl);
    } catch (error) {
      setIsStarting(false);
      notifications.show({
        message: error["response"]?.data?.message,
        color: "red",
      });
    }
  }

  async function handleComplete(values: FormValues) {
    if (!token) return;
    setIsCompleting(true);
    try {
      const result = await completeDiscordRegistration({
        token,
        name: values.name,
        password: values.password,
      });
      window.history.replaceState(null, "", "/register/discord");
      if (result.requiresLogin) {
        notifications.show({
          message: t("Account created successfully. Please sign in."),
        });
        navigate(APP_ROUTE.AUTH.LOGIN);
      } else {
        navigate(APP_ROUTE.HOME);
      }
    } catch (error) {
      setIsCompleting(false);
      notifications.show({
        message: error["response"]?.data?.message,
        color: "red",
      });
    }
  }

  return (
    <>
      <DocumentTitle title={t("Create account with Discord")} />
      <AuthLayout>
        <Container size={420} className={classes.container}>
          <Box p="xl" className={classes.containerBox}>
            <Title order={1} size="h2" ta="center" fw={500} mb="md">
              {t("Create account")}
            </Title>

            {errorMessage && (
              <Alert color="red" icon={<IconInfoCircle />} mb="md">
                {errorMessage}
              </Alert>
            )}

            {!token && (
              <Stack>
                <Text c="dimmed" ta="center" size="sm">
                  {t(
                    "Verify your Discord server and role membership to create an account.",
                  )}
                </Text>
                <Button
                  leftSection={<IconBrandDiscord size={20} />}
                  onClick={handleStart}
                  loading={isStarting}
                  disabled={statusQuery.isLoading || !statusQuery.data?.enabled}
                >
                  {t("Continue with Discord")}
                </Button>
                {!statusQuery.isLoading && !statusQuery.data?.enabled && (
                  <Alert color="yellow">
                    {t("Discord registration is not currently available.")}
                  </Alert>
                )}
                <Anchor component={Link} to={APP_ROUTE.AUTH.LOGIN} ta="center">
                  {t("Back to login")}
                </Anchor>
              </Stack>
            )}

            {token && sessionQuery.isError && (
              <Alert color="red" icon={<IconInfoCircle />}>
                {t("This registration session is invalid or expired.")}
              </Alert>
            )}

            {token && sessionQuery.data && (
              <form onSubmit={form.onSubmit(handleComplete)}>
                <Stack>
                  <Alert color="green" icon={<IconBrandDiscord />}>
                    {t("Discord membership verified")}
                  </Alert>
                  <TextInput
                    label={t("Email")}
                    value={sessionQuery.data.email}
                    disabled
                    variant="filled"
                  />
                  <TextInput
                    label={t("Name")}
                    placeholder={t("enter your full name")}
                    variant="filled"
                    autoComplete="name"
                    {...form.getInputProps("name")}
                  />
                  <PasswordInput
                    label={t("Password")}
                    placeholder={t("Your password")}
                    variant="filled"
                    autoComplete="new-password"
                    {...form.getInputProps("password")}
                  />
                  <Button type="submit" loading={isCompleting}>
                    {t("Create account")}
                  </Button>
                </Stack>
              </form>
            )}
          </Box>
        </Container>
      </AuthLayout>
    </>
  );
}
