import { useState, useEffect, useMemo, useCallback } from 'react';
import { agentsApi, workspacesApi } from '../../../api';
import type { Agent, InputSchema } from '../../../types';
import { getInputSchema } from '../types';

export interface UseAgentViewModelReturn {
  // State
  agent: Agent | null;
  loading: boolean;
  error: string;
  workspaceName?: string;
  inputSchema: InputSchema;

  // Actions
  reload: () => Promise<void>;
}

export function useAgentViewModel(agentId: string | undefined): UseAgentViewModelReturn {
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [workspaceName, setWorkspaceName] = useState<string | undefined>();

  const inputSchema = useMemo(
    () => (agent ? getInputSchema(agent) : { message: { type: 'string' as const, required: true } }),
    [agent]
  );

  const loadAgent = useCallback(async () => {
    if (!agentId) return;

    try {
      setLoading(true);
      setError('');
      const data = await agentsApi.getById(agentId);
      setAgent(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load agent');
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  // Load agent on mount/change
  useEffect(() => {
    loadAgent();
  }, [loadAgent]);

  // Load workspace when agent has workspaceId
  useEffect(() => {
    if (!agent?.workspaceId) {
      setWorkspaceName(undefined);
      return;
    }

    const loadWorkspace = async () => {
      try {
        const workspace = await workspacesApi.getById(agent.workspaceId!);
        setWorkspaceName(workspace.name);
      } catch {
        setWorkspaceName(undefined);
      }
    };

    loadWorkspace();
  }, [agent?.workspaceId]);

  // Listen for agent-saved event from global modal
  useEffect(() => {
    const handleAgentSaved = () => {
      loadAgent();
    };

    window.addEventListener('agent-saved', handleAgentSaved);
    return () => window.removeEventListener('agent-saved', handleAgentSaved);
  }, [loadAgent]);

  return {
    agent,
    loading,
    error,
    workspaceName,
    inputSchema,
    reload: loadAgent,
  };
}
