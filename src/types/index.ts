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

// Agent types
export interface AgentNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
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
  createdAt: string;
  updatedAt: string;
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

// API Response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: {
    code: string;
    message: string;
  };
}
