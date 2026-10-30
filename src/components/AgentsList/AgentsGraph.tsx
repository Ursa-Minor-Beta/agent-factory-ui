import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Position,
  Handle,
  type Node,
  type Edge,
  type NodeProps,
  type Viewport,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './AgentsGraph.css';
import { Alert, Box, Center, Loader, Paper, Text, Tooltip, useComputedColorScheme } from '@mantine/core';
import { useElementSize } from '@mantine/hooks';
import { IconAlertCircle } from '@tabler/icons-react';
import { agentsApi } from '../../api';
import type { Agent, NodeStatus } from '../../types';
import { routes } from '../../config/routes';
import { AgentCard } from './AgentCard';
import type { AgentCardProps } from './types';

interface GraphSizes {
  nodeWidth: number;
  slot: number; // node width + horizontal gap
  rowGap: number;
}

// Full AgentCard nodes (agents list) vs. name-only nodes (editor side panel)
const CARD_SIZES: GraphSizes = { nodeWidth: 300, slot: 380, rowGap: 240 };
const COMPACT_SIZES: GraphSizes = { nodeWidth: 160, slot: 190, rowGap: 90 };

interface Relation {
  source: string;
  target: string;
  via: 'agent' | 'tool';
}

type CardActions = Omit<AgentCardProps, 'agent'>;
type AgentNodeData = { agent: Agent; actions?: CardActions; current: boolean; isNew?: boolean; runStatus?: NodeStatus };

const NEW_AGENT_NODE_ID = '__new-agent__';

// Walk node data recursively: `agent` nodes hold data.agentId, LLM tool definitions hold { agentId }
function collectAgentIds(value: unknown, out: Set<string>) {
  if (Array.isArray(value)) {
    value.forEach((v) => collectAgentIds(v, out));
  } else if (value && typeof value === 'object') {
    for (const [key, v] of Object.entries(value)) {
      if (key === 'agentId' && typeof v === 'string' && v) out.add(v);
      else collectAgentIds(v, out);
    }
  }
}

function extractRelations(agents: Agent[]): Relation[] {
  const known = new Set(agents.map((a) => a.id));
  const relations = new Map<string, Relation>();
  for (const agent of agents) {
    for (const node of agent.nodes ?? []) {
      const ids = new Set<string>();
      collectAgentIds(node.data, ids);
      for (const target of ids) {
        if (!known.has(target)) continue;
        const key = `${agent.id}->${target}`;
        // A direct agent node wins over a tool reference for the edge style
        if (!relations.has(key) || node.type === 'agent') {
          relations.set(key, { source: agent.id, target, via: node.type === 'agent' ? 'agent' : 'tool' });
        }
      }
    }
  }
  return [...relations.values()];
}

const ORDER_SWEEPS = 6;
const POSITION_SWEEPS = 8;

const average = (values: number[]) => values.reduce((s, v) => s + v, 0) / values.length;

/**
 * Layered (Sugiyama-style) layout of the call graph:
 *  1. Layering   - each agent's row = longest call path from a root, so callees always sit below callers
 *  2. Ordering   - start from DFS order (keeps siblings together), then barycenter sweeps
 *                  down/up to reduce edge crossings
 *  3. Placement  - pull each agent toward the average x of its callers/callees, keeping min spacing
 * Agents without any relations are put in a grid below the tree.
 */
