import { useEffect, useRef, useState } from 'react';
import { agentsApi } from '../../../api';
import type { Agent, AgentGraph } from '../../../types';

/**
 * Relation graph of a workspace or ALL_AGENTS (one request, always fresh), plus - with `withAgents` - the
 * workspace's agents for full cards, served from the agents API cache when possible (any agent mutation drops it).
 * Refetched when workspaceId/refreshKey/currentAgentId change.
 */
export function useAgentGraph(workspaceId: string, { refreshKey, currentAgentId, withAgents }: {
  refreshKey?: unknown;
  currentAgentId?: string;
  withAgents?: boolean;
} = {}) {
  const peekAgents = () => (withAgents ? agentsApi.listAll.peek(workspaceId) : []);
  const [graph, setGraph] = useState<AgentGraph | undefined>();
  const [agents, setAgents] = useState<Agent[]>(() => peekAgents() ?? []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const graphRef = useRef(graph);
  graphRef.current = graph;

  useEffect(() => {
    const cachedAgents = peekAgents();
    if (cachedAgents) setAgents(cachedAgents);

    let cancelled = false;
    const load = async () => {
      // Full loader only without data; otherwise refresh in the background
      if (!graphRef.current) setLoading(true);
      setError(null);
      try {
        const [nextGraph, nextAgents] = await Promise.all([
          agentsApi.graph(workspaceId),
          cachedAgents ?? agentsApi.listAll.fetch(workspaceId),
        ]);
        if (cancelled) return;
        setGraph(nextGraph);
        setAgents(nextAgents);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load agents');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- peekAgents only depends on workspaceId/withAgents
  }, [workspaceId, refreshKey, currentAgentId, withAgents]);

  return { graph, agents, loading, error };
}
