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
  position: { x: number; y: number };
  data: {
    schema?: InputSchema;
    [key: string]: unknown;
  };
}

export interface AgentEdge {
  id: string;
  source: string;
  sourceHandle?: string;
  target: string;
  targetHandle?: string;
}

export interface AgentVariable {
  name: string;
  type: 'string' | 'number' | 'boolean';
  defaultValue?: unknown;
}

export interface Agent {
  id: string;
  userId: string;
  name: string;
  description?: string;
  nodes: AgentNode[];
  edges: AgentEdge[];
  variables: AgentVariable[];
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
  status: 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  runId?: string;
  createdAt: string;
}

export interface ChatResponse {
  sessionId: string | null;
  response: string;
  runId: string;
  isNewSession: boolean;
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
