import type { AgentImportWarnings } from './agent';

export interface Workspace {
  id: string;
  userId: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  agentCount?: number;
  secretCount?: number;
  variableCount?: number;
  providerCount?: number;
  collectionCount?: number;
  scheduleCount?: number;
  webhookCount?: number;
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

// Export / import
export interface WorkspaceExportAgent {
  refId: string;
  name: string;
  description: string;
  nodes: unknown[];
  editorData?: unknown;
}

export interface WorkspaceExport {
  version: string;
  exportedAt: string;
  workspace: { name: string; description?: string };
  // Includes agents from other workspaces that this workspace calls
  agents: WorkspaceExportAgent[];
  collections: { name: string; schema: { description: string | null; fields: unknown[] } | null }[];
  secrets: { name: string }[];
  variables?: { name: string }[];
  providers: string[];
}

export interface WorkspaceImportRequest {
  package: WorkspaceExport;
  // Import into an existing workspace, omit to create a new one
  workspaceId?: string;
}

export interface WorkspaceImportResponse {
  workspaceId: string;
  workspaceName: string;
  agentIdMap: Record<string, string>;
  warnings: AgentImportWarnings;
}

export interface UpdateWorkspaceData {
  name?: string;
  description?: string;
}
