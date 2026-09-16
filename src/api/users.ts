import { api } from './client';
import type { User } from '../types';

export interface CreateUserInput {
  email: string;
  password: string;
  name: string;
  role?: 'admin' | 'user';
}

export interface UserQueryParams {
  email?: string;
  name?: string;
  skip?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'email' | 'name';
  sortOrder?: 'asc' | 'desc';
}

export interface UserListResponse {
  users: User[];
  total: number;
  skip: number;
  limit: number;
}

export const usersApi = {
  list: (params?: UserQueryParams) => {
    const searchParams = new URLSearchParams();
    if (params?.email) searchParams.set('email', params.email);
    if (params?.name) searchParams.set('name', params.name);
    if (params?.skip !== undefined) searchParams.set('skip', String(params.skip));
    if (params?.limit !== undefined) searchParams.set('limit', String(params.limit));
    if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params?.sortOrder) searchParams.set('sortOrder', params.sortOrder);
    const query = searchParams.toString();
    return api.get<UserListResponse>(`/api/users${query ? `?${query}` : ''}`);
  },

  create: (data: CreateUserInput) =>
    api.post<User>('/api/users', data),

  updatePassword: (id: string, password: string) =>
    api.put<User>(`/api/users/${id}/password`, { password }),
};
