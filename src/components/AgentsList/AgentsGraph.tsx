import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ReactFlow,
  Background,
  MarkerType,
  Position,
  Handle,
  type Node,
  type Edge,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './AgentsGraph.css';
import { Alert, Box, Center, Loader, Paper, useComputedColorScheme } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { agentsApi } from '../../api';
import type { Agent } from '../../types';
import { routes } from '../../config/routes';
import { AgentCard } from './AgentCard';
import type { AgentCardProps } from './types';

const NODE_WIDTH = 300;
const COL_GAP = 80;
const ROW_GAP = 240;

interface Relation {
  source: string;
  target: string;
  via: 'agent' | 'tool';
}

type CardActions = Omit<AgentCardProps, 'agent'>;
type AgentNodeData = { agent: Agent; actions: CardActions };

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

const SLOT = NODE_WIDTH + COL_GAP;
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
function layout(agents: Agent[], relations: Relation[]): Map<string, { x: number; y: number }> {
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
    <Box style={{ width: NODE_WIDTH, boxShadow: 'var(--mantine-shadow-xs)' }}>
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <AgentCard agent={agent} {...actions} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </Box>
  );
}

const nodeTypes = { agent: AgentRelationNode };

const PAGE_SIZE = 100; // backend max for list

// In-memory cache per workspace: survives in-app navigation, cleared on page reload
const agentsCache = new Map<string, Agent[]>();

async function fetchAllAgents(workspaceId?: string): Promise<Agent[]> {
  const listed: Agent[] = [];
  let total = Infinity;
  while (listed.length < total) {
    const page = await agentsApi.list({ workspaceId, skip: listed.length, limit: PAGE_SIZE });
    listed.push(...page.agents);
    total = page.total;
    if (page.agents.length === 0) break;
  }
  // List omits nodes, so fetch each agent's definition; keep list fields (workspaceName, nodesCount) for the card
  return Promise.all(listed.map(async (a) => ({ ...a, nodes: (await agentsApi.getById(a.id)).nodes })));
}

interface AgentsGraphProps extends CardActions {
  workspaceId?: string; // If provided, only agents of this workspace are shown
  refreshKey?: unknown; // Graph refetches when this changes (e.g. after delete/clone in the list), otherwise uses the cache
}

export function AgentsGraph({ workspaceId, refreshKey, ...actions }: AgentsGraphProps) {
  const navigate = useNavigate();
  const colorScheme = useComputedColorScheme('dark');
  const cacheKey = workspaceId ?? '';
  const [agents, setAgents] = useState<Agent[]>(() => agentsCache.get(cacheKey) ?? []);
  const [loading, setLoading] = useState(() => !agentsCache.has(cacheKey));
  const [error, setError] = useState<string | null>(null);
  const loadedRefreshKey = useRef(refreshKey);

  useEffect(() => {
    const cached = agentsCache.get(cacheKey);
    if (cached && loadedRefreshKey.current === refreshKey) {
      setAgents(cached);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const full = await fetchAllAgents(workspaceId);
        agentsCache.set(cacheKey, full);
        loadedRefreshKey.current = refreshKey;
        if (!cancelled) setAgents(full);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load agents');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [cacheKey, workspaceId, refreshKey]);

  const { nodes, edges } = useMemo(() => {
    const relations = extractRelations(agents);
    const positions = layout(agents, relations);
    const nodes: Node<AgentNodeData>[] = agents.map((agent) => ({
      id: agent.id,
      type: 'agent',
      position: positions.get(agent.id) ?? { x: 0, y: 0 },
      data: { agent, actions },
    }));
    const edges: Edge[] = relations.map((r) => ({
      id: `${r.source}->${r.target}`,
      source: r.source,
      target: r.target,
      label: r.via,
      markerEnd: { type: MarkerType.ArrowClosed },
      style: { stroke: r.via === 'tool' ? 'var(--mantine-color-violet-5)' : 'var(--mantine-color-cyan-5)' },
    }));
    return { nodes, edges };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- handlers are recreated each render of the list
  }, [agents]);

  return (
    <Box style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 200px)', minHeight: 400 }}>

      {error && (
        <Alert icon={<IconAlertCircle size={16} />} color="red" mb="md">{error}</Alert>
      )}

      <Paper style={{ flex: 1, overflow: 'hidden' }}>
        {loading ? (
          <Center h="100%"><Loader /></Center>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            className="agents-graph"
            colorMode={colorScheme}
            fitView
            nodesConnectable={false}
            onNodeDoubleClick={(_, node) => navigate(routes.agentEditor(node.id))}
            proOptions={{ hideAttribution: true }}
          >
            <Background />
          </ReactFlow>
        )}
      </Paper>

    </Box>
  );
}
