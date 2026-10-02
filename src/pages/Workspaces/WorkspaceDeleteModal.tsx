import { useState } from 'react';
import {
  Text,
  Button,
  Group,
  Stack,
  Modal,
  Radio,
} from '@mantine/core';
import type { Workspace, WorkspaceDeleteMode } from '../../types/workspace';

interface WorkspaceDeleteModalProps {
  opened: boolean;
  onClose: () => void;
  workspace: Workspace | null;
  agentCount: number;
  onDelete: (mode: WorkspaceDeleteMode) => Promise<void>;
  deleting: boolean;
}

export function WorkspaceDeleteModal({
  opened,
  onClose,
  workspace,
  agentCount,
  onDelete,
  deleting,
}: WorkspaceDeleteModalProps) {
  const [deleteMode, setDeleteMode] = useState<WorkspaceDeleteMode>('move-agents');

  const handleDelete = async () => {
    await onDelete(deleteMode);
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Delete Workspace"
      size="md"
      centered
    >
      <Stack>
        <Text size="sm">
          Are you sure you want to delete the workspace{' '}
          <Text span fw={500}>
            {workspace?.name}
          </Text>
          ?
        </Text>

        {agentCount > 0 && (
          <>
            <Text size="sm" c="yellow">
              This workspace contains {agentCount} agent{agentCount !== 1 ? 's' : ''}.
            </Text>

            <Radio.Group value={deleteMode} onChange={(value) => setDeleteMode(value as WorkspaceDeleteMode)}>
              <Stack gap="xs">
                <Radio
                  value="move-agents"
                  label="Move agents to default workspace"
                  description="Agents will be preserved and moved to your default workspace"
                />
                <Radio
                  value="delete-agents"
                  label="Delete all agents"
                  description="All agents in this workspace will be permanently deleted"
                />
              </Stack>
            </Radio.Group>
          </>
        )}

        <Text size="sm" c="red">
          This action cannot be undone.
        </Text>

        <Group justify="flex-end" mt="md">
          <Button variant="subtle" onClick={onClose} disabled={deleting}>
            Cancel
          </Button>
          <Button color="red" onClick={handleDelete} loading={deleting}>
            Delete Workspace
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
