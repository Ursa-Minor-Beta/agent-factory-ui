import type { Edge } from '@xyflow/react';
import type { AgentGraphEdge } from '../../../types';
import type { Relation } from '../types';

// One relation per caller -> callee pair; dynamic calls (target resolved at runtime) have no target to draw
export function graphRelations(edges: AgentGraphEdge[]): Relation[] {
  const relations = new Map<string, Relation>();
  for (const edge of edges) {
    if (!edge.to) continue;
    const key = `${edge.from}->${edge.to}`;
    // A direct agent node wins over a tool reference for the edge style
    if (!relations.has(key) || edge.kind === 'agent-node') {
      relations.set(key, { source: edge.from, target: edge.to, via: edge.kind === 'agent-node' ? 'agent' : 'tool' });
    }
  }
  return [...relations.values()];
}

export function relationEdges(relations: Relation[], withLabels: boolean): Edge[] {
  return relations.map((r) => ({
    id: `${r.source}->${r.target}`,
    source: r.source,
    target: r.target,
    label: withLabels ? r.via : undefined,
    className: r.via === 'tool' ? 'agents-graph-edge-tool' : undefined, // agent node call: solid, tool call: dotted
  }));
}
