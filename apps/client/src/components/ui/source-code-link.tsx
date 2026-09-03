import { Button } from "@mantine/core";
import { IconCode } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import {
  getSourceCodeRevision,
  getSourceCodeUrl,
} from "@/lib/config.ts";

export function SourceCodeLink() {
  const { t } = useTranslation();
  const sourceCodeUrl = getSourceCodeUrl();
  const sourceCodeRevision = getSourceCodeRevision();

  if (!sourceCodeUrl) {
    return null;
  }

  const revisionLabel = sourceCodeRevision?.slice(0, 12);

  return (
    <Button
      component="a"
      href={sourceCodeUrl}
      target="_blank"
      rel="noreferrer"
      variant="default"
      size="compact-xs"
      leftSection={<IconCode size={14} />}
      title={
        revisionLabel
          ? `${t("Source code")} (${revisionLabel})`
          : t("Source code")
      }
      style={{
        bottom: 10,
        position: "fixed",
        right: 10,
        zIndex: 1000,
      }}
    >
      {t("Source code")}
    </Button>
  );
}
