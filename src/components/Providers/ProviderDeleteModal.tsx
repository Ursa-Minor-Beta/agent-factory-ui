import {
  Text,
  Button,
  Group,
  Stack,
  Modal,
} from '@mantine/core';
import type { ProviderConfig } from '../../types';

interface ProviderDeleteModalProps {
  opened: boolean;
  onClose: () => void;
  provider: ProviderConfig | null;
  onDelete: () => Promise<void>;
  deleting: boolean;
}

export function ProviderDeleteModal({
  opened,
  onClose,
  provider,
  onDelete,
  deleting,
}: ProviderDeleteModalProps) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Delete Provider"
      size="sm"
      centered
    >
      <Stack>
        <Text size="sm">
          Are you sure you want to delete the provider <strong>{provider?.name}</strong>?
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
