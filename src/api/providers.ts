import { api } from './client';
import type { ProviderConfig } from '../types';

export interface CreateProviderInput {
  provider: 'openai' | 'anthropic' | 'ollama';
  name: string;
  isDefault?: boolean;
  config?: {
    apiKey?: string;
    baseUrl?: string;
  };
}

export interface UpdateProviderInput {
  name?: string;
  config?: {
    apiKey?: string;
    baseUrl?: string;
  };
}

export const providersApi = {
  list: () =>
    api.get<ProviderConfig[]>('/api/providers'),

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
