import type { Agent, Session, InputSchema } from '../../types';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface ChatHeaderProps {
  agent: Agent;
  isIncognito: boolean;
  isMobile: boolean;
  onBack: () => void;
  onOpenSidebar: () => void;
}

export interface ChatInputProps {
  onSend: (input: Record<string, unknown>) => void;
  sending: boolean;
  inputSchema: InputSchema;
}

// Helper to extract input schema from agent nodes
export function getInputSchema(agent: Agent): InputSchema {
  const inputNode = agent.nodes.find((node) => node.type === 'input');
  if (inputNode?.data?.schema) {
    return inputNode.data.schema;
  }
  // Default to single message field if no schema found
  return { message: { type: 'string', required: true } };
}

export interface ChatMessagesProps {
  messages: ChatMessage[];
  loading: boolean;
  sending: boolean;
  agentName: string;
  isNewChat: boolean;
  isIncognito: boolean;
  error: string;
  onClearError: () => void;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
}

export interface ChatSidebarProps {
  sessions: Session[];
  currentSessionId: string | null;
  loading: boolean;
  onNewChat: (incognito?: boolean) => void;
  onSelectSession: (session: Session) => void;
  onDeleteSession: (id: string, e: React.MouseEvent) => void;
}
