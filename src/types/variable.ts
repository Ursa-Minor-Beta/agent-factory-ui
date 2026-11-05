export interface Variable {
  id: string;
  name: string;
  value: string;
  description?: string;
  workspaceId?: string | null;
  workspaceName?: string | null;
  createdAt: string;
  updatedAt: string;
}
