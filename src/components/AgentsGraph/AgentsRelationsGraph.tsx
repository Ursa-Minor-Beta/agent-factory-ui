import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Node } from '@xyflow/react';
import type { Agent } from '../../types';
import { routes } from '../../config/routes';
import { AgentsGraphView } from './AgentsGraphView';
import { graphRelations, relationEdges } from './graph/relations';
import { graphBounds, layout } from './graph/layout';
import { useAgentGraph } from './hooks/useAgentGraph';
import { AgentCardNode, CARD_NODE_SIZES, type AgentCardNodeData, type CardActions } from './nodes/AgentCardNode';
import { AgentNameNode, nameNodeData, type AgentNameNodeData } from './nodes/AgentNameNode';

const nodeTypes = { agent: AgentCardNode, name: AgentNameNode };

interface AgentsRelationsGraphProps extends CardActions {
  workspaceId: string;
  refreshKey?: unknown; // Graph refetches when this changes (e.g. after delete/clone in the list), otherwise uses the cache
  topInset?: number; // Extra top space (px) kept free when fitting, e.g. for a toolbar floating over the graph
}

// Agents list graph mode: full cards with actions for the workspace's agents, name nodes for
// external/missing ones; double-click opens the editor
export function AgentsRelationsGraph({ workspaceId, refreshKey, topInset, ...actions }: AgentsRelationsGraphProps) {
  const navigate = useNavigate();
  const { graph, agents, loading, error } = useAgentGraph(workspaceId, { refreshKey, withAgents: true });

  const { nodes, edges, bounds } = useMemo(() => {
    const graphNodes = graph?.nodes ?? [];
    const relations = graphRelations(graph?.edges ?? []);
    const positions = layout(graphNodes, relations, CARD_NODE_SIZES);
    const agentById = new Map(agents.map((a) => [a.id, a]));
    const nodes: Node<AgentCardNodeData | AgentNameNodeData>[] = graphNodes.map((node) => {
      const position = positions.get(node.id) ?? { x: 0, y: 0 };
      if (node.missing) {
        return { id: node.id, type: 'name', position, data: { ...nameNodeData(node), width: CARD_NODE_SIZES.nodeWidth } };
      }
      // External agents aren't in the workspace list - card from the graph data (card actions only need the id)
      const agent = agentById.get(node.id) ?? ({
        id: node.id,
        name: node.name,
        workspaceId: node.workspaceId ?? undefined,
        workspaceName: node.workspaceName ?? undefined,
      } as Agent);
      return { id: node.id, type: 'agent', position, data: { agent, actions: { ...actions, currentWorkspaceId: workspaceId }, external: node.external } };
    });
    return { nodes, edges: relationEdges(relations, true), bounds: graphBounds(nodes, CARD_NODE_SIZES.nodeWidth) };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- actions are recreated each render of the list
  }, [graph, agents]);

  return (
    <AgentsGraphView
      nodes={nodes}
      edges={edges}
      bounds={bounds}
      nodeTypes={nodeTypes}
      loading={loading}
      error={error}
      style={{ height: 'calc(100vh - 140px)', minHeight: 400 }}
      topInset={topInset}
      nodesDraggable
      onNodeDoubleClick={(_, node) => {
        if (!(node.data as AgentNameNodeData).missing) navigate(routes.agentEditor(node.id));
      }}
    />
  );
}
