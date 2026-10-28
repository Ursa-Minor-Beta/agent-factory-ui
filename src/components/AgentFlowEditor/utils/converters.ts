import { Position, type Node, type Edge } from '@xyflow/react';
import type { AgentNode } from '../../../types/agent';

// Top-level ordering field; kept in flow node data while editing, lifted out on save
export const RUN_AFTER_KEY = 'runAfter';

// Input/output nodes don't take part in runAfter ordering
export const canRunAfter = (type: string | undefined) => type !== 'input' && type !== 'output';

export function getRunAfter(data: Record<string, unknown> | undefined): string[] {
  const value = data?.[RUN_AFTER_KEY];
  return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string' && !!id.trim()) : [];
}

// Convert AgentNode to React Flow Node
export function toFlowNode(agentNode: AgentNode, index: number): Node {
  return {
    id: agentNode.id,
    type: agentNode.type,
    position: agentNode.position || { x: index * 200, y: 100 },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
    data: {
      label: agentNode.type.toUpperCase(),
      ...agentNode.data,
      ...(agentNode.runAfter?.length ? { [RUN_AFTER_KEY]: agentNode.runAfter } : {}),
    },
  };
}

// Convert React Flow Node to AgentNode
export function toAgentNode(flowNode: Node): AgentNode {
  const { label, [RUN_AFTER_KEY]: _runAfter, ...data } = flowNode.data as Record<string, unknown>;
  const runAfter = getRunAfter(flowNode.data);
  return {
    id: flowNode.id,
    type: flowNode.type || 'default',
    position: flowNode.position,
    ...(runAfter.length ? { runAfter } : {}),
    data,
  };
}

