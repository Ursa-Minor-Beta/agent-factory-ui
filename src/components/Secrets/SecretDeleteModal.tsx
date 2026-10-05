import {
  Text,
  Button,
  Group,
  Stack,
  Modal,
  Code,
} from '@mantine/core';
import type { Secret } from '../../types';

interface SecretDeleteModalProps {
  opened: boolean;
  onClose: () => void;
  secret: Secret | null;
  onDelete: () => Promise<void>;
  deleting: boolean;
}

export function SecretDeleteModal({
  opened,
  onClose,
  secret,
  onDelete,
  deleting,
}: SecretDeleteModalProps) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Delete Secret"
      size="sm"
      centered
    >
      <Stack>
        <Text size="sm">
          Are you sure you want to delete the secret <Code>{secret?.name}</Code>?
        </Text>
        <Text size="sm" c="dimmed">
          This action cannot be undone.
        </Text>
        <Group justify="flex-end" mt="md">
          <Button variant="subtle" onClick={onClose} disabled={deleting}>
            Cancel
          </Button>
          <Button color="red" onClick={onDelete} loading={deleting}>
            Delete
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
