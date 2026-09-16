import { api } from './client';

export interface NodeTypeField {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required?: boolean;
  default?: unknown;
  description?: string;
}

export interface NodeTypeSchema {
  [fieldName: string]: NodeTypeField;
}

export interface NodeType {
  type: string;
  name: string;
  description?: string;
  category?: string;
  inputSchema?: NodeTypeSchema;
  outputSchema?: NodeTypeSchema;
  options?: Record<string, unknown>;
}

export const nodesApi = {
  list: () => api.get<NodeType[]>('/api/nodes'),
};
