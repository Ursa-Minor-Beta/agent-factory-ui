export interface Workspace {
  id: string;
  userId: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceQueryOptions {
  name?: string;
  sortBy?: 'name' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
  skip?: number;
  limit?: number;
}

export interface WorkspaceListResponse {
  workspaces: Workspace[];
  total: number;
  skip: number;
  limit: number;
}

export interface CreateWorkspaceData {
  name: string;
  description?: string;
}

export interface UpdateWorkspaceData {
  name?: string;
  description?: string;
}

export type WorkspaceDeleteMode = 'move-agents' | 'delete-agents';
