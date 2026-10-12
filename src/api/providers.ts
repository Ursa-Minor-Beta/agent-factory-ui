import { api } from './client';
import type { ProviderConfig, ProviderType } from '../types';

export interface ListProvidersOptions {
  provider?: ProviderType; // Filter by provider type (e.g., 'github', 'openai')
  workspaceId?: string | null; // string = specific workspace, null = global only, undefined = all
}

export interface CreateProviderInput {
  provider: ProviderType;
  name: string;
  isDefault?: boolean;
  config?: {
    apiKey?: string;
    baseUrl?: string;
  };
  workspaceId?: string;
}

export interface UpdateProviderInput {
  name?: string;
  config?: {
    apiKey?: string;
    baseUrl?: string;
  };
  workspaceId?: string | null;
}

export const providersApi = {
  list: (options?: ListProvidersOptions) => {
    const params = new URLSearchParams();
    if (options?.provider) {
      params.append('provider', options.provider);
    }
    if (options?.workspaceId !== undefined) {
      params.append('workspaceId', options.workspaceId === null ? 'null' : options.workspaceId);
    }
    const query = params.toString();
    return api.get<ProviderConfig[]>(`/api/providers${query ? `?${query}` : ''}`);
  },

  getById: (id: string) =>
    api.get<ProviderConfig>(`/api/providers/${id}`),

  create: (data: CreateProviderInput) =>
    api.post<ProviderConfig>('/api/providers', data),

  update: (id: string, data: UpdateProviderInput) =>
    api.patch<ProviderConfig>(`/api/providers/${id}`, data),

  setDefault: (id: string) =>
    api.post<ProviderConfig>(`/api/providers/${id}/default`),

  delete: (id: string) =>
    api.delete<void>(`/api/providers/${id}`),
};
