import {
  Text,
  Button,
  Group,
  Stack,
  Modal,
} from '@mantine/core';
import type { MemorySchema } from '../../types';

interface CollectionDeleteModalProps {
  opened: boolean;
  onClose: () => void;
  collection: MemorySchema | null;
  onDelete: () => Promise<void>;
  deleting: boolean;
}

export function CollectionDeleteModal({
  opened,
  onClose,
  collection,
  onDelete,
  deleting,
}: CollectionDeleteModalProps) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Delete Collection"
      size="sm"
      centered
    >
      <Stack>
        <Text size="sm">
          Are you sure you want to delete the collection <Text span fw={500}>{collection?.name}</Text>?
        </Text>
        <Text size="sm" c="red">
          This will also delete all records in this collection. This action cannot be undone.
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
