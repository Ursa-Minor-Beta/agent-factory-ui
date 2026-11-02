import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Node } from '@xyflow/react';
import type { NodeStatus } from '../../types';
import { routes } from '../../config/routes';
import { AgentsGraphView } from './AgentsGraphView';
import { extractRelations, relationEdges } from './graph/relations';
import { graphBounds, layout } from './graph/layout';
import { useGraphAgents } from './hooks/useGraphAgents';
import { AgentNameNode, NAME_NODE_SIZES, type AgentNameNodeData } from './nodes/AgentNameNode';

const nodeTypes = { agent: AgentNameNode };

const NEW_AGENT_NODE_ID = '__new-agent__';

interface AgentsNavigatorGraphProps {
  workspaceId: string;
  refreshKey?: unknown; // Graph refetches when this changes (e.g. after saving), otherwise uses the cache
  currentAgentId?: string; // Highlighted agent
  runStatuses?: Record<string, NodeStatus>; // Editor run status per agent - running agents glow
  newAgent?: boolean; // Show an empty highlighted placeholder for an unsaved agent (editor on /new)
}

// Editor side panel: name-only nodes filling the parent, click switches to the agent's editor
export function AgentsNavigatorGraph({ workspaceId, refreshKey, currentAgentId, runStatuses, newAgent }: AgentsNavigatorGraphProps) {
  const navigate = useNavigate();
  const { agents, loading, error } = useGraphAgents(workspaceId, refreshKey, currentAgentId);

  // Layout - recomputed only when the graph itself changes, never on run status updates
  const { layoutNodes, edges, bounds } = useMemo(() => {
    const relations = extractRelations(agents);
    const positions = layout(agents, relations, NAME_NODE_SIZES);
    const layoutNodes: Node<AgentNameNodeData>[] = agents.map((agent) => ({
      id: agent.id,
      type: 'agent',
      position: positions.get(agent.id) ?? { x: 0, y: 0 },
      data: { name: agent.name, current: agent.id === currentAgentId },
    }));
    if (newAgent) {
      // Placeholder below everything, centred horizontally
      const xs = layoutNodes.map((n) => n.position.x);
      const centerX = layoutNodes.length ? (Math.min(...xs) + Math.max(...xs)) / 2 : 0;
      const bottomY = layoutNodes.length ? Math.max(...layoutNodes.map((n) => n.position.y)) + NAME_NODE_SIZES.rowGap : 0;
      layoutNodes.push({
        id: NEW_AGENT_NODE_ID,
        type: 'agent',
        position: { x: centerX, y: bottomY },
        data: { name: 'New agent', current: true, isNew: true },
      });
    }
    return {
      layoutNodes,
      edges: relationEdges(relations, false),
      bounds: graphBounds(layoutNodes, NAME_NODE_SIZES.nodeWidth),
    };
  }, [agents, currentAgentId, newAgent]);

  // Run statuses applied on top; untouched nodes keep their identity so React Flow skips them
  const nodes = useMemo(() => {
    if (!runStatuses) return layoutNodes;
    return layoutNodes.map((node) => {
      const runStatus = runStatuses[node.id];
      return runStatus ? { ...node, data: { ...node.data, runStatus } } : node;
    });
  }, [layoutNodes, runStatuses]);

  return (
    <AgentsGraphView
      nodes={nodes}
      edges={edges}
      bounds={bounds}
      nodeTypes={nodeTypes}
      loading={loading}
      error={error}
      style={{ height: '100%' }}
      nodesDraggable={false}
      onNodeClick={(event, node) => {
        if (node.id === NEW_AGENT_NODE_ID) return;
        // Cmd/Ctrl+click opens in a new tab, like a link
        if (event.metaKey || event.ctrlKey) window.open(routes.agentEditor(node.id), '_blank');
        else if (node.id !== currentAgentId) navigate(routes.agentEditor(node.id));
      }}
    />
  );
}
