import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box } from '@mantine/core';
import { applyNodeChanges, type Edge, type Node, type NodeChange, type XYPosition } from '@xyflow/react';
import type { Agent, AgentGraphNode } from '../../types';
import { ALL_AGENTS } from '../../api/agents';
import { AgentsGraphView } from './AgentsGraphView';
import { AgentContextMenu, type AgentContextMenuState } from './AgentContextMenu';
import { graphRelations, relationEdges } from './graph/relations';
import { layout } from './graph/layout';
import { applySavedLayout, fitFrames, frameAnchor, frameOfAgents, nodesBounds } from './graph/savedLayout';
import { workspaceLayout } from './graph/groups';
import { useAgentGraph } from './hooks/useAgentGraph';
import { usePersistedPositions, type Positions } from './hooks/usePersistedPositions';
import { AgentCardNode, CARD_NODE_SIZES, type AgentCardNodeData, type CardActions } from './nodes/AgentCardNode';
import { AgentNameNode, NAME_NODE_SIZES, nameNodeData, type AgentNameNodeData } from './nodes/AgentNameNode';
import { WorkspaceFrameNode, type WorkspaceFrameNodeData } from './nodes/WorkspaceFrameNode';
import type { Relation } from './types';

const nodeTypes = { agent: AgentCardNode, name: AgentNameNode, frame: WorkspaceFrameNode };

// Above this many agents full cards get too big to read the graph - draw name-only nodes
const COMPACT_THRESHOLD = 40;
const DIMMED_OPACITY = 0.15;
const BOTTOM_GAP = 16; // px kept free below the graph (page padding)
const APP_SHELL_PADDING = 16; // AppShell padding="md"
// User-arranged layout per graph scope (a workspace, or all agents)
const LAYOUT_STORAGE_PREFIX = 'agents-graph-layout-v2:';

// Height from the element's top to the bottom of the window - whatever sits above it (page header, tabs)
function useFillViewportHeight(bottomGap = BOTTOM_GAP) {
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
  return { ref, height: `calc(100vh - ${top + bottomGap}px)` };
}

interface AgentsRelationsGraphProps extends CardActions {
  /** Omit for all agents across workspaces - they are then grouped in a frame per workspace */
  workspaceId?: string;
  refreshKey?: unknown; // Graph refetches when this changes (e.g. after delete/clone in the list)
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
// external/missing agents. Click an agent to focus its callers/callees, right-click for its actions menu
export function AgentsRelationsGraph({ workspaceId, refreshKey, topInset, ...actions }: AgentsRelationsGraphProps) {
  const { graph, agents, loading, error } = useAgentGraph(workspaceId ?? ALL_AGENTS, { refreshKey, withAgents: true });
  // A clicked agent or workspace frame (by node id)
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<AgentContextMenuState | null>(null);
  const grouped = workspaceId === undefined;
  // All agents: edge to edge, cancelling the page padding (the toolbar above keeps it)
  const fill = useFillViewportHeight(grouped ? 0 : BOTTOM_GAP);
  const moved = usePersistedPositions(`${LAYOUT_STORAGE_PREFIX}${workspaceId ?? ALL_AGENTS}`);

  const { agentFor, workspaceOf, frameOf, layoutNodes, relations, compact, sizes } = useMemo(() => {
    const graphNodes = graph?.nodes ?? [];
    const relations = graphRelations(graph?.edges ?? []);
    const compact = graphNodes.length > COMPACT_THRESHOLD;
    const sizes = compact ? NAME_NODE_SIZES : CARD_NODE_SIZES;

    const { positions, frames } = grouped
      ? workspaceLayout(graphNodes, relations, sizes)
      : { positions: layout(graphNodes, relations, sizes), frames: [] };

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
            hint: 'Click to focus, right-click for actions',
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
      data: { label: frame.label, workspaceId: frame.workspaceId, width: frame.width, height: frame.height, agentIds: frame.agentIds },
      selectable: false,
      zIndex: -1,
    }));
    const agentNodes = graphNodes.map(agentNode);

