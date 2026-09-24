import {
  Text,
  Button,
  Group,
  Stack,
  Modal,
  Code,
} from '@mantine/core';
import type { MemoryRecord } from '../../types';

interface RecordDeleteModalProps {
  opened: boolean;
  onClose: () => void;
  record: MemoryRecord | null;
  onDelete: () => Promise<void>;
  deleting: boolean;
}

export function RecordDeleteModal({
  opened,
  onClose,
  record,
  onDelete,
  deleting,
}: RecordDeleteModalProps) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Delete Record"
      size="sm"
      centered
    >
      <Stack>
        <Text size="sm">
          Are you sure you want to delete this record?
        </Text>
        <Code fz="xs">{record?.id}</Code>
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
