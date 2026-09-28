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
