import { Position, type Node, type Edge } from '@xyflow/react';
import type { AgentNode } from '../../../types/agent';

// Convert AgentNode to React Flow Node
export function toFlowNode(agentNode: AgentNode, index: number): Node {
  return {
    id: agentNode.id,
    type: agentNode.type,
    position: agentNode.position || { x: index * 200, y: 100 },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
    data: { label: agentNode.type.toUpperCase(), ...agentNode.data },
  };
}

// Convert React Flow Node to AgentNode
export function toAgentNode(flowNode: Node): AgentNode {
  const { label, ...data } = flowNode.data as Record<string, unknown>;
  return {
    id: flowNode.id,
    type: flowNode.type || 'default',
    position: flowNode.position,
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

// Extract target node IDs listed in branch node's branches[].nodes
export function extractBranchTargetIds(type: string | undefined, data: Record<string, unknown>): Set<string> {
  const targets = new Set<string>();
  if (type !== 'branch' || !Array.isArray(data.branches)) return targets;
  data.branches.forEach((branch) => {
    const branchNodes = (branch as { nodes?: unknown })?.nodes;
    if (!Array.isArray(branchNodes)) return;
    branchNodes.forEach((id) => {
      if (typeof id === 'string' && id.trim()) targets.add(id.trim());
    });
  });
  return targets;
}

// Extract edges from node data (looking for references like {{node:id.path}}
// and branch node targets in branches[].nodes)
export function extractEdges(nodes: Node[]): Edge[] {
  const edges: Edge[] = [];
  const nodeIds = new Set(nodes.map((n) => n.id));

  const addEdge = (source: string, target: string) => {
    if (source === target || !nodeIds.has(source) || !nodeIds.has(target)) return;
    const edgeId = `${source}-${target}`;
    if (!edges.some((e) => e.id === edgeId)) {
      edges.push({ id: edgeId, source, target });
    }
  };

  nodes.forEach((node) => {
    const data = node.data as Record<string, unknown>;
    extractReferencedNodeIds(data).forEach((sourceId) => addEdge(sourceId, node.id));
    extractBranchTargetIds(node.type, data).forEach((targetId) => addEdge(node.id, targetId));
  });

  return edges;
}

// Re-sync edges connected to a node after its data changed
export function syncNodeEdges(edges: Edge[], nodes: Node[], nodeId: string, data: Record<string, unknown>): Edge[] {
  const node = nodes.find((n) => n.id === nodeId);
  const existingNodeIds = new Set(nodes.map((n) => n.id));
  const referencedIds = extractReferencedNodeIds(data);
  const branchTargetIds = extractBranchTargetIds(node?.type, data);

  // Outgoing edge is still valid if the target references this node or is a branch target
  const isOutgoingValid = (targetId: string) => {
    if (branchTargetIds.has(targetId)) return true;
    const target = nodes.find((n) => n.id === targetId);
    return !!target && extractReferencedNodeIds(target.data as Record<string, unknown>).has(nodeId);
  };

  const updatedEdges = edges.filter((e) => {
    if (e.target === nodeId) {
      // Keep incoming edges that are referenced, or come from a branch node listing this node
      if (referencedIds.has(e.source)) return true;
      const source = nodes.find((n) => n.id === e.source);
      return !!source && extractBranchTargetIds(source.type, source.data as Record<string, unknown>).has(nodeId);
    }
    if (e.source === nodeId && node?.type === 'branch') return isOutgoingValid(e.target);
    return true;
  });

  const addEdge = (source: string, target: string) => {
    if (source === target || !existingNodeIds.has(source) || !existingNodeIds.has(target)) return;
    const edgeId = `${source}-${target}`;
    if (!updatedEdges.some((e) => e.id === edgeId)) {
      updatedEdges.push({ id: edgeId, source, target });
    }
  };

  referencedIds.forEach((sourceId) => addEdge(sourceId, nodeId));
  branchTargetIds.forEach((targetId) => addEdge(nodeId, targetId));

  return updatedEdges;
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
