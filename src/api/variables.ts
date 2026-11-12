import { api } from './client';
import type { Variable } from '../types';

export type VariablesSortBy = 'name' | 'createdAt' | 'updatedAt';

export interface ListVariablesOptions {
  workspaceId?: string | null; // string = specific workspace, null = global only, undefined = all
  name?: string; // Contains, case-insensitive
  sortBy?: VariablesSortBy;
  sortOrder?: 'asc' | 'desc';
}

export interface CreateVariableInput {
  name: string;
  value: string;
  description?: string;
  workspaceId?: string;
}

export interface UpdateVariableInput {
  name?: string;
  value?: string;
  description?: string;
  workspaceId?: string | null;
}

export const variablesApi = {
  list: async (options?: ListVariablesOptions): Promise<Variable[]> => {
    const params = new URLSearchParams();
    if (options?.workspaceId !== undefined) {
      params.append('workspaceId', options.workspaceId === null ? 'null' : options.workspaceId);
    }
    if (options?.name) params.append('name', options.name);
    if (options?.sortBy) params.append('sortBy', options.sortBy);
    if (options?.sortOrder) params.append('sortOrder', options.sortOrder);
    const query = params.toString();
    return api.get<Variable[]>(`/api/variables${query ? `?${query}` : ''}`);
  },

  getById: (id: string) =>
    api.get<Variable>(`/api/variables/${id}`),

  create: (data: CreateVariableInput) =>
    api.post<Variable>('/api/variables', data),

  update: (id: string, data: UpdateVariableInput) =>
    api.patch<Variable>(`/api/variables/${id}`, data),

  delete: (id: string) =>
    api.delete<void>(`/api/variables/${id}`),
};
