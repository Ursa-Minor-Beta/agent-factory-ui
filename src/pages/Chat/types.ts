import type { Agent, Session, InputSchema } from '../../types';

export interface MessageAttachment {
  name: string;
  type: 'image' | 'binary';
  data: string;
  size: string;
}

// Parsed file reference from message.files array
export interface FileRef {
  index: number;
  fileId: string;
  fieldName: string;
  mimeType: string; // Extracted from placeholder
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  attachments?: MessageAttachment[];
  fileRefs?: FileRef[]; // Parsed file references for lazy loading
  createdAt: string;
  runId?: string;
  rawInput?: Record<string, unknown>; // Original input for user messages (for repeat)
}

export interface ChatHeaderProps {
  agent: Agent;
  isIncognito: boolean;
  isMobile: boolean;
  onOpenSidebar: () => void;
  onEditAgent: () => void;
}

export interface ChatInputProps {
  onSend: (input: Record<string, unknown>) => void;
  sending: boolean;
  inputSchema: InputSchema;
  draftKey: string;
  onCancel?: () => void;
  onHeightChange?: (height: number) => void;
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
  errorRunId?: string;
  onClearError: () => void;
  onRetry: () => void;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  onViewRun: (runId: string) => void;
  onRepeat: (input: Record<string, unknown>) => void;
  statusText?: string;
  inputHeight?: number;
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
