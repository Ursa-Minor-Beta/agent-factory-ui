import { Text, Button, Group, Stack, Modal, Alert } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';

interface DeleteConfirmModalProps {
  opened: boolean;
  onClose: () => void;
  onDelete: () => void | Promise<void>;
  deleting: boolean;
  title: string;
  entityName?: React.ReactNode;
  subtitle?: string;
  deleteButtonText?: string;
  error?: string;
}

export function DeleteConfirmModal({
  opened,
  onClose,
  onDelete,
  deleting,
  title,
  entityName,
  subtitle,
  deleteButtonText = 'Delete',
  error,
}: DeleteConfirmModalProps) {
  return (
    <Modal opened={opened} onClose={onClose} title={title} size="sm" centered>
      <Stack>
        <Text size="sm">
          Are you sure you want to delete{' '}
          {entityName ? (
            <>
              <Text span fw={500}>
                {entityName}
              </Text>
              ?
            </>
          ) : (
            'this item?'
          )}
        </Text>

        <Alert
          icon={<IconAlertTriangle size={18} />}
          color="red"
          variant="light"
          radius="md"
        >
          {subtitle && (
            <Text size="sm" mb={4}>
              {subtitle}
            </Text>
          )}
          <Text size="sm" fw={500} c={subtitle ? 'red' : undefined}>
            This action cannot be undone.
          </Text>
        </Alert>

        {error && (
          <Text size="sm" c="red">
            {error}
          </Text>
        )}

        <Group justify="flex-end" mt="md">
          <Button variant="subtle" onClick={onClose} disabled={deleting}>
            Cancel
          </Button>
          <Button color="red" onClick={onDelete} loading={deleting}>
            {deleteButtonText}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
