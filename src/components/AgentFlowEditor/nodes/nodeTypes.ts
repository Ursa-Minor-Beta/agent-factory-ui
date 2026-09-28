import type { NodeTypes } from '@xyflow/react';
import { BaseNode } from './BaseNode';

// Register all node types to use BaseNode
// This prevents "Node type not found" warnings
export const nodeTypes: NodeTypes = {
  js: BaseNode,
  llm: BaseNode,
  http: BaseNode,
  branch: BaseNode,
  memory: BaseNode,
  transform: BaseNode,
  filter: BaseNode,
  merge: BaseNode,
  delay: BaseNode,
  webhook: BaseNode,
  code: BaseNode,
  api: BaseNode,
};
