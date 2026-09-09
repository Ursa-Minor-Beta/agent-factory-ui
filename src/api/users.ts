import { api } from './client';
import type { User } from '../types';

export interface CreateUserInput {
  email: string;
  password: string;
  name: string;
  role?: 'admin' | 'user';
}

export const usersApi = {
  create: (data: CreateUserInput) =>
    api.post<User>('/api/users', data),

  updatePassword: (id: string, password: string) =>
    api.put<User>(`/api/users/${id}/password`, { password }),
};
