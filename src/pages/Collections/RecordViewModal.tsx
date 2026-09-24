import {
  Box,
  Text,
  Button,
  Group,
  Stack,
  Modal,
  Badge,
  ScrollArea,
  Code,
} from '@mantine/core';
import { IconPencil } from '@tabler/icons-react';
import type { MemoryRecord } from '../../types';

interface RecordViewModalProps {
  opened: boolean;
  onClose: () => void;
  record: MemoryRecord | null;
  onEdit: (record: MemoryRecord) => void;
}

export function RecordViewModal({
  opened,
  onClose,
  record,
  onEdit,
}: RecordViewModalProps) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Record Details"
      size="lg"
    >
      {record && (
        <Stack>
          <Box>
            <Text size="sm" c="dimmed">ID</Text>
            <Code>{record.id}</Code>
          </Box>
          <Box>
            <Text size="sm" c="dimmed">Data</Text>
            <ScrollArea.Autosize mah={300}>
              <Code block>{JSON.stringify(record.data, null, 2)}</Code>
            </ScrollArea.Autosize>
          </Box>
          {record.importance !== undefined && (
            <Box>
              <Text size="sm" c="dimmed">Importance</Text>
              <Badge variant="light">{record.importance}</Badge>
            </Box>
          )}
          {record.tags && record.tags.length > 0 && (
            <Box>
              <Text size="sm" c="dimmed">Tags</Text>
              <Group gap={4}>
                {record.tags.map((tag) => (
                  <Badge key={tag} size="sm" variant="outline">{tag}</Badge>
                ))}
              </Group>
            </Box>
          )}
          <Group gap="xl">
            <Box>
              <Text size="sm" c="dimmed">Created</Text>
              <Text size="sm">{new Date(record.createdAt).toLocaleString()}</Text>
            </Box>
            <Box>
              <Text size="sm" c="dimmed">Updated</Text>
              <Text size="sm">{new Date(record.updatedAt).toLocaleString()}</Text>
            </Box>
          </Group>
          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={onClose}>
              Close
            </Button>
            <Button
              leftSection={<IconPencil size={16} />}
              onClick={() => {
                onClose();
                onEdit(record);
              }}
            >
              Edit
            </Button>
          </Group>
        </Stack>
      )}
    </Modal>
  );
}
