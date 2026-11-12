import type { AgentGraphNode } from '../../../types';
import type { GraphBounds, GraphSizes, Relation } from '../types';
import { layout } from './layout';

const FRAME_PADDING = 24; // px between the frame border and its agents
const FRAME_HEADER = 32; // px for the workspace label above the agents
const FRAME_GAP = 60; // px between frames

export interface WorkspaceFrame {
  id: string;
  label: string;
  workspaceId: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  agentIds: string[];
}

const GLOBAL_KEY = 'global';
const MISSING_KEY = 'missing';

function groupKey(node: AgentGraphNode) {
  if (node.missing) return MISSING_KEY;
  return node.workspaceId ?? GLOBAL_KEY;
}

function groupLabel(key: string, node: AgentGraphNode) {
  if (key === MISSING_KEY) return 'Missing agents';
  if (key === GLOBAL_KEY) return 'Global';
  return node.workspaceName ?? 'Workspace';
}

/**
 * All-agents graph: each workspace is laid out on its own (layered, like a single workspace)
 * inside a labelled frame; frames are packed left to right in rows of roughly equal width.
 * Calls between workspaces stay as edges between frames.
 */
export function workspaceLayout(nodes: AgentGraphNode[], relations: Relation[], sizes: GraphSizes) {
  const groups = new Map<string, { label: string; workspaceId: string | null; nodes: AgentGraphNode[] }>();
  for (const node of nodes) {
    const key = groupKey(node);
    if (!groups.has(key)) {
      groups.set(key, {
        label: groupLabel(key, node),
        workspaceId: key === GLOBAL_KEY || key === MISSING_KEY ? null : key,
        nodes: [],
      });
    }
    groups.get(key)!.nodes.push(node);
  }

  // Lay out each group from (0, 0); measure it
  const laidOut = [...groups.entries()].map(([id, group]) => {
    const ids = new Set(group.nodes.map((n) => n.id));
    const inner = relations.filter((r) => ids.has(r.source) && ids.has(r.target));
    const positions = layout(group.nodes, inner, sizes);
    const xs = [...positions.values()].map((p) => p.x);
    const ys = [...positions.values()].map((p) => p.y);
    const minX = Math.min(...xs);
    const width = Math.max(...xs) - minX + sizes.nodeWidth + FRAME_PADDING * 2;
    const height = Math.max(...ys) + sizes.nodeHeight + FRAME_HEADER + FRAME_PADDING * 2;
    return { id, ...group, positions, minX, width, height };
  });

  // Global first, missing last, workspaces by name
  const order = (id: string) => (id === GLOBAL_KEY ? 0 : id === MISSING_KEY ? 2 : 1);
  laidOut.sort((a, b) => order(a.id) - order(b.id) || a.label.localeCompare(b.label));

  // Shelf packing: target a roughly square overall shape, never narrower than the widest frame
  const area = laidOut.reduce((sum, g) => sum + (g.width + FRAME_GAP) * (g.height + FRAME_GAP), 0);
  const rowWidth = Math.max(...laidOut.map((g) => g.width), Math.sqrt(area) * 1.6);

  const positions = new Map<string, { x: number; y: number }>();
  const frames: WorkspaceFrame[] = [];
  let cursorX = 0;
  let cursorY = 0;
  let rowHeight = 0;
  for (const group of laidOut) {
    if (cursorX > 0 && cursorX + group.width > rowWidth) {
      cursorX = 0;
      cursorY += rowHeight + FRAME_GAP;
      rowHeight = 0;
    }
    frames.push({
      id: `frame:${group.id}`,
      label: group.label,
      workspaceId: group.workspaceId,
      x: cursorX,
      y: cursorY,
      width: group.width,
      height: group.height,
      agentIds: group.nodes.map((n) => n.id),
    });
    group.positions.forEach((p, id) => {
      positions.set(id, {
        x: cursorX + FRAME_PADDING + p.x - group.minX,
        y: cursorY + FRAME_HEADER + FRAME_PADDING + p.y,
      });
    });
    cursorX += group.width + FRAME_GAP;
    rowHeight = Math.max(rowHeight, group.height);
  }

  const bounds: GraphBounds | null = frames.length
    ? {
        minX: Math.min(...frames.map((f) => f.x)),
        maxX: Math.max(...frames.map((f) => f.x + f.width)),
        minY: Math.min(...frames.map((f) => f.y)),
      }
    : null;

  return { positions, frames, bounds };
}
