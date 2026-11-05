export interface Session {
  id: string;
  userId: string;
  agentId: string;
  agentName?: string;
  workspaceId?: string;
  title?: string | null;
  status: 'active' | 'archived';
  incognito: boolean;
  createdAt: string;
  updatedAt: string;
}

// Top-level server / client tool call of an assistant turn
export interface MessageToolCall {
  id: string; // Same as toolCallId of the tool-call stream event
  name: string;
  status: 'completed' | 'failed';
  // Set by the UI for UI tool calls of the current session, not stored
  label?: string;
  error?: string | string[];
}

export interface Message {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  files?: string[]; // Array of file references: "inner:<fileId>:<fieldName>"
  toolCalls?: MessageToolCall[] | null;
  createdAt: string;
}

export interface ChatResponse {
  sessionId: string | null;
  response: string;
  runId: string;
  isNewSession: boolean;
}
