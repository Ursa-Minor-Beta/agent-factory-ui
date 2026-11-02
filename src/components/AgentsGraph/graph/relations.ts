import type { Edge } from '@xyflow/react';
import type { Agent } from '../../../types';
import type { Relation } from '../types';

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

export function extractRelations(agents: Agent[]): Relation[] {
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

export function relationEdges(relations: Relation[], withLabels: boolean): Edge[] {
  return relations.map((r) => ({
    id: `${r.source}->${r.target}`,
    source: r.source,
    target: r.target,
    label: withLabels ? r.via : undefined,
    className: r.via === 'tool' ? 'agents-graph-edge-tool' : undefined, // agent node call: solid, tool call: dotted
  }));
}
