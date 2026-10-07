import { useState } from 'react';
import { agentsApi } from '../../api';
import type { Agent } from '../../types';
import { DeleteConfirmModal } from '../../components/DeleteConfirmModal';

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
    <DeleteConfirmModal
      opened={!!agent}
      onClose={onClose}
      onDelete={handleDelete}
      deleting={deleting}
      title="Delete Agent"
      entityName={agent?.name}
      error={error}
    />
  );
}
