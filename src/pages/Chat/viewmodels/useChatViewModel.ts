import { useState, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useMediaQuery } from '@mantine/hooks';
import type { Agent, Session, InputSchema } from '../../../types';
import type { ChatMessage } from '../types';
import { useAgentViewModel } from './useAgentViewModel';
import { useSessionsViewModel } from './useSessionsViewModel';
import { useMessagesViewModel } from './useMessagesViewModel';
import { useStreamViewModel } from './useStreamViewModel';

export interface UseChatViewModelReturn {
  // Agent
  agent: Agent | null;
  agentLoading: boolean;
  agentError: string;
  workspaceName?: string;
  inputSchema: InputSchema;

  // Sessions
  sessions: Session[];
  sessionsLoading: boolean;
  currentSessionId: string | null;
  isIncognitoSession: boolean;
  isNewChat: boolean;
  startIncognito: boolean;
  selectSession: (session: Session) => void;
  deleteSession: (id: string) => Promise<void>;
  renameSession: (id: string, title: string) => Promise<void>;
  startNewChat: (incognito?: boolean) => void;

  // Messages
  messages: ChatMessage[];
  messagesLoading: boolean;
  hasMoreMessages: boolean;
  loadingMoreMessages: boolean;
  loadMoreMessages: () => Promise<void>;

  // Stream/Send
  sending: boolean;
  error: string;
  errorRunId?: string;
  currentRunId: string | null;
  statusText?: string;
  send: (input: Record<string, unknown>) => void;
  cancel: () => Promise<void>;
  retry: () => void;
  clearError: () => void;
  onRepeat: (input: Record<string, unknown>) => void;

  // UI State
  isMobile: boolean;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  sessionToDelete: string | null;
  setSessionToDelete: (id: string | null) => void;
  confirmDeleteSession: () => Promise<void>;
  inputHeight: number;
  setInputHeight: (height: number) => void;

  // Computed
  draftKey: string;

  // Actions
  openEditAgent: () => void;
  handleDeleteSession: (id: string, e: React.MouseEvent) => void;
}

export function useChatViewModel(): UseChatViewModelReturn {
  const { agentId, sessionId: urlSessionId } = useParams<{
    agentId: string;
    sessionId?: string;
  }>();

  const isMobile = useMediaQuery('(max-width: 768px)') ?? false;

  // UI State - sidebar visible by default on desktop
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const [inputHeight, setInputHeight] = useState(100);

  // ViewModels
  const agentVM = useAgentViewModel(agentId);
  const sessionsVM = useSessionsViewModel(agentId, urlSessionId);
  const messagesVM = useMessagesViewModel(sessionsVM.currentSessionId);

  // Computed
  const isNewChat = !sessionsVM.currentSessionId && messagesVM.messages.length === 0;

  // Stream callbacks
  const streamCallbacks = useMemo(
    () => ({
      onInit: (data: { runId: string; sessionId: string; isNewSession: boolean }) => {
        if (data.isNewSession && data.sessionId) {
          sessionsVM.handleNewSession(data.sessionId, data.sessionId.startsWith('incognito_'));
        }
      },
      onMessage: (message: ChatMessage) => {
        messagesVM.addMessage(message);
      },
    }),
    [sessionsVM, messagesVM]
  );

  const streamVM = useStreamViewModel(
    agentId,
    sessionsVM.currentSessionId,
    isNewChat && sessionsVM.startIncognito,
    streamCallbacks
  );

  // Wrapped send that adds optimistic user message
  const send = useCallback(
    (input: Record<string, unknown>) => {
      const userMessage = streamVM.createUserMessage(input);
      messagesVM.addMessage(userMessage);
      streamVM.send(input);
    },
    [streamVM, messagesVM]
  );

  // Retry removes last message then re-sends
  const retry = useCallback(() => {
    messagesVM.removeLastMessage();
    streamVM.retry();
  }, [messagesVM, streamVM]);

  // Repeat sends a new message with given input
  const onRepeat = useCallback(
    (input: Record<string, unknown>) => {
      if (streamVM.sending) return;
      send(input);
    },
    [send, streamVM.sending]
  );

  // New chat clears messages
  const startNewChat = useCallback(
    (incognito = false) => {
      messagesVM.clearMessages();
      sessionsVM.startNewChat(incognito);
    },
    [messagesVM, sessionsVM]
  );

  // Delete session with confirmation
  const handleDeleteSession = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSessionToDelete(id);
  }, []);

  const confirmDeleteSession = useCallback(async () => {
    if (!sessionToDelete) return;

    try {
      const wasCurrentSession = sessionsVM.currentSessionId === sessionToDelete;
      await sessionsVM.deleteSession(sessionToDelete);
      if (wasCurrentSession) {
        messagesVM.clearMessages();
      }
    } finally {
      setSessionToDelete(null);
    }
  }, [sessionToDelete, sessionsVM, messagesVM]);

  // Select session clears current messages (they'll reload)
  const selectSession = useCallback(
    (session: Session) => {
      sessionsVM.selectSession(session);
    },
    [sessionsVM]
  );

  // Open edit agent modal
  const openEditAgent = useCallback(() => {
    if (agentVM.agent) {
      window.dispatchEvent(
        new CustomEvent('open-agent-modal', { detail: { agentId: agentVM.agent.id } })
      );
    }
  }, [agentVM.agent]);

  const draftKey = `chat-draft-${agentId}-${sessionsVM.currentSessionId || 'new'}`;

  return {
    // Agent
    agent: agentVM.agent,
    agentLoading: agentVM.loading,
    agentError: agentVM.error,
    workspaceName: agentVM.workspaceName,
    inputSchema: agentVM.inputSchema,

    // Sessions
    sessions: sessionsVM.sessions,
    sessionsLoading: sessionsVM.loading,
    currentSessionId: sessionsVM.currentSessionId,
    isIncognitoSession: sessionsVM.isIncognitoSession,
    isNewChat,
    startIncognito: sessionsVM.startIncognito,
    selectSession,
    deleteSession: sessionsVM.deleteSession,
    renameSession: sessionsVM.renameSession,
    startNewChat,

    // Messages
    messages: messagesVM.messages,
    messagesLoading: messagesVM.loading,
    hasMoreMessages: messagesVM.hasMore,
    loadingMoreMessages: messagesVM.loadingMore,
    loadMoreMessages: messagesVM.loadMore,

    // Stream
    sending: streamVM.sending,
    error: streamVM.error,
    errorRunId: streamVM.errorRunId,
    currentRunId: streamVM.currentRunId,
    statusText: streamVM.statusText,
    send,
    cancel: streamVM.cancel,
    retry,
    clearError: streamVM.clearError,
    onRepeat,

    // UI
    isMobile,
    sidebarOpen,
    setSidebarOpen,
    sessionToDelete,
    setSessionToDelete,
    confirmDeleteSession,
    inputHeight,
    setInputHeight,

    // Computed
    draftKey,

    // Actions
    openEditAgent,
    handleDeleteSession,
  };
}
