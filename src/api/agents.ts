import { api } from './client';
import type { Agent } from '../types';

export interface CreateAgentInput {
  name: string;
  description?: string;
  nodes?: Agent['nodes'];
  edges?: Agent['edges'];
  variables?: Agent['variables'];
}

export interface UpdateAgentInput {
  name?: string;
  description?: string;
  nodes?: Agent['nodes'];
  edges?: Agent['edges'];
  variables?: Agent['variables'];
  status?: 'draft' | 'published';
}

export const agentsApi = {
  list: () =>
    api.get<Agent[]>('/api/agents'),

  getById: (id: string) =>
    api.get<Agent>(`/api/agents/${id}`),

  create: (data: CreateAgentInput) =>
    api.post<Agent>('/api/agents', data),

  update: (id: string, data: UpdateAgentInput) =>
    api.put<Agent>(`/api/agents/${id}`, data),

  delete: (id: string) =>
    api.delete<void>(`/api/agents/${id}`),

  validate: (id: string) =>
    api.post<{ valid: boolean; errors: string[] }>(`/api/agents/${id}/validate`),
};
