import { Text, Button, Group, Stack, Modal } from '@mantine/core';
import type { Workspace } from '../../types/workspace';

interface WorkspaceDeleteModalProps {
  opened: boolean;
  onClose: () => void;
  workspace: Workspace | null;
  onDelete: () => Promise<void>;
  deleting: boolean;
}

export function WorkspaceDeleteModal({
  opened,
  onClose,
  workspace,
  onDelete,
  deleting,
}: WorkspaceDeleteModalProps) {
  return (
    <Modal opened={opened} onClose={onClose} title="Delete Workspace" size="md" centered>
      <Stack>
        <Text size="sm">
          Are you sure you want to delete the workspace{' '}
          <Text span fw={500}>
            {workspace?.name}
          </Text>
          ?
        </Text>

        <Text size="sm" c="yellow">
          All agents, secrets, providers, and collections in this workspace will be permanently
          deleted.
        </Text>

        <Text size="sm" c="red">
          This action cannot be undone.
        </Text>

        <Group justify="flex-end" mt="md">
          <Button variant="subtle" onClick={onClose} disabled={deleting}>
            Cancel
          </Button>
          <Button color="red" onClick={onDelete} loading={deleting}>
            Delete Workspace
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
