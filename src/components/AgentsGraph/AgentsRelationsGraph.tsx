import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Node } from '@xyflow/react';
import { routes } from '../../config/routes';
import { AgentsGraphView } from './AgentsGraphView';
import { extractRelations, relationEdges } from './graph/relations';
import { graphBounds, layout } from './graph/layout';
import { useGraphAgents } from './hooks/useGraphAgents';
import { AgentCardNode, CARD_NODE_SIZES, type AgentCardNodeData, type CardActions } from './nodes/AgentCardNode';

const nodeTypes = { agent: AgentCardNode };

interface AgentsRelationsGraphProps extends CardActions {
  workspaceId?: string; // If provided, only agents of this workspace are shown
  refreshKey?: unknown; // Graph refetches when this changes (e.g. after delete/clone in the list), otherwise uses the cache
  topInset?: number; // Extra top space (px) kept free when fitting, e.g. for a toolbar floating over the graph
}

// Agents list graph mode: full cards with actions, double-click opens the editor
export function AgentsRelationsGraph({ workspaceId, refreshKey, topInset, ...actions }: AgentsRelationsGraphProps) {
  const navigate = useNavigate();
  const { agents, loading, error } = useGraphAgents(workspaceId, refreshKey);

  const { nodes, edges, bounds } = useMemo(() => {
    const relations = extractRelations(agents);
    const positions = layout(agents, relations, CARD_NODE_SIZES);
    const nodes: Node<AgentCardNodeData>[] = agents.map((agent) => ({
      id: agent.id,
      type: 'agent',
      position: positions.get(agent.id) ?? { x: 0, y: 0 },
      data: { agent, actions },
    }));
    return { nodes, edges: relationEdges(relations, true), bounds: graphBounds(nodes, CARD_NODE_SIZES.nodeWidth) };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- actions are recreated each render of the list
  }, [agents]);

  return (
    <AgentsGraphView
      nodes={nodes}
      edges={edges}
      bounds={bounds}
      nodeTypes={nodeTypes}
      loading={loading}
      error={error}
      style={{ height: 'calc(100vh - 120px)', minHeight: 400 }}
      topInset={topInset}
      nodesDraggable
      onNodeDoubleClick={(_, node) => navigate(routes.agentEditor(node.id))}
    />
  );
}
