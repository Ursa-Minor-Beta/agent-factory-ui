export interface Secret {
  id: string;
  name: string;
  maskedValue: string;
  description?: string;
  workspaceId?: string | null;
  workspaceName?: string;
  createdAt: string;
  updatedAt: string;
}
