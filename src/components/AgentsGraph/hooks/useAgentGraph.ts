import { useEffect, useRef, useState } from 'react';
import { agentsApi } from '../../../api';
import type { Agent, AgentGraph } from '../../../types';

/**
 * Relation graph of a workspace or ALL_AGENTS (one request), plus - with `withAgents` - the workspace's agents for full cards.
 * Both served from the agents API cache when possible; any agent mutation drops it (api/agents.ts),
 * refreshKey/currentAgentId re-check it. The graph is also refetched when the current agent is missing
 * from it (e.g. just created) even if a cache exists.
 */
export function useAgentGraph(workspaceId: string, { refreshKey, currentAgentId, withAgents }: {
  refreshKey?: unknown;
  currentAgentId?: string;
  withAgents?: boolean;
} = {}) {
  const peekAgents = () => (withAgents ? agentsApi.listAll.peek(workspaceId) : []);
  const [graph, setGraph] = useState<AgentGraph | undefined>(() => agentsApi.graph.peek(workspaceId));
  const [agents, setAgents] = useState<Agent[]>(() => peekAgents() ?? []);
  const [loading, setLoading] = useState(() => !agentsApi.graph.peek(workspaceId) || !peekAgents());
  const [error, setError] = useState<string | null>(null);
  const graphRef = useRef(graph);
  graphRef.current = graph;

  useEffect(() => {
    const cachedGraph = agentsApi.graph.peek(workspaceId);
    const cachedAgents = peekAgents();
    const graphFresh = cachedGraph && (!currentAgentId || cachedGraph.nodes.some((n) => n.id === currentAgentId));
    if (cachedGraph) setGraph(cachedGraph);
    if (cachedAgents) setAgents(cachedAgents);
    if (graphFresh && cachedAgents) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const load = async () => {
      // Full loader only without data; otherwise refresh in the background
      if (!graphRef.current) setLoading(true);
      setError(null);
      try {
        const [nextGraph, nextAgents] = await Promise.all([
          graphFresh ? cachedGraph : agentsApi.graph.fetch(workspaceId),
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
