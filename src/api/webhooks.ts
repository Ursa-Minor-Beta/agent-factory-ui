import { api } from './client';
import type { Webhook, WebhookTemplate, WebhookTestInput, WebhookTestResult } from '../types';

export interface ListWebhooksOptions {
  agentId?: string;
  workspaceId?: string | null; // null = agents not in any workspace (sent as 'null')
  skip?: number;
  limit?: number; // backend max 100
}

export interface WebhookListResponse {
  webhooks: Webhook[];
  total: number;
}

export interface CreateWebhookInput {
  agentId: string;
  name: string;
  handler?: string | null;
  template?: string; // copies the template's code into handler
}

export interface UpdateWebhookInput {
  name?: string;
  enabled?: boolean;
  handler?: string | null; // null or "" removes the handler
}

export const webhooksApi = {
  list: (options: ListWebhooksOptions = {}) => {
    const params = new URLSearchParams();
    if (options.agentId) params.append('agentId', options.agentId);
    if (options.workspaceId !== undefined) params.append('workspaceId', options.workspaceId ?? 'null');
    if (options.skip) params.append('skip', String(options.skip));
    if (options.limit) params.append('limit', String(options.limit));
    const query = params.toString();
    return api.get<WebhookListResponse>(`/api/webhooks${query ? `?${query}` : ''}`);
  },

  templates: () =>
    api.get<WebhookTemplate[]>('/api/webhooks/templates'),

  create: (data: CreateWebhookInput) =>
    api.post<Webhook>('/api/webhooks', data),

  update: (id: string, data: UpdateWebhookInput) =>
    api.patch<Webhook>(`/api/webhooks/${id}`, data),

  rotate: (id: string) =>
    api.post<Webhook>(`/api/webhooks/${id}/rotate`),

  test: (id: string, data: WebhookTestInput) =>
    api.post<WebhookTestResult>(`/api/webhooks/${id}/test`, data),

  delete: (id: string) =>
    api.delete<void>(`/api/webhooks/${id}`),
};
