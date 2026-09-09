import { useState } from 'react';
import { Modal, Text, Group, Button } from '@mantine/core';
import { agentsApi } from '../../api';
import type { Agent } from '../../types';

interface AgentDeleteModalProps {
  agent: Agent | null;
  onClose: () => void;
  onDeleted: () => void;
}

export function AgentDeleteModal({ agent, onClose, onDeleted }: AgentDeleteModalProps) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    if (!agent) return;
    setDeleting(true);
    setError('');
    try {
      await agentsApi.delete(agent.id);
      onClose();
      onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete agent');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal
      opened={!!agent}
      onClose={onClose}
      title="Delete agent"
      centered
      size="sm"
    >
      <Text size="sm" mb="lg">
        Are you sure you want to delete <strong>{agent?.name}</strong>? This action cannot be undone.
      </Text>
      {error && (
        <Text size="sm" c="red" mb="md">
          {error}
        </Text>
      )}
      <Group justify="flex-end" gap="sm">
        <Button variant="default" onClick={onClose}>
          Cancel
        </Button>
        <Button color="red" onClick={handleDelete} loading={deleting}>
          Delete
        </Button>
      </Group>
    </Modal>
  );
}