    // Agent for the context menu - external agents from the graph data (actions only need the id)
    const graphNodeById = new Map(graphNodes.map((n) => [n.id, n]));
    const agentFor = (id: string): Agent | null => {
      const node = graphNodeById.get(id);
      if (!node || node.missing) return null;
      return agentById.get(id) ?? ({
        id: node.id,
        name: node.name,
        workspaceId: node.workspaceId ?? undefined,
        workspaceName: node.workspaceName ?? undefined,
      } as Agent);
    };

    // Workspace of an agent, for its saved position
    const workspaceOf = (id: string) => graphNodeById.get(id)?.workspaceId ?? null;
    const layoutNodes = [...frameNodes, ...agentNodes] as Node[];

    return {
      agentFor,
      workspaceOf,
      frameOf: frameOfAgents(layoutNodes),
      layoutNodes,
      relations,
      compact,
      sizes,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- actions are recreated each render of the list
  }, [graph, agents, grouped]);

  // User-arranged layout on top of the auto layout
  const baseNodes = useMemo(
    () => applySavedLayout(layoutNodes, moved.positions, workspaceOf, sizes),
    [layoutNodes, moved.positions, workspaceOf, sizes]
  );

  // Fit to the saved layout on first load / reset / another scope only - not while dragging, and not when
  // the graph is refetched (e.g. an agent moved to another workspace), so the canvas doesn't jump
  const hasNodes = layoutNodes.length > 0;
  const bounds = useMemo(
    () => nodesBounds(applySavedLayout(layoutNodes, moved.initial, workspaceOf, sizes), sizes),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- layoutNodes/workspaceOf read at those moments only
    [hasNodes, moved.initial, sizes]
  );

  // Focus: dim everything outside the clicked agent's callers/callees
  const focus = useMemo(() => {
    if (!focusedId) return null;
    // A frame focuses all of its workspace's agents
    const focusedFrame = layoutNodes.find((node) => node.id === focusedId && node.type === 'frame');
    const focused = new Set(
      focusedFrame ? (focusedFrame.data as WorkspaceFrameNodeData).agentIds : [focusedId]
    );
    return { focused, visible: neighbourhood(focused, relations) };
  }, [layoutNodes, relations, focusedId]);

  const focusedNodes = useMemo(() => {
    if (!focus) return baseNodes;
    const dim = (node: Node) => ({ ...node, style: { ...node.style, opacity: DIMMED_OPACITY } });
    return baseNodes.map((node) => {
      if (node.type !== 'frame') return focus.visible.has(node.id) ? node : dim(node);
      // Frames stay visible while they hold a visible agent
      const agentIds = (node.data as WorkspaceFrameNodeData).agentIds;
      return agentIds.some((id) => focus.visible.has(id)) ? node : dim(node);
    });
  }, [baseNodes, focus]);

  // Edges don't depend on node positions - unchanged while dragging
  const edges = useMemo(() => {
    // Edge labels clutter a dense graph
    const baseEdges = relationEdges(relations, !compact);
    if (!focus) return baseEdges;
    return baseEdges.map((edge): Edge =>
      focus.focused.has(edge.source) || focus.focused.has(edge.target)
        ? { ...edge, animated: true }
        : { ...edge, style: { ...edge.style, opacity: DIMMED_OPACITY } }
    );
  }, [relations, compact, focus]);

  // React Flow drags on local node state; positions are saved only when the drag ends
  const [nodes, setNodes] = useState<Node[]>(focusedNodes);
  // Keep measured sizes from the current nodes, otherwise React Flow re-measures them (flash)
  useEffect(() => {
    setNodes((prev) => {
      const measured = new Map(prev.map((node) => [node.id, node.measured]));
      const next = focusedNodes.map((node) => {
        const size = measured.get(node.id);
        return size ? { ...node, measured: size } : node;
      });
      // Refit frames with the real node sizes, as while dragging
      return fitFrames(next, sizes);
    });
  }, [focusedNodes, sizes]);
  const draggedIds = useRef(new Set<string>());
  const [dragEnded, setDragEnded] = useState(0);

  // Save after the drag's last move has rendered: every frame's anchor (so frames stay put when the auto
  // layout repacks), dragged agents relative to their frame's anchor (graph/savedLayout.ts)
  useEffect(() => {
    if (!draggedIds.current.size) return;
    const current = new Map(nodes.map((node) => [node.id, node]));
    const before = new Map(baseNodes.map((node) => [node.id, node]));
    const updates: Positions = {};
    for (const layoutFrame of layoutNodes) {
      if (layoutFrame.type !== 'frame') continue;
      const anchor = frameAnchor(layoutFrame, moved.positions);
      const node = current.get(layoutFrame.id);
      const old = before.get(layoutFrame.id);
      // A dragged frame's anchor moves by the drag distance
      const dragged = draggedIds.current.has(layoutFrame.id) && node && old;
      updates[layoutFrame.id] = dragged
        ? { x: anchor.x + node.position.x - old.position.x, y: anchor.y + node.position.y - old.position.y }
        : anchor;
    }
    for (const id of draggedIds.current) {
      const node = current.get(id);
      if (!node || node.type === 'frame') continue;
      const anchor = updates[frameOf.get(id) ?? ''] ?? { x: 0, y: 0 };
      updates[id] = { x: node.position.x - anchor.x, y: node.position.y - anchor.y, workspaceId: workspaceOf(id) };
    }
    draggedIds.current.clear();
    moved.persist({ ...moved.positions, ...updates });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- only on drag end
  }, [dragEnded]);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    let dragEnded = false;
    const moves = new Map<string, XYPosition>();
    for (const change of changes) {
      if (change.type !== 'position') continue;
      if (change.dragging === false) dragEnded = true;
      if (change.position) moves.set(change.id, change.position);
    }
    setNodes((prev) => {
      // Size/selection changes too - nodes keep their measured size, so React Flow doesn't re-measure (flash)
      const applied = applyNodeChanges(changes, prev);
      if (!moves.size) return applied;
      const byId = new Map(prev.map((node) => [node.id, node]));
      const carried = new Map<string, XYPosition>();
      // A frame carries its workspace's agents along
      for (const [id, position] of moves) {
        draggedIds.current.add(id);
        const node = byId.get(id);
        if (node?.type !== 'frame') continue;
        const dx = position.x - node.position.x;
        const dy = position.y - node.position.y;
        for (const agentId of (node.data as WorkspaceFrameNodeData).agentIds) {
          const agent = byId.get(agentId);
          if (!agent || moves.has(agentId)) continue;
          carried.set(agentId, { x: agent.position.x + dx, y: agent.position.y + dy });
        }
      }
      const withCarried = carried.size
        ? applied.map((node) => {
          const position = carried.get(node.id);
          return position ? { ...node, position } : node;
        })
        : applied;
      // Frames follow their agents while dragging
      return fitFrames(withCarried, sizes);
    });
    if (dragEnded) setDragEnded((n) => n + 1);
  }, [sizes]);

  return (
    <Box
      ref={fill.ref}
      style={grouped ? {
        // All sides, incl. bottom - otherwise the page padding below the full-height graph scrolls
        margin: 'calc(var(--app-shell-padding) * -1)',
      } : undefined}
    >
      <AgentsGraphView
        nodes={nodes}
        edges={edges}
        bounds={bounds}
        nodeTypes={nodeTypes}
        loading={loading}
        error={error}
        style={{ height: fill.height, minHeight: 400 }}
        // The toolbar keeps the page padding the graph cancels
        topInset={grouped && topInset ? topInset + APP_SHELL_PADDING : topInset}
        nodesDraggable
        onNodesChange={onNodesChange}
        onResetLayout={Object.keys(moved.positions).length ? moved.reset : undefined}
        onNodeClick={(_, node) => {
          // An agent or a workspace frame; clicking it again clears the focus
          setFocusedId((current) => (current === node.id ? null : node.id));
        }}
        onPaneClick={() => setFocusedId(null)}
        onNodeContextMenu={(event, node) => {
          const agent = agentFor(node.id);
          if (!agent) return;
          event.preventDefault();
          setContextMenu({ agent, x: event.clientX, y: event.clientY });
        }}
      />
      <AgentContextMenu
        menu={contextMenu}
        actions={{ ...actions, currentWorkspaceId: workspaceId }}
        onClose={() => setContextMenu(null)}
      />
    </Box>
  );
}
