import {
  lazy,
  Suspense,
  useCallback,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { NodeViewProps, NodeViewWrapper } from "@tiptap/react";
import {
  Alert,
  Button,
  Group,
  Loader,
  Modal,
  Stack,
  Text,
  Textarea,
} from "@mantine/core";
import { IconApi, IconEdit } from "@tabler/icons-react";
import { ErrorBoundary } from "react-error-boundary";
import { useTranslation } from "react-i18next";
import { parseOpenApi } from "./parse-openapi";
import classes from "./openapi.module.css";

const OpenApiDocument = lazy(() => import("./openapi-document"));

export default function OpenApiView({
  node,
  editor,
  selected,
  updateAttributes,
}: NodeViewProps) {
  const { t } = useTranslation();
  const subscribe = useCallback(
    (notify: () => void) => {
      editor.on("update", notify);
      editor.on("transaction", notify);
      return () => {
        editor.off("update", notify);
        editor.off("transaction", notify);
      };
    },
    [editor],
  );
  const editable = useSyncExternalStore(
    subscribe,
    () => editor.isEditable,
    () => false,
  );
  const source = String(node.attrs.spec ?? "");
  const [opened, setOpened] = useState(false);
  const [draft, setDraft] = useState(source);
  const [editingSource, setEditingSource] = useState(source);
  const [error, setError] = useState("");
  const parsed = useMemo(() => {
    if (!source.trim()) return { spec: null, error: "" };
    try {
      return { spec: parseOpenApi(source), error: "" };
    } catch (error) {
      return { spec: null, error: (error as Error).message };
    }
  }, [source]);

  function edit() {
    if (!editor.isEditable) return;
    setDraft(source);
    setEditingSource(source);
    setError("");
    setOpened(true);
  }

  function save() {
    if (!editor.isEditable) return;
    if (source !== editingSource) {
      setError(
        "This specification changed while you were editing. Reopen the editor to load the latest version.",
      );
      return;
    }
    try {
      parseOpenApi(draft);
      updateAttributes({ spec: draft });
      setOpened(false);
    } catch (error) {
      setError((error as Error).message);
    }
  }

  return (
    <NodeViewWrapper
      className={classes.block}
      data-selected={(selected && editable) || undefined}
      contentEditable={false}
    >
      <Group justify="space-between" p="sm" className={classes.header}>
        <Group gap="xs">
          <IconApi size={20} />
          <Text fw={600}>{t("API documentation")}</Text>
        </Group>
        {editable && (
          <Button
            variant="subtle"
            size="compact-sm"
            leftSection={<IconEdit size={16} />}
            onClick={edit}
          >
            {t(source ? "Edit specification" : "Add specification")}
          </Button>
        )}
      </Group>
      {!source.trim() && (
        <Text c="dimmed" p="md">
          {t(
            "Add an OpenAPI specification to display API endpoints, parameters and responses.",
          )}
        </Text>
      )}
      {parsed.error && (
        <Alert color="red" m="sm">
          {t(parsed.error)}
        </Alert>
      )}
      {parsed.spec && (
        <ErrorBoundary
          resetKeys={[source]}
          fallback={
            <Alert color="red" m="sm">
              {t(
                "Unable to display this specification. Check the OpenAPI structure.",
              )}
            </Alert>
          }
        >
          <Suspense
            fallback={
              <Group p="md">
                <Loader size="sm" />
                <Text>{t("Loading API documentation...")}</Text>
              </Group>
            }
          >
            <OpenApiDocument spec={parsed.spec} />
          </Suspense>
        </ErrorBoundary>
      )}
      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title={t("Edit API specification")}
        size="xl"
        centered
        closeOnClickOutside={false}
      >
        <Stack>
          <Textarea
            label={t("OpenAPI specification")}
            description={t(
              "Paste JSON or YAML. OpenAPI 3.0, 3.1, 3.2 and Swagger 2.0 are supported.",
            )}
            placeholder={
              "openapi: 3.1.0\ninfo:\n  title: My API\n  version: 1.0.0\npaths: {}"
            }
            value={draft}
            onChange={(event) => {
              setDraft(event.currentTarget.value);
              setError("");
            }}
            rows={18}
            spellCheck={false}
            styles={{ input: { fontFamily: "monospace" } }}
            error={error ? t(error) : undefined}
            disabled={!editable}
            data-autofocus
          />
          <Text size="xs" c="dimmed">
            {t(
              "The specification is visible to everyone who can read this page. Do not include passwords or API keys.",
            )}
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setOpened(false)}>
              {t("Cancel")}
            </Button>
            <Button onClick={save} disabled={!editable}>
              {t("Save")}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </NodeViewWrapper>
  );
}
