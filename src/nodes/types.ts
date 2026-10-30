export const NODE_TYPES = [
  'input',
  'output',
  'llm',
  'http',
  'js',
  'agent',
  'branch',
  'memory-store',
  'memory-search',
  'memory-update',
  'memory-delete',
] as const;

export type NodeTypeName = (typeof NODE_TYPES)[number];
