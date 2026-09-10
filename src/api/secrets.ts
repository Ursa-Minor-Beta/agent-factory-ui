import { api } from './client';
import type { Secret } from '../types';

export interface CreateSecretInput {
  name: string;
  value: string;
  description?: string;
}

export interface UpdateSecretInput {
  name?: string;
  value?: string;
  description?: string;
}

export const secretsApi = {
  list: () =>
    api.get<Secret[]>('/api/secrets'),

  getById: (id: string) =>
    api.get<Secret>(`/api/secrets/${id}`),

  create: (data: CreateSecretInput) =>
    api.post<Secret>('/api/secrets', data),

  update: (id: string, data: UpdateSecretInput) =>
    api.patch<Secret>(`/api/secrets/${id}`, data),

  delete: (id: string) =>
    api.delete<void>(`/api/secrets/${id}`),
};
