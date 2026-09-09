import { api } from './client';
import type { Agent, AgentQueryParams, AgentListResponse } from '../types';

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

function buildQueryString(params: AgentQueryParams): string {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      searchParams.append(key, String(value));
    }
  });
  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
}

export const agentsApi = {
  list: (params: AgentQueryParams = {}) =>
    api.get<AgentListResponse>(`/api/agents${buildQueryString(params)}`),

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
