import { api } from './client';
import type { Run, RunSummary, RunStatus } from '../types';

export interface CancelRunResponse {
  id: string;
  status: RunStatus;
  message?: string;
}

export interface ListRunsParams {
  userId?: string;
  agentId?: string;
  sessionId?: string;
  status?: RunStatus;
  startedAfter?: string;
  startedBefore?: string;
  sortBy?: 'startedAt' | 'completedAt';
  sortOrder?: 'asc' | 'desc';
  skip?: number;
  limit?: number;
  includeChildren?: boolean;
}

export interface ListRunsResponse {
  runs: RunSummary[];
  total: number;
}

export interface DeleteRunsParams {
  id?: string | string[];
  agentId?: string | string[];
}

export interface DeleteRunsResponse {
  deletedCount: number;
}

export const runsApi = {
  getById: (id: string, includeChildren?: boolean) =>
    api.get<Run>(`/api/runs/${id}${includeChildren ? '?includeChildren=true' : ''}`),

  cancel: (id: string) =>
    api.post<CancelRunResponse>(`/api/runs/${id}/cancel`),

  // Answer a client-tool-call SSE event; 409 TOOL_CALL_NOT_PENDING if already answered / timed out
  submitToolResult: (id: string, toolCallId: string, result: unknown) =>
    api.post<void>(`/api/runs/${id}/tool-results`, { toolCallId, result }),

  listAll: (params?: ListRunsParams) => {
    const searchParams = new URLSearchParams();
    if (params?.userId) searchParams.set('userId', params.userId);
    if (params?.agentId) searchParams.set('agentId', params.agentId);
    if (params?.sessionId) searchParams.set('sessionId', params.sessionId);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.startedAfter) searchParams.set('startedAfter', params.startedAfter);
    if (params?.startedBefore) searchParams.set('startedBefore', params.startedBefore);
    if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params?.sortOrder) searchParams.set('sortOrder', params.sortOrder);
    if (params?.skip !== undefined) searchParams.set('skip', String(params.skip));
    if (params?.limit !== undefined) searchParams.set('limit', String(params.limit));
    if (params?.includeChildren) searchParams.set('includeChildren', 'true');
    const query = searchParams.toString();
    return api.get<ListRunsResponse>(`/api/executions${query ? `?${query}` : ''}`);
  },

  deleteRuns: (params: DeleteRunsParams) =>
    api.post<DeleteRunsResponse>('/api/runs/delete', params),
};