// Template variable regex patterns
// Matches entire template variable for splitting: {{node: name.output.field}}
export const TEMPLATE_VAR_REGEX = /(\{\{node:\s*[^}]+\}\})/g;
// Extracts node ID from template variable: {{node: nodeId.output.field}} -> nodeId
export const TEMPLATE_NODE_ID_REGEX = /\{\{node:\s*([^.}\s]+)/;
// Global version for extracting all node IDs from a string
const TEMPLATE_NODE_ID_REGEX_GLOBAL = /\{\{node:\s*([^.}\s]+)/g;

// Extract referenced node IDs from node data
export function extractReferencedNodeIds(data: Record<string, unknown>): Set<string> {
  const refs = new Set<string>();
  const dataStr = JSON.stringify(data);
  let match: RegExpExecArray | null;
  TEMPLATE_NODE_ID_REGEX_GLOBAL.lastIndex = 0;
  while ((match = TEMPLATE_NODE_ID_REGEX_GLOBAL.exec(dataStr)) !== null) {
    refs.add(match[1].trim());
  }
  return refs;
}

// Source handle ID for a branch node's branch (one handle per branch)
export const branchHandleId = (index: number) => `branch-${index}`;

type BranchTarget = { sourceHandle: string; target: string };

// Extract targets listed in branch node's branches[].nodes, keyed by branch handle
export function extractBranchTargets(type: string | undefined, data: Record<string, unknown>): BranchTarget[] {
  const targets: BranchTarget[] = [];
  if (type !== 'branch' || !Array.isArray(data.branches)) return targets;
  data.branches.forEach((branch, index) => {
    const branchNodes = (branch as { nodes?: unknown })?.nodes;
    if (!Array.isArray(branchNodes)) return;
    const sourceHandle = branchHandleId(index);
    branchNodes.forEach((id) => {
      if (typeof id !== 'string' || !id.trim()) return;
      const target = id.trim();
      if (!hasBranchTarget(targets, sourceHandle, target)) targets.push({ sourceHandle, target });
    });
  });
  return targets;
}

function hasBranchTarget(targets: BranchTarget[], sourceHandle: string | null | undefined, target: string) {
  return targets.some((t) => t.sourceHandle === sourceHandle && t.target === target);
}

// Build edge, branch edges are bound to a specific source handle
export function buildEdge(source: string, target: string, sourceHandle?: string): Edge {
  return sourceHandle
    ? { id: `${source}-${sourceHandle}-${target}`, source, sourceHandle, target }
    : { id: `${source}-${target}`, source, target };
}

// Ordering-only edge (target.runAfter includes source), no data is passed
export function buildRunAfterEdge(source: string, target: string): Edge {
  return { id: `${source}-runAfter-${target}`, source, target, className: 'edge-run-after', data: { runAfter: true } };
}

export const isRunAfterEdge = (edge: Edge) => edge.data?.runAfter === true;

// runAfter ids of a node, limited to existing nodes that can take part in ordering
function getRunAfterSources(nodes: Node[], node: Node | undefined, data: Record<string, unknown>): string[] {
  if (!node || !canRunAfter(node.type)) return [];
  return getRunAfter(data).filter((id) => canRunAfter(nodes.find((n) => n.id === id)?.type));
}

// Extract edges from node data (looking for references like {{node:id.path}},
// branch node targets in branches[].nodes and runAfter ordering dependencies)
export function extractEdges(nodes: Node[]): Edge[] {
  const edges: Edge[] = [];
  const nodeIds = new Set(nodes.map((n) => n.id));

  const pushEdge = (edge: Edge) => {
    if (edge.source === edge.target || !nodeIds.has(edge.source) || !nodeIds.has(edge.target)) return;
    if (!edges.some((e) => e.id === edge.id)) edges.push(edge);
  };

  nodes.forEach((node) => {
    const data = node.data as Record<string, unknown>;
    extractReferencedNodeIds(data).forEach((sourceId) => pushEdge(buildEdge(sourceId, node.id)));
    extractBranchTargets(node.type, data).forEach((t) => pushEdge(buildEdge(node.id, t.target, t.sourceHandle)));
    getRunAfterSources(nodes, node, data).forEach((sourceId) => pushEdge(buildRunAfterEdge(sourceId, node.id)));
  });

  return edges;
}

// Re-sync edges connected to a node after its data changed
export function syncNodeEdges(edges: Edge[], nodes: Node[], nodeId: string, data: Record<string, unknown>): Edge[] {
  const node = nodes.find((n) => n.id === nodeId);
  const existingNodeIds = new Set(nodes.map((n) => n.id));
  const referencedIds = extractReferencedNodeIds(data);
  const branchTargets = extractBranchTargets(node?.type, data);
  const runAfterIds = getRunAfterSources(nodes, node, data);

  const updatedEdges = edges.filter((e) => {
    if (isRunAfterEdge(e)) return e.target !== nodeId || runAfterIds.includes(e.source);
    if (e.target === nodeId) {
      // Keep incoming edges that are referenced, or come from a branch handle listing this node
      if (!e.sourceHandle) return referencedIds.has(e.source);
      const source = nodes.find((n) => n.id === e.source);
      return !!source && hasBranchTarget(extractBranchTargets(source.type, source.data as Record<string, unknown>), e.sourceHandle, nodeId);
    }
    if (e.source === nodeId && node?.type === 'branch') {
      // Branch handle edges must match branches[].nodes, plain edges must still be referenced by the target
      if (e.sourceHandle) return hasBranchTarget(branchTargets, e.sourceHandle, e.target);
      const target = nodes.find((n) => n.id === e.target);
      return !!target && extractReferencedNodeIds(target.data as Record<string, unknown>).has(nodeId);
    }
    return true;
  });

  const pushEdge = (edge: Edge) => {
    if (edge.source === edge.target || !existingNodeIds.has(edge.source) || !existingNodeIds.has(edge.target)) return;
    if (!updatedEdges.some((e) => e.id === edge.id)) updatedEdges.push(edge);
  };

  referencedIds.forEach((sourceId) => pushEdge(buildEdge(sourceId, nodeId)));
  branchTargets.forEach((t) => pushEdge(buildEdge(nodeId, t.target, t.sourceHandle)));
  runAfterIds.forEach((sourceId) => pushEdge(buildRunAfterEdge(sourceId, nodeId)));

  return updatedEdges;
}

// True if target is reachable from source over edges (adding source -> ... would close a cycle)
export function isReachable(edges: Edge[], from: string, to: string): boolean {
  const visited = new Set<string>();
  const stack = [from];
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (id === to) return true;
    if (visited.has(id)) continue;
    visited.add(id);
    edges.forEach((e) => { if (e.source === id) stack.push(e.target); });
  }
  return false;
}

// Generate unique node ID
export function generateNodeId(type: string, existingNodes: Node[]): string {
  // Input and output nodes are unique - no numeric suffix needed
  if (type === 'input' || type === 'output') {
    return type;
  }
  const typeNodes = existingNodes.filter((n) => n.id.startsWith(`${type}`));
  return `${type}-${typeNodes.length + 1}`;
}

export type LayoutDirection = 'LR' | 'TB';

// Auto-layout nodes with parallel branches support
// direction: 'LR' = Left to Right, 'TB' = Top to Bottom
export function autoLayoutNodes(nodes: Node[], edges: Edge[], direction: LayoutDirection = 'LR'): Node[] {
  if (nodes.length === 0) return nodes;

  const NODE_WIDTH = 150;
  const NODE_HEIGHT = 80;
  const H_GAP = 70;
  const V_GAP = 50;

  // Build adjacency: source -> targets
  const outgoing = new Map<string, string[]>();
  const incoming = new Map<string, string[]>();

  edges.forEach((e) => {
    if (!outgoing.has(e.source)) outgoing.set(e.source, []);
    outgoing.get(e.source)!.push(e.target);
    if (!incoming.has(e.target)) incoming.set(e.target, []);
    incoming.get(e.target)!.push(e.source);
  });

  // Find start nodes (no incoming edges)
  const startNodes = nodes.filter((n) => !incoming.has(n.id) || incoming.get(n.id)!.length === 0);

  // BFS to assign depth (column for LR, row for TB)
  const depth = new Map<string, number>();
  const queue: string[] = startNodes.map((n) => n.id);
  startNodes.forEach((n) => depth.set(n.id, 0));

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    const d = depth.get(nodeId)!;
    const targets = outgoing.get(nodeId) || [];

    targets.forEach((targetId) => {
      const existingDepth = depth.get(targetId);
      if (existingDepth === undefined || existingDepth < d + 1) {
        depth.set(targetId, d + 1);
        queue.push(targetId);
      }
    });
  }

  // Nodes without edges get depth 0
  nodes.forEach((n) => {
    if (!depth.has(n.id)) depth.set(n.id, 0);
  });

  // Group nodes by depth
  const columns = new Map<number, Node[]>();
  nodes.forEach((n) => {
    const d = depth.get(n.id)!;
    if (!columns.has(d)) columns.set(d, []);
    columns.get(d)!.push(n);
  });

  // Determine handle positions based on direction
  const sourcePosition = direction === 'LR' ? Position.Right : Position.Bottom;
  const targetPosition = direction === 'LR' ? Position.Left : Position.Top;

  // Assign positions
  return nodes.map((n) => {
    const d = depth.get(n.id)!;
    const col = columns.get(d)!;
    const rowIndex = col.indexOf(n);

    let x: number, y: number;

    if (direction === 'LR') {
      // Left to Right: depth = x, rowIndex = y
      const colHeight = col.length * (NODE_HEIGHT + V_GAP) - V_GAP;
      x = d * (NODE_WIDTH + H_GAP);
      y = rowIndex * (NODE_HEIGHT + V_GAP) - colHeight / 2 + 200;
    } else {
      // Top to Bottom: depth = y, rowIndex = x
      const rowWidth = col.length * (NODE_WIDTH + H_GAP) - H_GAP;
      x = rowIndex * (NODE_WIDTH + H_GAP) - rowWidth / 2 + 300;
      y = d * (NODE_HEIGHT + V_GAP);
    }

    return {
      ...n,
      sourcePosition,
      targetPosition,
      position: { x, y },
    };
  });
}
