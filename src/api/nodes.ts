import { api } from './client';

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

/**
 * Valid node option types:
 * - string: Short text input (single line, e.g., URLs, names, model names)
 * - text: Long text input (multiline, e.g., prompts, descriptions, paragraphs)
 * - code: Code input (multiline with syntax highlighting, e.g., JavaScript, JSON templates)
 * - number: Numeric input (integers or floats)
 * - boolean: True/false checkbox
 * - object: JSON object or array
 * - enum: Single selection from predefined values
 * - enum[]: Multiple selections from predefined values
 */
export interface NodeTypeOption {
  name: string;
  type: 'string' | 'text' | 'code' | 'number' | 'boolean' | 'object' | 'array' | 'enum' | 'enum[]';
  required?: boolean;
  default?: unknown;
  description?: string;
  values?: string[]; // For enum type
}

// Top-level node field (lives next to id/type, not inside data)
// - node[]: list of other node ids (e.g. runAfter ordering dependencies)
export interface NodeTypeField {
  name: string;
  type: 'node[]';
  description?: string;
}

export interface NodeTypeExample {
  name?: string;
  title?: string;
  description?: string;
  data: Record<string, unknown>;
}

export interface NodeType {
  type: typeof NODE_TYPES[number];
  name?: string;
  description?: string;
  category?: string;
  inputs?: string[];
  outputs?: string[];
  options?: NodeTypeOption[];
  nodeFields?: NodeTypeField[];
  features?: string[];
  examples?: NodeTypeExample[];
}

export const nodesApi = {
  list: () => api.get<NodeType[]>('/api/nodes'),
};
