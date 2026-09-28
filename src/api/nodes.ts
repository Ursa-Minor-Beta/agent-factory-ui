import { api } from './client';

export interface NodeTypeOption {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'enum' | 'enum[]';
  required?: boolean;
  default?: unknown;
  description?: string;
  values?: string[]; // For enum type
}

export interface NodeTypeExample {
  name?: string;
  title?: string;
  description?: string;
  data: Record<string, unknown>;
}

export interface NodeType {
  type: string;
  name?: string;
  description?: string;
  category?: string;
  inputs?: string[];
  outputs?: string[];
  options?: NodeTypeOption[];
  features?: string[];
  examples?: NodeTypeExample[];
}

export const nodesApi = {
  list: () => api.get<NodeType[]>('/api/nodes'),
};
