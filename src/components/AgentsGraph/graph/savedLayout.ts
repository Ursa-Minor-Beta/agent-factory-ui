import type { Node, XYPosition } from '@xyflow/react';
import type { SavedPosition, Positions } from '../hooks/usePersistedPositions';
import type { WorkspaceFrameNodeData } from '../nodes/WorkspaceFrameNode';
import type { GraphBounds, GraphSizes } from '../types';
import { FRAME_HEADER, FRAME_PADDING } from './groups';

/**
 * User-arranged layout on top of the auto layout:
 * - a frame's saved position is its anchor - where its auto layout origin now is. Once anything is dragged all
 *   frames are saved, so they stay put when the auto layout repacks (another workspace grew or shrank)
 * - an agent's saved position is relative to its frame's anchor, and only applies while the agent stays in the
 *   workspace it was saved in - an agent moved to another workspace gets its auto layout place in the new frame
 * Frames are always fitted around their agents. Without frames (one workspace) anchors are 0 - absolute positions.
 */

const ZERO: XYPosition = { x: 0, y: 0 };

/** Frame node id per agent id */
export function frameOfAgents(nodes: Node[]) {
  const frameOf = new Map<string, string>();
  for (const node of nodes) {
    if (node.type !== 'frame') continue;
    for (const agentId of (node.data as WorkspaceFrameNodeData).agentIds) frameOf.set(agentId, node.id);
  }
  return frameOf;
}

/** Frame's anchor: saved, or its auto layout origin */
export function frameAnchor(layoutFrame: Node | undefined, saved: Positions): XYPosition {
  if (!layoutFrame) return ZERO;
  const own = saved[layoutFrame.id];
  return own ? { x: own.x, y: own.y } : layoutFrame.position;
}

/** Auto layout nodes with the saved layout applied */
export function applySavedLayout(
  layoutNodes: Node[],
  saved: Positions,
  workspaceOf: (id: string) => string | null | undefined,
  sizes: GraphSizes,
): Node[] {
  const frameOf = frameOfAgents(layoutNodes);
  const byId = new Map(layoutNodes.map((node) => [node.id, node]));
  const nodes = layoutNodes.map((node) => {
    if (node.type === 'frame') return node;
    const layoutFrame = byId.get(frameOf.get(node.id) ?? '');
    const origin = layoutFrame?.position ?? ZERO;
    const anchor = frameAnchor(layoutFrame, saved);
    const own: SavedPosition | undefined = saved[node.id];
    const relative = own && own.workspaceId === workspaceOf(node.id)
      ? own
      : { x: node.position.x - origin.x, y: node.position.y - origin.y };
    const position = { x: anchor.x + relative.x, y: anchor.y + relative.y };
    if (position.x === node.position.x && position.y === node.position.y) return node;
    return { ...node, position };
  });
  return fitFrames(nodes, sizes);
}

/** Frames resized and moved to wrap their agents; unchanged nodes keep their identity */
export function fitFrames(nodes: Node[], sizes: GraphSizes): Node[] {
  if (!nodes.some((node) => node.type === 'frame')) return nodes;
  const byId = new Map(nodes.map((node) => [node.id, node]));
  return nodes.map((node) => {
    if (node.type !== 'frame') return node;
    const data = node.data as WorkspaceFrameNodeData;
    const agents = data.agentIds.map((id) => byId.get(id)).filter((agent): agent is Node => !!agent);
    if (!agents.length) return node;
    const minX = Math.min(...agents.map((a) => a.position.x));
    const minY = Math.min(...agents.map((a) => a.position.y));
    const maxX = Math.max(...agents.map((a) => a.position.x + (a.measured?.width ?? sizes.nodeWidth)));
    const maxY = Math.max(...agents.map((a) => a.position.y + (a.measured?.height ?? sizes.nodeHeight)));
    const position = { x: minX - FRAME_PADDING, y: minY - FRAME_PADDING - FRAME_HEADER };
    const width = maxX - minX + FRAME_PADDING * 2;
    const height = maxY - minY + FRAME_PADDING * 2 + FRAME_HEADER;
    if (
      position.x === node.position.x && position.y === node.position.y
      && width === data.width && height === data.height
    ) return node;
    return { ...node, position, data: { ...data, width, height } };
  });
}

/** Bounds of all nodes, frames included */
export function nodesBounds(nodes: Node[], sizes: GraphSizes): GraphBounds | null {
  if (!nodes.length) return null;
  const widthOf = (node: Node) => (node.type === 'frame' ? (node.data as WorkspaceFrameNodeData).width : sizes.nodeWidth);
  return {
    minX: Math.min(...nodes.map((n) => n.position.x)),
    maxX: Math.max(...nodes.map((n) => n.position.x + widthOf(n))),
    minY: Math.min(...nodes.map((n) => n.position.y)),
  };
}
