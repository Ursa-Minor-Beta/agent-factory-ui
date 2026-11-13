import { useMemo, useRef, type RefObject } from 'react';
import type { Edge, Node } from '@xyflow/react';
import type { NodeStatus } from '../../../types';
import { isNodeDisabled } from '../utils/converters';

type RunStatuses = Record<string, NodeStatus> | null;

const nodeClassName = (node: Node, runStatuses: RunStatuses) =>
  [
    runStatuses && `run-${runStatuses[node.id] ?? 'pending'}`,
    isNodeDisabled(node.data) && 'node-disabled',
  ].filter(Boolean).join(' ') || undefined;

// Apply run status / disabled classes for rendering only - stored nodes stay untouched.
// Copies are reused while node and class are unchanged, so a status update re-renders only that node
export function useDisplayNodes(nodes: Node[], runStatuses: RunStatuses) {
  const cacheRef = useRef(new Map<string, { source: Node; display: Node }>());
  return useMemo(() => {
    const cache = cacheRef.current;
    const next = new Map<string, { source: Node; display: Node }>();
    const result = nodes.map((node) => {
      const className = nodeClassName(node, runStatuses);
      if (!className) return node;
      const cached = cache.get(node.id);
      const display = cached && cached.source === node && cached.display.className === className
        ? cached.display
        : { ...node, className };
      next.set(node.id, { source: node, display });
      return display;
    });
    cacheRef.current = next;
    return result;
  }, [nodes, runStatuses]);
}

// Highlights outgoing edges of highlighted nodes; photons flow along edges carrying data: source finished, target running.
// Edges into / out of disabled nodes are dimmed
export function useDisplayEdges(
  edges: Edge[],
  nodes: Node[],
  runStatuses: RunStatuses,
  runningMsRef: RefObject<Record<string, number>>,
  highlightedNodeIds: Set<string>,
) {
  // Keyed by the id list so node edits/moves don't recompute edges
  const disabledKey = nodes.filter((n) => isNodeDisabled(n.data)).map((n) => n.id).join('\n');

  return useMemo(() => {
    const disabledIds = new Set(disabledKey ? disabledKey.split('\n') : []);
    if (!runStatuses && !highlightedNodeIds.size && !disabledIds.size) return edges;
    return edges.map((edge) => {
      let next = edge;
      if (disabledIds.has(edge.source) || disabledIds.has(edge.target)) {
        next = { ...next, className: [next.className, 'edge-disabled'].filter(Boolean).join(' ') };
      }
      if (highlightedNodeIds.has(edge.source)) {
        next = {
          ...next,
          zIndex: 1,
          style: { ...next.style, stroke: 'var(--mantine-color-cyan-4)', strokeWidth: 2.5 },
        };
      }
      const active = runStatuses?.[edge.source] === 'completed' && runStatuses[edge.target] === 'running';
      // photon = target's running time, so the trail follows the animation speed
      // zIndex keeps active edges drawn above overlapping ones
      return active ? { ...next, zIndex: 1, data: { ...next.data, photon: runningMsRef.current[edge.target] } } : next;
    });
  }, [edges, disabledKey, runStatuses, runningMsRef, highlightedNodeIds]);
}
