// Input Schema types (for agent input nodes)
export interface InputFieldSchema {
  type: 'string' | 'number' | 'boolean';
  required?: boolean;
  default?: unknown;
  description?: string;
}

export interface InputSchema {
  [fieldName: string]: InputFieldSchema;
}

export interface AgentNode {
  id: string;
  type: string;
  position?: { x: number; y: number };
  data: {
    schema?: InputSchema;
    [key: string]: unknown;
  };
}

export interface CanvasSettings {
  layoutDirection?: 'LR' | 'TB';
  edgeType?: string;
}

export interface EditorData {
  nodePositions?: Record<string, { x: number; y: number }>;
  canvasSettings?: CanvasSettings;
  [key: string]: unknown;
}

export interface Agent {
  id: string;
  userId: string;
  name: string;
  description?: string;
  nodes: AgentNode[];
  editorData?: EditorData;
  status: 'draft' | 'published';
  workspaceId?: string;
  workspaceName?: string;
  defaultName?: string;
  systemName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AgentQueryParams {
  id?: string;
  name?: string;
  description?: string;
  workspaceId?: string;
  createdAfter?: string;
  createdBefore?: string;
  sortBy?: 'name' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
  skip?: number;
  limit?: number;
}

export interface AgentListResponse {
  agents: Agent[];
  total: number;
}

export interface AgentForm {
  name: string;
  description: string;
}

export interface AgentEditModalProps {
  opened: boolean;
  onClose: () => void;
  agent: Agent | null;
  onSave: () => void;
  isMobile: boolean;
}

export interface AgentJsonModalProps {
  agent: Agent | null;
  onClose: () => void;
  onSave: () => void;
}

// Export types
export interface ExportedAgent {
  name: string;
  description?: string;
  nodes: AgentNode[];
  originalId: string;
}

export interface ExportedCollection {
  name: string;
  description?: string | null;
  fields: unknown[];
}

export interface ExportedSecret {
  name: string;
  description: string;
}

export interface AgentExportData {
  version: string;
  exportedAt: string;
  workspace?: {
    name: string;
    description?: string;
  };
  agent: ExportedAgent;
  dependencies: ExportedAgent[];
  collections: ExportedCollection[];
  secrets: ExportedSecret[];
  providers: string[];
}
