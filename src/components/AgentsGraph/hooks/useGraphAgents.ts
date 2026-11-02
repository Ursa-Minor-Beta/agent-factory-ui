import { useEffect, useRef, useState } from 'react';
import { agentsApi } from '../../../api';
import type { Agent } from '../../../types';

/**
 * Workspace agents with nodes, served from the agents API cache when possible.
 * Cache is dropped by any agent mutation (api/agents.ts); refreshKey/currentAgentId re-check it.
 * Also refetches when the current agent is missing (e.g. just created) even if a cache exists.
 */
export function useGraphAgents(workspaceId?: string, refreshKey?: unknown, currentAgentId?: string) {
  const [agents, setAgents] = useState<Agent[]>(() => agentsApi.listAllWithNodes.peek(workspaceId) ?? []);
  const [loading, setLoading] = useState(() => !agentsApi.listAllWithNodes.peek(workspaceId));
  const [error, setError] = useState<string | null>(null);
  const agentsRef = useRef(agents);
  agentsRef.current = agents;

  useEffect(() => {
    const cached = agentsApi.listAllWithNodes.peek(workspaceId);
    if (cached && (!currentAgentId || cached.some((a) => a.id === currentAgentId))) {
      setAgents(cached);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const load = async () => {
      // Full loader only without data; otherwise refresh in the background
      if (!cached) setLoading((prev) => prev || agentsRef.current.length === 0);
      setError(null);
      try {
        const full = await agentsApi.listAllWithNodes.fetch(workspaceId);
        if (!cancelled) setAgents(full);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load agents');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [workspaceId, refreshKey, currentAgentId]);

  return { agents, loading, error };
}
