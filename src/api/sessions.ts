import { api } from './client';
import type { Session, Message, ChatResponse } from '../types';

export interface SessionsQueryParams {
  agentId?: string;
  status?: 'active' | 'archived';
  limit?: number;
  offset?: number;
}

export interface ChatInput {
  input: Record<string, unknown>;
  sessionId?: string;
  incognito?: boolean;
}

function buildQueryString(params: SessionsQueryParams): string {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      searchParams.append(key, String(value));
    }
  });
  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
}

export const sessionsApi = {
  list: (params: SessionsQueryParams = {}) =>
    api.get<Session[]>(`/api/sessions${buildQueryString(params)}`),

  getById: (id: string) =>
    api.get<Session>(`/api/sessions/${id}`),

  delete: (id: string) =>
    api.delete<void>(`/api/sessions/${id}`),

  getMessages: (id: string, limit?: number, offset?: number) => {
    const params = new URLSearchParams();
    if (limit !== undefined) params.append('limit', String(limit));
    if (offset !== undefined) params.append('offset', String(offset));
    const qs = params.toString();
    return api.get<Message[]>(`/api/sessions/${id}/messages${qs ? `?${qs}` : ''}`);
  },

  chat: (agentId: string, data: ChatInput) =>
    api.post<ChatResponse>(`/api/agents/${agentId}/chat`, data),
};