function layout(
  agents: Agent[],
  relations: Relation[],
  { slot: SLOT, rowGap: ROW_GAP }: GraphSizes,
): Map<string, { x: number; y: number }> {
  const nameOf = new Map(agents.map((a) => [a.id, a.name]));
  const byName = (a: string, b: string) => nameOf.get(a)!.localeCompare(nameOf.get(b)!);
  const children = new Map<string, string[]>();
  const parents = new Map<string, string[]>();
  relations.forEach((r) => {
    if (r.source === r.target) return;
    children.set(r.source, [...(children.get(r.source) ?? []), r.target]);
    parents.set(r.target, [...(parents.get(r.target) ?? []), r.source]);
  });
  children.forEach((list) => list.sort(byName));

  const connected = agents.map((a) => a.id).filter((id) => children.has(id) || parents.has(id));
  const isolated = agents.map((a) => a.id).filter((id) => !children.has(id) && !parents.has(id)).sort(byName);

  // 1. Layering. Roots are agents nobody calls; members of a pure cycle fall back to being roots.
  const depth = new Map<string, number>();
  const visit = (id: string, d: number, path: Set<string>) => {
    if (path.has(id) || (depth.get(id) ?? -1) >= d) return;
    depth.set(id, d);
    path.add(id);
    (children.get(id) ?? []).forEach((c) => visit(c, d + 1, path));
    path.delete(id);
  };
  const roots = connected.filter((id) => !parents.has(id)).sort(byName);
  roots.forEach((id) => visit(id, 0, new Set()));
  connected.forEach((id) => { if (!depth.has(id)) visit(id, 0, new Set()); });

  // 2. Ordering. Initial order = DFS pre-order so each subtree starts out contiguous.
  const rank = new Map<string, number>();
  let counter = 0;
  const dfs = (id: string) => {
    if (rank.has(id)) return;
    rank.set(id, counter++);
    (children.get(id) ?? []).forEach(dfs);
  };
  [...roots, ...connected].forEach(dfs);

  const maxDepth = Math.max(0, ...depth.values());
  const layers: string[][] = Array.from({ length: maxDepth + 1 }, () => []);
  connected.forEach((id) => layers[depth.get(id)!].push(id));
  layers.forEach((layer) => layer.sort((a, b) => rank.get(a)! - rank.get(b)!));

  const index = new Map<string, number>();
  const reindex = () => layers.forEach((layer) => layer.forEach((id, i) => index.set(id, i)));
  reindex();

  const sortByBarycenter = (layer: string[], neighbours: Map<string, string[]>) => {
    const bary = new Map(layer.map((id) => {
      const ns = neighbours.get(id) ?? [];
      return [id, ns.length ? average(ns.map((n) => index.get(n)!)) : index.get(id)!];
    }));
    layer.sort((a, b) => bary.get(a)! - bary.get(b)! || index.get(a)! - index.get(b)!);
  };
  for (let sweep = 0; sweep < ORDER_SWEEPS; sweep++) {
    if (sweep % 2 === 0) {
      for (let d = 1; d <= maxDepth; d++) { sortByBarycenter(layers[d], parents); reindex(); }
    } else {
      for (let d = maxDepth - 1; d >= 0; d--) { sortByBarycenter(layers[d], children); reindex(); }
    }
  }

  // 3. Placement. Start packed, then pull toward neighbours while keeping order and spacing.
  const x = new Map<string, number>();
  layers.forEach((layer) => layer.forEach((id, i) => x.set(id, i * SLOT)));

  const placeLayer = (layer: string[], neighbours: Map<string, string[]>) => {
    const desired = layer.map((id) => {
      const ns = neighbours.get(id) ?? [];
      return ns.length ? average(ns.map((n) => x.get(n)!)) : x.get(id)!;
    });
    // Resolve overlaps pushing right and pushing left, average both so crowded groups stay centred
    const right = [...desired];
    for (let i = 1; i < right.length; i++) right[i] = Math.max(right[i], right[i - 1] + SLOT);
    const left = [...desired];
    for (let i = left.length - 2; i >= 0; i--) left[i] = Math.min(left[i], left[i + 1] - SLOT);
    const placed = desired.map((_, i) => (left[i] + right[i]) / 2);
    for (let i = 1; i < placed.length; i++) placed[i] = Math.max(placed[i], placed[i - 1] + SLOT);
    layer.forEach((id, i) => x.set(id, placed[i]));
  };
  for (let sweep = 0; sweep < POSITION_SWEEPS; sweep++) {
    if (sweep % 2 === 0) {
      for (let d = maxDepth - 1; d >= 0; d--) placeLayer(layers[d], children);
    } else {
      for (let d = 1; d <= maxDepth; d++) placeLayer(layers[d], parents);
    }
  }

  const positions = new Map<string, { x: number; y: number }>();
  layers.forEach((layer, d) => layer.forEach((id) => positions.set(id, { x: x.get(id)!, y: d * ROW_GAP })));

  // Isolated agents: grid under the tree, aligned to its left edge
  const minX = connected.length ? Math.min(...x.values()) : 0;
  const top = connected.length ? (maxDepth + 1) * ROW_GAP + ROW_GAP : 0;
  const perRow = Math.max(4, ...layers.map((l) => l.length));
  isolated.forEach((id, i) => {
    positions.set(id, { x: minX + (i % perRow) * SLOT, y: top + Math.floor(i / perRow) * ROW_GAP });
  });
  return positions;
}

