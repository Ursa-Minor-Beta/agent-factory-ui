import { Modal, Text, Group, Button } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';

interface DeleteSessionsModalProps {
  opened: boolean;
  onClose: () => void;
  onConfirm: () => void;
  count: number;
  loading?: boolean;
  agentIds?: string[];
}

export function DeleteSessionsModal({
  opened,
  onClose,
  onConfirm,
  count,
  loading = false,
  agentIds = [],
}: DeleteSessionsModalProps) {
  const isAgentDeletion = agentIds.length > 0;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={isAgentDeletion ? 'Delete All Sessions for Agent(s)' : 'Delete Sessions'}
      centered
      size="sm"
    >
      <Group gap="sm" mb="md" align="flex-start">
        <IconAlertTriangle size={24} color="var(--mantine-color-red-6)" />
        <div>
          {isAgentDeletion ? (
            <>
              <Text size="sm" mb="xs">
                Delete all sessions for {agentIds.length}{' '}
                {agentIds.length === 1 ? 'agent' : 'agents'}?
              </Text>
              <Text size="xs" c="dimmed" mb="xs">
                Agents: {agentIds.join(', ')}
              </Text>
              <Text size="sm" c="dimmed">
                This will delete ALL sessions and their messages for these agents. This action
                cannot be undone.
              </Text>
            </>
          ) : (
            <>
              <Text size="sm" mb="xs">
                Are you sure you want to delete {count} {count === 1 ? 'session' : 'sessions'}?
              </Text>
              <Text size="sm" c="dimmed">
                All messages in {count === 1 ? 'this session' : 'these sessions'} will be
                permanently deleted. This action cannot be undone.
              </Text>
            </>
          )}
        </div>
      </Group>

      <Group justify="flex-end" mt="xl">
        <Button variant="subtle" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button color="red" onClick={onConfirm} loading={loading}>
          Delete
        </Button>
      </Group>
    </Modal>
  );
}
