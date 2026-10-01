import type { NodeTypes } from '@xyflow/react';
import { BaseNode } from './BaseNode';

// Register all node types to use BaseNode
// This prevents "Node type not found" warnings
export const nodeTypes: NodeTypes = {
  input: BaseNode,
  output: BaseNode,
  llm: BaseNode,
  http: BaseNode,
  js: BaseNode,
  agent: BaseNode,
  branch: BaseNode,
  'memory-store': BaseNode,
  'memory-search': BaseNode,
  'memory-update': BaseNode,
  'memory-delete': BaseNode,
};
