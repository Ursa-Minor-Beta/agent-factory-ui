import { fetchWithRefresh, ApiError } from './client';
import type {
  Workspace,
  WorkspaceQueryOptions,
  WorkspaceListResponse,
  CreateWorkspaceData,
  UpdateWorkspaceData,
} from '../types/workspace';

function buildQueryString(params: WorkspaceQueryOptions): string {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      searchParams.append(key, String(value));
    }
  });
  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
}

async function handleResponse<T>(response: Response): Promise<T> {
  const data = await response.json();

  if (!response.ok || data.success === false) {
    throw new ApiError(
      response.status,
      data.error?.code || 'UNKNOWN_ERROR',
      data.error?.message || 'An error occurred'
    );
  }

  return data;
}

export const workspacesApi = {
  list: async (params: WorkspaceQueryOptions = {}): Promise<WorkspaceListResponse> => {
    const response = await fetchWithRefresh(`/api/workspaces${buildQueryString(params)}`);
    return handleResponse<WorkspaceListResponse>(response);
  },

  getById: async (id: string): Promise<Workspace> => {
    const response = await fetchWithRefresh(`/api/workspaces/${id}`);
    return handleResponse<Workspace>(response);
  },

  create: async (data: CreateWorkspaceData): Promise<Workspace> => {
    const response = await fetchWithRefresh('/api/workspaces', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return handleResponse<Workspace>(response);
  },

  update: async (id: string, data: UpdateWorkspaceData): Promise<Workspace> => {
    const response = await fetchWithRefresh(`/api/workspaces/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return handleResponse<Workspace>(response);
  },

  delete: async (id: string): Promise<{ success: boolean }> => {
    const response = await fetchWithRefresh(`/api/workspaces/${id}`, {
      method: 'DELETE',
    });
    return handleResponse<{ success: boolean }>(response);
  },

  getAgentCount: async (id: string): Promise<{ count: number }> => {
    const response = await fetchWithRefresh(`/api/workspaces/${id}/agent-count`);
    return handleResponse<{ count: number }>(response);
  },
};
