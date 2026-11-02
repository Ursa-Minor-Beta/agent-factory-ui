import type { AgentGraphBuiltin } from '../../../types';
import type { Relation } from '../types';

export const builtinsNodeId = (agentId: string) => `${agentId}:builtins`;

/**
 * One tools node per agent holding all its built-in tools (unique, sorted), attached below the agent.
 * Returned as layout items + relations so the layout treats them like callees.
 */
export function builtinToolGroups(builtins: AgentGraphBuiltin[]) {
  const byAgent = new Map<string, Set<string>>();
  builtins.forEach((b) => byAgent.set(b.agentId, (byAgent.get(b.agentId) ?? new Set()).add(b.toolName)));
  return [...byAgent].map(([agentId, names]) => ({
    id: builtinsNodeId(agentId),
    name: '', // sorts tool nodes before agents among siblings
    tools: [...names].sort(),
    relation: { source: agentId, target: builtinsNodeId(agentId), via: 'builtin' } as Relation,
  }));
}
