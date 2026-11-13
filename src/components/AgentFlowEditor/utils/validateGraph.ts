import type { NodeType } from '../../../api';
import type { AgentNode } from '../../../types/agent';
import { extractReferencedNodeIds, extractBranchTargets, canRunAfter, canDisable } from './converters';

export interface GraphValidation {
  ok: boolean;
  errors: string[];
  // Not blocking - e.g. a node whose output nobody uses yet while the graph is being built
  warnings: string[];
}

/**
 * Static checks of the agent graph - result is returned to the editor assistant
 * after each tool call so the LLM can fix its own mistakes.
 */
export function validateGraph(nodes: AgentNode[], nodeTypes: NodeType[]): GraphValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const ids = new Set(nodes.map((n) => n.id));
  const knownTypes = new Map(nodeTypes.map((t) => [t.type as string, t]));
  // Nodes whose output is consumed: referenced, branch target or runAfter dependency
  const used = new Set<string>();

  for (const node of nodes) {
    const nodeType = knownTypes.get(node.type);
    if (knownTypes.size && !nodeType) {
      errors.push(`${node.id}: unknown node type "${node.type}"`);
    }
    if (node.disabled && !canDisable(node.type, nodeTypes)) {
      errors.push(`${node.id}: node of type "${node.type}" cannot be disabled`);
    }

    nodeType?.options?.forEach((option) => {
      const value = node.data[option.name];
      if (option.required && option.default === undefined && (value === undefined || value === '')) {
        errors.push(`${node.id}: required option "${option.name}" is missing`);
      }
      if (option.type === 'enum' && option.values && value !== undefined && !option.values.includes(value as string)) {
        errors.push(`${node.id}: "${option.name}" must be one of ${option.values.join(', ')}`);
      }
    });

    extractReferencedNodeIds(node.data).forEach((refId) => {
      used.add(refId);
      if (refId === node.id) errors.push(`${node.id}: references itself`);
      else if (!ids.has(refId)) errors.push(`${node.id}: references missing node "${refId}"`);
    });

    extractBranchTargets(node.type, node.data).forEach(({ target }) => {
      used.add(target);
      if (!ids.has(target)) errors.push(`${node.id}: branch targets missing node "${target}"`);
    });

    node.runAfter?.forEach((depId) => {
      used.add(depId);
      if (!ids.has(depId)) errors.push(`${node.id}: runAfter lists missing node "${depId}"`);
      else if (!canRunAfter(node.type) || !canRunAfter(nodes.find((n) => n.id === depId)?.type)) {
        errors.push(`${node.id}: runAfter is not allowed between input/output nodes ("${depId}")`);
      }
    });
  }

  if (!nodes.some((n) => n.type === 'input')) warnings.push('graph has no input node');
  if (!nodes.some((n) => n.type === 'output')) warnings.push('graph has no output node');

  nodes.forEach((node) => {
    if (node.type !== 'output' && !used.has(node.id)) {
      warnings.push(`${node.id}: output is not used by any node`);
    }
  });

  return { ok: errors.length === 0, errors, warnings };
}
