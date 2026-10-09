import { api } from './client';
import type { Secret } from '../types';

export interface ListSecretsOptions {
  workspaceId?: string | null; // string = specific workspace, null = global only, undefined = all
}

export interface CreateSecretInput {
  name: string;
  value: string;
  description?: string;
  workspaceId?: string;
}

export interface UpdateSecretInput {
  name?: string;
  value?: string;
  description?: string;
  workspaceId?: string | null;
}

export const secretsApi = {
  list: async (options?: ListSecretsOptions): Promise<Secret[]> => {
    const params = new URLSearchParams();
    if (options?.workspaceId !== undefined) {
      params.append('workspaceId', options.workspaceId === null ? 'null' : options.workspaceId);
    }
    const query = params.toString();
    return api.get<Secret[]>(`/api/secrets${query ? `?${query}` : ''}`);
  },

  getById: (id: string) =>
    api.get<Secret>(`/api/secrets/${id}`),

  create: (data: CreateSecretInput) =>
    api.post<Secret>('/api/secrets', data),

  update: (id: string, data: UpdateSecretInput) =>
    api.patch<Secret>(`/api/secrets/${id}`, data),

  delete: (id: string) =>
    api.delete<void>(`/api/secrets/${id}`),
};
