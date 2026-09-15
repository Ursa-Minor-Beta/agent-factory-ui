import { api } from './client';
import type { Run, RunStatus } from '../types';

export interface CancelRunResponse {
  id: string;
  status: RunStatus;
  message?: string;
}

export interface ListRunsParams {
  userId?: string;
  agentId?: string;
  status?: RunStatus;
  startedAfter?: string;
  startedBefore?: string;
  sortBy?: 'startedAt' | 'completedAt';
  sortOrder?: 'asc' | 'desc';
  skip?: number;
  limit?: number;
}

export interface ListRunsResponse {
  runs: Run[];
  total: number;
}

export const runsApi = {
  listByAgent: (agentId: string, limit?: number) =>
    api.get<Run[]>(`/api/agents/${agentId}/runs${limit ? `?limit=${limit}` : ''}`),

  getById: (id: string) =>
    api.get<Run>(`/api/runs/${id}`),

  cancel: (id: string) =>
    api.post<CancelRunResponse>(`/api/runs/${id}/cancel`),

  listAll: (params?: ListRunsParams) => {
    const searchParams = new URLSearchParams();
    if (params?.userId) searchParams.set('userId', params.userId);
    if (params?.agentId) searchParams.set('agentId', params.agentId);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.startedAfter) searchParams.set('startedAfter', params.startedAfter);
    if (params?.startedBefore) searchParams.set('startedBefore', params.startedBefore);
    if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params?.sortOrder) searchParams.set('sortOrder', params.sortOrder);
    if (params?.skip !== undefined) searchParams.set('skip', String(params.skip));
    if (params?.limit !== undefined) searchParams.set('limit', String(params.limit));
    const query = searchParams.toString();
    return api.get<ListRunsResponse>(`/api/executions${query ? `?${query}` : ''}`);
  },
};
