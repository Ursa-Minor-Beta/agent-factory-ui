import type { Agent, Session } from '../../types';

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
  onSend: (value: string) => void;
  sending: boolean;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
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
