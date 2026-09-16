// User types
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  createdAt: string;
  updatedAt: string;
}

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: User;
  tokens: Tokens;
}

// API Key types
export interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  permissions: string[];
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface CreateApiKeyResponse {
  apiKey: ApiKey;
  plainKey: string;
}

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

// Agent types
export interface AgentNode {
  id: string;
  type: string;
  position?: { x: number; y: number };
  data: {
    schema?: InputSchema;
    [key: string]: unknown;
  };
}

export interface Agent {
  id: string;
  userId: string;
  name: string;
  description?: string;
  nodes: AgentNode[];
  status: 'draft' | 'published';
  isSystem?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AgentQueryParams {
  id?: string;
  name?: string;
  description?: string;
  isSystem?: boolean;
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

// Provider Config types
export interface ProviderConfig {
  id: string;
  userId: string;
  provider: 'openai' | 'anthropic' | 'ollama';
  name: string;
  isDefault: boolean;
  config: {
    apiKey?: string;
    baseUrl?: string;
  };
  createdAt: string;
  updatedAt: string;
}

// Session types
export interface Session {
  id: string;
  userId: string;
  agentId: string;
  title?: string | null;
  status: 'active' | 'archived';
  incognito: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: unknown;
  result?: unknown;
}

export interface Message {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  files?: string[]; // Array of file references: "inner:<fileId>:<fieldName>"
  toolCalls?: ToolCall[] | null;
  createdAt: string;
}

export interface ChatResponse {
  sessionId: string | null;
  response: string;
  runId: string;
  isNewSession: boolean;
}

// Run types
export type NodeStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
export type RunStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelling' | 'cancelled';

export interface NodeState {
  status: NodeStatus;
  input?: unknown;
  output?: unknown;
  state?: unknown;
  error?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
}

export interface Run {
  id: string;
  agentId: string;
  userId: string;
  input: Record<string, unknown>;
  output?: Record<string, unknown> | null;
  status: RunStatus;
  nodeStates: Record<string, NodeState>;
  error?: string | null;
  startedAt: string;
  completedAt?: string | null;
}

// Secret types
export interface Secret {
  id: string;
  name: string;
  maskedValue: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

// API Response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: {
    code: string;
    message: string;
  };
}

// Agent Edit Modal types
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

// Run Details Modal types
export interface RunDetailsModalProps {
  run: Run | null;
  opened: boolean;
  onClose: () => void;
}

export const statusColors: Record<RunStatus, string> = {
  pending: 'gray',
  running: 'blue',
  completed: 'green',
  failed: 'red',
  cancelling: 'orange',
  cancelled: 'gray',
};

export const nodeStatusColors: Record<NodeStatus, string> = {
  pending: 'gray',
  running: 'blue',
  completed: 'green',
  failed: 'red',
  skipped: 'orange',
};

export function formatDuration(startedAt: string, completedAt?: string | null): string {
  const start = new Date(startedAt).getTime();
  const end = completedAt ? new Date(completedAt).getTime() : Date.now();
  const duration = end - start;

  if (duration < 1000) return `${duration}ms`;
  if (duration < 60000) return `${(duration / 1000).toFixed(1)}s`;
  return `${(duration / 60000).toFixed(1)}m`;
}

// Resolve nodeRef references in run output
// Format: "nodeRef:<nodeId>:<handle>"
export function resolveRunOutput(run: Run): Record<string, unknown> {
  if (!run.output) return {};

  const resolved: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(run.output)) {
    if (typeof value === 'string' && value.startsWith('nodeRef:')) {
      // Parse: "nodeRef:<nodeId>:<handle>"
      const [, nodeId, handle] = value.split(':');
      const nodeOutput = run.nodeStates[nodeId]?.output as Record<string, unknown> | undefined;
      resolved[key] = nodeOutput?.[handle];
    } else {
      resolved[key] = value;
    }
  }
  return resolved;
}

// File reference format: "inner:<fileId>:<fieldName>"
export interface InnerFileRef {
  fileId: string;
  fieldName: string;
}

// Parse inner file reference string
export function parseInnerFileRef(value: string): InnerFileRef | null {
  if (typeof value !== 'string' || !value.startsWith('inner:')) return null;
  const parts = value.split(':');
  if (parts.length < 2) return null;
  return {
    fileId: parts[1],
    fieldName: parts.slice(2).join(':'), // fieldName may contain colons
  };
}

// Extract all inner file references from an object recursively
export function extractInnerFileRefs(
  data: unknown,
  refs: Array<{ path: string; fileId: string; fieldName: string }> = [],
  prefix = ''
): Array<{ path: string; fileId: string; fieldName: string }> {
  if (typeof data === 'string') {
    const ref = parseInnerFileRef(data);
    if (ref) {
      refs.push({ path: prefix, ...ref });
    }
  } else if (Array.isArray(data)) {
    data.forEach((item, index) => {
      extractInnerFileRefs(item, refs, prefix ? `${prefix}[${index}]` : `[${index}]`);
    });
  } else if (typeof data === 'object' && data !== null) {
    for (const [key, value] of Object.entries(data)) {
      extractInnerFileRefs(value, refs, prefix ? `${prefix}.${key}` : key);
    }
  }
  return refs;
}
