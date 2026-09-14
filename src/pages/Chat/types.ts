import type { Agent, Session, InputSchema } from '../../types';

export interface MessageAttachment {
  name: string;
  type: 'image' | 'binary';
  data: string;
  size: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  attachments?: MessageAttachment[];
  createdAt: string;
  runId?: string;
}

export interface ChatHeaderProps {
  agent: Agent;
  isIncognito: boolean;
  isMobile: boolean;
  onOpenSidebar: () => void;
  onEditAgent: () => void;
  onEditJson: () => void;
}

export interface ChatInputProps {
  onSend: (input: Record<string, unknown>) => void;
  sending: boolean;
  inputSchema: InputSchema;
  draftKey: string;
}

// Helper to extract input schema from agent nodes
export function getInputSchema(agent: Agent): InputSchema {
  const inputNode = agent.nodes.find((node) => node.type === 'input');
  if (inputNode?.data?.schema && Object.keys(inputNode.data.schema).length > 0) {
    return inputNode.data.schema;
  }
  // Return empty schema if no inputs defined (will show just Run button)
  return {};
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
  onRetry: () => void;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  onViewRun: (runId: string) => void;
}

export interface ChatSidebarProps {
  sessions: Session[];
  currentSessionId: string | null;
  loading: boolean;
  onNewChat: (incognito?: boolean) => void;
  onSelectSession: (session: Session) => void;
  onDeleteSession: (id: string, e: React.MouseEvent) => void;
  onRenameSession: (id: string, title: string) => Promise<void>;
}
