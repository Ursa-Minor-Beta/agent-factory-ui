import { useEffect, useMemo, useRef, useState } from 'react';
import { Box } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import type { Edge, Node } from '@xyflow/react';
import type { Agent, AgentGraphNode } from '../../types';
import { ALL_AGENTS } from '../../api/agents';
import { routes } from '../../config/routes';
import { AgentsGraphView } from './AgentsGraphView';
import { graphRelations, relationEdges } from './graph/relations';
import { graphBounds, layout } from './graph/layout';
import { workspaceLayout } from './graph/groups';
import { useAgentGraph } from './hooks/useAgentGraph';
import { AgentCardNode, CARD_NODE_SIZES, type AgentCardNodeData, type CardActions } from './nodes/AgentCardNode';
import { AgentNameNode, NAME_NODE_SIZES, nameNodeData, type AgentNameNodeData } from './nodes/AgentNameNode';
import { WorkspaceFrameNode, type WorkspaceFrameNodeData } from './nodes/WorkspaceFrameNode';
import type { Relation } from './types';

const nodeTypes = { agent: AgentCardNode, name: AgentNameNode, frame: WorkspaceFrameNode };

// Above this many agents full cards get too big to read the graph - draw name-only nodes
const COMPACT_THRESHOLD = 40;
const DIMMED_OPACITY = 0.15;
const BOTTOM_GAP = 16; // px kept free below the graph (page padding)

// Height from the element's top to the bottom of the window - whatever sits above it (page header, tabs)
function useFillViewportHeight() {
  const ref = useRef<HTMLDivElement>(null);
  const [top, setTop] = useState(140);
  useEffect(() => {
    const measure = () => {
      if (ref.current) setTop(ref.current.getBoundingClientRect().top + window.scrollY);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);
  return { ref, height: `calc(100vh - ${top + BOTTOM_GAP}px)` };
}

interface AgentsRelationsGraphProps extends CardActions {
  /** Omit for all agents across workspaces - they are then grouped in a frame per workspace */
  workspaceId?: string;
  refreshKey?: unknown; // Graph refetches when this changes (e.g. after delete/clone in the list), otherwise uses the cache
  topInset?: number; // Extra top space (px) kept free when fitting, e.g. for a toolbar floating over the graph
}

// The given agents plus their callers and callees
function neighbourhood(focused: Set<string>, relations: Relation[]) {
  const ids = new Set(focused);
  for (const r of relations) {
    if (focused.has(r.source)) ids.add(r.target);
    if (focused.has(r.target)) ids.add(r.source);
  }
  return ids;
}

// Agents list graph mode: cards with actions (name-only nodes for big graphs) and name nodes for
// external/missing agents. Click an agent to focus its callers/callees, double-click opens the editor
export function AgentsRelationsGraph({ workspaceId, refreshKey, topInset, ...actions }: AgentsRelationsGraphProps) {
  const navigate = useNavigate();
  const { graph, agents, loading, error } = useAgentGraph(workspaceId ?? ALL_AGENTS, { refreshKey, withAgents: true });
  // A clicked agent or workspace frame (by node id)
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const grouped = workspaceId === undefined;
  const fill = useFillViewportHeight();

  const { baseNodes, relations, compact, bounds } = useMemo(() => {
    const graphNodes = graph?.nodes ?? [];
    const relations = graphRelations(graph?.edges ?? []);
    const compact = graphNodes.length > COMPACT_THRESHOLD;
    const sizes = compact ? NAME_NODE_SIZES : CARD_NODE_SIZES;

    const { positions, frames, bounds } = grouped
      ? workspaceLayout(graphNodes, relations, sizes)
      : { positions: layout(graphNodes, relations, sizes), frames: [], bounds: null };

    const agentById = new Map(agents.map((a) => [a.id, a]));
    const agentNode = (node: AgentGraphNode): Node<AgentCardNodeData | AgentNameNodeData> => {
      const position = positions.get(node.id) ?? { x: 0, y: 0 };
      if (node.missing || compact) {
        const data = nameNodeData(node);
        return {
          id: node.id,
          type: 'name',
          position,
          // Frames already say which workspace an agent is in
          data: {
            ...data,
            external: grouped ? false : data.external,
            width: sizes.nodeWidth,
            hint: 'Click to focus, double-click to open',
          },
        };
      }
      // External agents aren't in the workspace list - card from the graph data (card actions only need the id)
      const agent = agentById.get(node.id) ?? ({
        id: node.id,
        name: node.name,
        workspaceId: node.workspaceId ?? undefined,
        workspaceName: node.workspaceName ?? undefined,
      } as Agent);
      return {
        id: node.id,
        type: 'agent',
        position,
        data: { agent, actions: { ...actions, currentWorkspaceId: workspaceId }, external: node.external },
      };
    };

    const frameNodes: Node<WorkspaceFrameNodeData>[] = frames.map((frame) => ({
      id: frame.id,
      type: 'frame',
      position: { x: frame.x, y: frame.y },
      data: { label: frame.label, width: frame.width, height: frame.height, agentIds: frame.agentIds },
      draggable: false,
      selectable: false,
      zIndex: -1,
    }));
    const agentNodes = graphNodes.map(agentNode);

    return {
      baseNodes: [...frameNodes, ...agentNodes] as Node[],
      relations,
      compact,
      bounds: bounds ?? graphBounds(agentNodes, sizes.nodeWidth),
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- actions are recreated each render of the list
  }, [graph, agents, grouped]);

  // Focus: dim everything outside the clicked agent's callers/callees
  const { nodes, edges } = useMemo(() => {
    // Edge labels clutter a dense graph
    const baseEdges = relationEdges(relations, !compact);
    if (!focusedId) return { nodes: baseNodes, edges: baseEdges };
    // A frame focuses all of its workspace's agents
    const focusedFrame = baseNodes.find((node) => node.id === focusedId && node.type === 'frame');
    const focused = new Set(
      focusedFrame ? (focusedFrame.data as WorkspaceFrameNodeData).agentIds : [focusedId]
    );
    const visible = neighbourhood(focused, relations);
    const dim = (node: Node) => ({ ...node, style: { ...node.style, opacity: DIMMED_OPACITY } });
    const nodes = baseNodes.map((node) => {
      if (node.type !== 'frame') return visible.has(node.id) ? node : dim(node);
      // Frames stay visible while they hold a visible agent
      const agentIds = (node.data as WorkspaceFrameNodeData).agentIds;
      return agentIds.some((id) => visible.has(id)) ? node : dim(node);
    });
    const edges: Edge[] = baseEdges.map((edge) =>
      focused.has(edge.source) || focused.has(edge.target)
        ? { ...edge, animated: true }
        : { ...edge, style: { ...edge.style, opacity: DIMMED_OPACITY } }
    );
    return { nodes, edges };
  }, [baseNodes, relations, compact, focusedId]);

  return (
    <Box ref={fill.ref}>
      <AgentsGraphView
        nodes={nodes}
        edges={edges}
        bounds={bounds}
        nodeTypes={nodeTypes}
        loading={loading}
        error={error}
        style={{ height: fill.height, minHeight: 400 }}
        topInset={topInset}
        nodesDraggable
        onNodeClick={(_, node) => {
          // An agent or a workspace frame; clicking it again clears the focus
          setFocusedId((current) => (current === node.id ? null : node.id));
        }}
        onPaneClick={() => setFocusedId(null)}
        onNodeDoubleClick={(_, node) => {
          if (node.type === 'frame' || (node.data as AgentNameNodeData).missing) return;
          navigate(routes.agentEditor(node.id));
        }}
      />
    </Box>
  );
}
