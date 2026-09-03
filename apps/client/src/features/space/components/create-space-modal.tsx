import { Button, Divider, Modal } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { CreateSpaceForm } from "@/features/space/components/create-space-form.tsx";
import { useTranslation } from "react-i18next";

export default function CreateSpaceModal({
  personal = false,
}: {
  personal?: boolean;
}) {
  const { t } = useTranslation();
  const [opened, { open, close }] = useDisclosure(false);

  return (
    <>
      <Button onClick={open} variant={personal ? "light" : "filled"}>
        {t(personal ? "Create personal space" : "Create space")}
      </Button>

      <Modal
        opened={opened}
        onClose={close}
        title={t(personal ? "Create personal space" : "Create space")}
        closeButtonProps={{ "aria-label": t("Close") }}
      >
        <Divider size="xs" mb="xs" />
        <CreateSpaceForm personal={personal} />
      </Modal>
    </>
  );
}
