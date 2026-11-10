import { useMemo, useRef, type RefObject } from 'react';
import type { Edge, Node } from '@xyflow/react';
import type { NodeStatus } from '../../../types';

type RunStatuses = Record<string, NodeStatus> | null;

// Apply run status classes for rendering only - stored nodes stay untouched.
// Copies are reused while node and status are unchanged, so a status update re-renders only that node
export function useDisplayNodes(nodes: Node[], runStatuses: RunStatuses) {
  const cacheRef = useRef(new Map<string, { source: Node; display: Node }>());
  return useMemo(() => {
    if (!runStatuses) {
      cacheRef.current.clear();
      return nodes;
    }
    const cache = cacheRef.current;
    const next = new Map<string, { source: Node; display: Node }>();
    const result = nodes.map((node) => {
      const className = `run-${runStatuses[node.id] ?? 'pending'}`;
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

// Highlights outgoing edges of highlighted nodes; photons flow along edges carrying data: source finished, target running
export function useDisplayEdges(
  edges: Edge[],
  runStatuses: RunStatuses,
  runningMsRef: RefObject<Record<string, number>>,
  highlightedNodeIds: Set<string>,
) {
  return useMemo(() => {
    if (!runStatuses && !highlightedNodeIds.size) return edges;
    return edges.map((edge) => {
      let next = edge;
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
  }, [edges, runStatuses, runningMsRef, highlightedNodeIds]);
}
