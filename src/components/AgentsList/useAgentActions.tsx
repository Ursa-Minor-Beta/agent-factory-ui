import { useState } from 'react';
import { agentsApi } from '../../api';
import type { Agent } from '../../types';
import { downloadJson } from '../../utils/download';
import { useAgentModal } from '../AgentCreateModal';
import { AgentDeleteModal } from './AgentDeleteModal';
import { AgentWorkspaceModal } from './AgentWorkspaceModal';

interface UseAgentActionsOptions {
  workspaceId?: string; // Clone target when the agent has no workspace
  onChanged: () => void; // After clone / workspace change / delete
  onCreated?: () => void; // After clone
  onDeleted?: (agent: Agent) => void;
}

/**
 * Agent card actions (JSON editor, clone, export, manage workspace, delete) with their modals -
 * shared by the agents list and the editor's relations graph. Render `modals` once.
 */
export function useAgentActions({ workspaceId, onChanged, onCreated, onDeleted }: UseAgentActionsOptions) {
  const [error, setError] = useState('');
  const { openEditAgent } = useAgentModal();
  const [agentToDelete, setAgentToDelete] = useState<Agent | null>(null);
  const [agentForWorkspace, setAgentForWorkspace] = useState<Agent | null>(null);

  const handleClone = async (agent: Agent) => {
    try {
      // Fetch full agent data to get nodes // TODO move clone to thhe backend
      const fullAgent = await agentsApi.getById(agent.id);
      await agentsApi.create({
        name: `${fullAgent.name} (clone)`,
        description: fullAgent.description,
        nodes: fullAgent.nodes,
        workspaceId: fullAgent.workspaceId || workspaceId,
        editorData: fullAgent.editorData
      });
      onChanged();
      onCreated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clone agent');
    }
  };

  const handleExport = async (agent: Agent) => {
    try {
      const exportData = await agentsApi.export(agent.id);
      downloadJson(exportData, `${agent.name}.agent.json`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export agent');
    }
  };

  const handlers = {
    onEdit: (agent: Agent) => openEditAgent(agent.id),
    onDelete: setAgentToDelete,
    onClone: handleClone,
    onWorkspace: setAgentForWorkspace,
    onExport: handleExport,
  };

  const modals = (
    <>
      <AgentDeleteModal
        agent={agentToDelete}
        onClose={() => setAgentToDelete(null)}
        onDeleted={() => {
          onChanged();
          if (agentToDelete) onDeleted?.(agentToDelete);
        }}
      />

      <AgentWorkspaceModal
        agent={agentForWorkspace}
        onClose={() => setAgentForWorkspace(null)}
        onSaved={onChanged}
      />
    </>
  );

  return { handlers, modals, error, setError };
}
