import { api } from './client';
import type { User, ApiKey, CreateApiKeyResponse } from '../types';

export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ user: User }>('/api/auth/login', { email, password }),

  logout: () =>
    api.post<void>('/api/auth/logout'),

  getMe: () =>
    api.get<User>('/api/auth/me'),

  listApiKeys: () =>
    api.get<ApiKey[]>('/api/auth/api-keys'),

  createApiKey: (name: string, permissions?: string[], expiresAt?: string) =>
    api.post<CreateApiKeyResponse>('/api/auth/api-keys', { name, permissions, expiresAt }),

  revokeApiKey: (id: string) =>
    api.delete<void>(`/api/auth/api-keys/${id}`),
};