function AgentRelationNode({ data }: NodeProps<Node<AgentNodeData>>) {
  const { agent, actions } = data;
  return (
    <Box style={{ width: CARD_SIZES.nodeWidth, boxShadow: 'var(--mantine-shadow-xs)' }}>
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      {actions && <AgentCard agent={agent} {...actions} />}
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </Box>
  );
}

function CompactAgentNode({ data }: NodeProps<Node<AgentNodeData>>) {
  const { agent, current, isNew, runStatus } = data;
  return (
    <Paper
      withBorder
      className={runStatus ? `agents-graph-run-${runStatus}` : undefined}
      radius="md"
      px="xs"
      py={6}
      style={{
        width: COMPACT_SIZES.nodeWidth,
        cursor: current ? 'default' : 'pointer',
        // background: current
        //   ? 'light-dark(var(--mantine-color-cyan-0), var(--mantine-color-cyan-9))'
        //   : 'light-dark(var(--mantine-color-white), var(--mantine-color-dark-6))',
        boxShadow: current ? '0 0 0 2px var(--mantine-color-cyan-5)' : 'var(--mantine-shadow-xs)',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Tooltip label={current ? null : 'Switch to the agent'} openDelay={1000}>
        <Text size="xs" ta="center" truncate fs={isNew ? 'italic' : undefined}>
          {agent.name}
        </Text>
    </Tooltip>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </Paper>
  );
}

const cardNodeTypes = { agent: AgentRelationNode };
const compactNodeTypes = { agent: CompactAgentNode };

const FIT_PADDING = 16; // px around the graph
const FIT_MAX_ZOOM = 1; // never enlarge small graphs

interface AgentsGraphProps extends Partial<CardActions> {
  workspaceId?: string; // If provided, only agents of this workspace are shown
  refreshKey?: unknown; // Graph refetches when this changes (e.g. after delete/clone in the list), otherwise uses the cache
  compact?: boolean; // Name-only nodes that fill the parent (editor side panel); click opens the agent's editor
  currentAgentId?: string; // Highlighted agent
  runStatuses?: Record<string, NodeStatus>; // Editor run status per agent - running agents get a shadow
  newAgent?: boolean; // Show an empty highlighted placeholder for an unsaved agent (editor on /new)
  topInset?: number; // Extra top space (px) kept free when fitting, e.g. for a toolbar floating over the graph
}

export function AgentsGraph(props: AgentsGraphProps) {
  // Own provider so the graph never shares the agent editor's React Flow store
  return (
    <ReactFlowProvider>
      <AgentsGraphInner {...props} />
    </ReactFlowProvider>
  );
}

function AgentsGraphInner({ workspaceId, refreshKey, compact, currentAgentId, runStatuses, newAgent, topInset = 0, ...handlers }: AgentsGraphProps) {
  const navigate = useNavigate();
  const colorScheme = useComputedColorScheme('dark');
  const [agents, setAgents] = useState<Agent[]>(() => agentsApi.listAllWithNodes.peek(workspaceId) ?? []);
  const [loading, setLoading] = useState(() => !agentsApi.listAllWithNodes.peek(workspaceId));
  const [error, setError] = useState<string | null>(null);
  const agentsRef = useRef(agents);
  agentsRef.current = agents;

  // Cache is dropped by any agent mutation (api/agents.ts); refreshKey/currentAgentId re-check it.
  // Also refetch when the current agent is missing (e.g. just created) even if a cache exists.
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

  const sizes = compact ? COMPACT_SIZES : CARD_SIZES;
  const actions = compact ? undefined : (handlers as CardActions);

  // Layout - recomputed only when the graph itself changes, never on run status updates
  const { layoutNodes, edges, bounds } = useMemo(() => {
    const relations = extractRelations(agents);
    const positions = layout(agents, relations, sizes);
    const layoutNodes: Node<AgentNodeData>[] = agents.map((agent) => ({
      id: agent.id,
      type: 'agent',
      position: positions.get(agent.id) ?? { x: 0, y: 0 },
      data: { agent, actions, current: agent.id === currentAgentId },
    }));
    if (newAgent) {
      // Placeholder below everything, centred horizontally
      const xs = layoutNodes.map((n) => n.position.x);
      const centerX = layoutNodes.length ? (Math.min(...xs) + Math.max(...xs)) / 2 : 0;
      const bottomY = layoutNodes.length ? Math.max(...layoutNodes.map((n) => n.position.y)) + sizes.rowGap : 0;
      layoutNodes.push({
        id: NEW_AGENT_NODE_ID,
        type: 'agent',
        position: { x: centerX, y: bottomY },
        data: { agent: { id: NEW_AGENT_NODE_ID, name: 'New agent' } as Agent, current: true, isNew: true },
      });
    }
    const edges: Edge[] = relations.map((r) => ({
      id: `${r.source}->${r.target}`,
      source: r.source,
      target: r.target,
      label: compact ? undefined : r.via,
    }));
    // Horizontal extent straight from the layout - no need to wait for React Flow to measure nodes
    const xs = layoutNodes.map((n) => n.position.x);
    const ys = layoutNodes.map((n) => n.position.y);
    const bounds = layoutNodes.length
      ? { minX: Math.min(...xs), maxX: Math.max(...xs) + sizes.nodeWidth, minY: Math.min(...ys) }
      : null;
    return { layoutNodes, edges, bounds };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- handlers are recreated each render of the list
  }, [agents, compact, currentAgentId, newAgent]);

  // Run statuses applied on top; untouched nodes keep their identity so React Flow skips them
  const nodes = useMemo(() => {
    if (!runStatuses) return layoutNodes;
    return layoutNodes.map((node) => {
      const runStatus = runStatuses[node.id];
      return runStatus ? { ...node, data: { ...node.data, runStatus } } : node;
    });
  }, [layoutNodes, runStatuses]);


  // Fit to width, centred horizontally, pinned to the top. Recomputed on container resize or new data;
  // controlled viewport so it applies immediately, while pan/zoom still update it via onViewportChange.
  const { ref: containerRef, width: containerWidth } = useElementSize();
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, zoom: 1 });
  
  useEffect(() => {
    if (!bounds || containerWidth === 0) return;
    const graphWidth = bounds.maxX - bounds.minX;
    const zoom = Math.min(FIT_MAX_ZOOM, (containerWidth - FIT_PADDING * 2) / graphWidth);
    setViewport({
      x: (containerWidth - graphWidth * zoom) / 2 - bounds.minX * zoom,
      y: FIT_PADDING + topInset - bounds.minY * zoom,
      zoom,
    });
  }, [bounds, containerWidth, topInset]);

  return (
    <Box
      style={compact
        ? { display: 'flex', flexDirection: 'column', height: '100%' }
        : { display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)', minHeight: 400 }}
    >

      {error && (
        <Alert icon={<IconAlertCircle size={16} />} color="red" mb="md">{error}</Alert>
      )}

      <Paper ref={containerRef} style={{ flex: 1, overflow: 'hidden' }}>
        {loading ? (
          <Center h="100%"><Loader /></Center>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={compact ? compactNodeTypes : cardNodeTypes}
            className="agents-graph"
            colorMode={colorScheme}
            viewport={viewport}
            onViewportChange={setViewport}
            minZoom={0.05}
            nodesConnectable={false}
            nodesDraggable={!compact}
            onNodeClick={compact ? (event, node) => {
              if (node.id === NEW_AGENT_NODE_ID) return;
              // Cmd/Ctrl+click opens in a new tab, like a link
              if (event.metaKey || event.ctrlKey) window.open(routes.agentEditor(node.id), '_blank');
              else if (node.id !== currentAgentId) navigate(routes.agentEditor(node.id));
            } : undefined}
            onNodeDoubleClick={compact ? undefined : (_, node) => navigate(routes.agentEditor(node.id))}
            proOptions={{ hideAttribution: true }}
          >
            <Background />
          </ReactFlow>
        )}
      </Paper>

    </Box>
  );
}
