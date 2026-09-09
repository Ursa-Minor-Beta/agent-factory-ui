import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Loader, Alert, Center, Modal, Text, Group, Button } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { IconAlertCircle } from '@tabler/icons-react';
import { agentsApi, sessionsApi } from '../../api';
import type { Agent, Session } from '../../types';
import { ChatHeader } from './ChatHeader';
import { ChatInput } from './ChatInput';
import { ChatMessages } from './ChatMessages';
import { ChatSidebar } from './ChatSidebar';
import { getInputSchema, type ChatMessage } from './types';

// Helper to parse JSON message content
function parseMessageContent(content: string, role: 'user' | 'assistant'): string {
  try {
    const parsed = JSON.parse(content);
    if (typeof parsed === 'object' && parsed !== null) {
      // User messages: {"message": "..."}
      if (role === 'user' && 'message' in parsed) {
        return String(parsed.message);
      }
      // Assistant messages: {"output-1": "...", "output-2": "..."}
      const values = Object.values(parsed);
      if (values.length > 0) {
        return values.join('\n\n');
      }
    }
  } catch {
    // Not JSON, use as-is
  }
  return content;
}

export function ChatPage() {
  const { agentId, sessionId: urlSessionId } = useParams<{
    agentId: string;
    sessionId?: string;
  }>();
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 768px)') ?? false;

  const MESSAGES_PER_PAGE = 50;

  // Agent state
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loadingAgent, setLoadingAgent] = useState(true);

  // Input schema derived from agent
  const inputSchema = useMemo(() => (agent ? getInputSchema(agent) : { message: { type: 'string' as const, required: true } }), [agent]);

  // Sessions state
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(
    urlSessionId || null
  );
  const [loadingSessions, setLoadingSessions] = useState(true);

  // Messages state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loadingMoreMessages, setLoadingMoreMessages] = useState(false);

  // Chat state
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [startIncognito, setStartIncognito] = useState(false);

  // Mobile sidebar
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Delete confirmation modal
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);

  // Derived state
  const isIncognitoSession = currentSessionId?.startsWith('incognito_') || false;
  const isNewChat = !currentSessionId && messages.length === 0;

  // Reset state when agent changes
  useEffect(() => {
    setCurrentSessionId(urlSessionId || null);
    setMessages([]);
    setSessions([]);
    setHasMoreMessages(false);
    setStartIncognito(false);
    setError('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId]);

  // Load agent details
  useEffect(() => {
    if (!agentId) return;

    const loadAgent = async () => {
      try {
        setLoadingAgent(true);
        const data = await agentsApi.getById(agentId);
        setAgent(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load agent');
      } finally {
        setLoadingAgent(false);
      }
    };

    loadAgent();
  }, [agentId]);

  // Load sessions for this agent (no auto-select logic here)
  const loadSessions = useCallback(async () => {
    if (!agentId) return;

    try {
      setLoadingSessions(true);
      const data = await sessionsApi.list({ agentId, status: 'active', limit: 50 });
      setSessions(data);
      return data;
    } catch (err) {
      console.error('Failed to load sessions:', err);
      return [];
    } finally {
      setLoadingSessions(false);
    }
  }, [agentId]);

  // Initial load - fetch sessions and auto-select most recent if needed
  useEffect(() => {
    if (!agentId) return;

    const initSessions = async () => {
      try {
        setLoadingSessions(true);
        const data = await sessionsApi.list({ agentId, status: 'active', limit: 50 });
        setSessions(data);
        // Auto-select most recent session only on initial load (no session in URL)
        if (!urlSessionId && !startIncognito && data.length > 0) {
          const mostRecent = data[0];
          setCurrentSessionId(mostRecent.id);
          navigate(`/agents/${agentId}/chat/${mostRecent.id}`, { replace: true });
        }
      } catch (err) {
        console.error('Failed to load sessions:', err);
      } finally {
        setLoadingSessions(false);
      }
    };
    initSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId]);

  // Load messages when session changes
  useEffect(() => {
    if (!currentSessionId || currentSessionId.startsWith('incognito_')) {
      if (!currentSessionId) {
        setMessages([]);
        setHasMoreMessages(false);
      }
      return;
    }

    const loadMessages = async () => {
      try {
        setLoadingMessages(true);
        const data = await sessionsApi.getMessages(currentSessionId, MESSAGES_PER_PAGE, 0);
        const parsedMessages = data.map((m) => ({
          id: m.id,
          role: m.role,
          content: parseMessageContent(m.content, m.role),
          createdAt: m.createdAt,
        }));
        setMessages(parsedMessages);
        setHasMoreMessages(data.length === MESSAGES_PER_PAGE);
      } catch (err) {
        console.error('Failed to load messages:', err);
      } finally {
        setLoadingMessages(false);
      }
    };

    loadMessages();
  }, [currentSessionId]);

  // Load more older messages (infinite scroll)
  const handleLoadMoreMessages = useCallback(async () => {
    if (!currentSessionId || loadingMoreMessages || !hasMoreMessages) return;

    try {
      setLoadingMoreMessages(true);
      const data = await sessionsApi.getMessages(
        currentSessionId,
        MESSAGES_PER_PAGE,
        messages.length
      );
      const parsedMessages = data.map((m) => ({
        id: m.id,
        role: m.role,
        content: parseMessageContent(m.content, m.role),
        createdAt: m.createdAt,
      }));
      // Prepend older messages
      setMessages((prev) => [...parsedMessages, ...prev]);
      setHasMoreMessages(data.length === MESSAGES_PER_PAGE);
    } catch (err) {
      console.error('Failed to load more messages:', err);
    } finally {
      setLoadingMoreMessages(false);
    }
  }, [currentSessionId, loadingMoreMessages, hasMoreMessages, messages.length]);

  // Update URL session ID
  useEffect(() => {
    if (
      urlSessionId !== currentSessionId &&
      currentSessionId &&
      !currentSessionId.startsWith('incognito_')
    ) {
      navigate(`/agents/${agentId}/chat/${currentSessionId}`, { replace: true });
    }
  }, [currentSessionId, urlSessionId, agentId, navigate]);

  const handleSend = async (input: Record<string, unknown>) => {
    if (!agentId || sending || Object.keys(input).length === 0) return;

    // Format user message content for display
    const displayContent = Object.entries(input)
      .map(([key, value]) => (Object.keys(input).length === 1 ? String(value) : `**${key}:** ${value}`))
      .join('\n');

    const userMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: displayContent,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setSending(true);
    setError('');

    const shouldBeIncognito = isNewChat && startIncognito;

    try {
      const response = await sessionsApi.chat(agentId, {
        input,
        sessionId: currentSessionId || undefined,
        incognito: shouldBeIncognito,
      });

      if (response.isNewSession && response.sessionId) {
        setCurrentSessionId(response.sessionId);
        setStartIncognito(false);
        if (!response.sessionId.startsWith('incognito_')) {
          loadSessions();
        }
      }

      const assistantMessage: ChatMessage = {
        id: `response-${Date.now()}`,
        role: 'assistant',
        content: parseMessageContent(response.response, 'assistant'),
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
      setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
    } finally {
      setSending(false);
    }
  };

  const handleNewChat = (incognito = false) => {
    setCurrentSessionId(null);
    setMessages([]);
    setStartIncognito(incognito);
    navigate(`/agents/${agentId}/chat`);
  };

  const handleSelectSession = (session: Session) => {
    setCurrentSessionId(session.id);
    setStartIncognito(false);
    navigate(`/agents/${agentId}/chat/${session.id}`);
  };

  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSessionToDelete(id);
  };

  const confirmDeleteSession = async () => {
    if (!sessionToDelete) return;

    try {
      await sessionsApi.delete(sessionToDelete);
      if (currentSessionId === sessionToDelete) {
        setCurrentSessionId(null);
        setMessages([]);
        navigate(`/agents/${agentId}/chat`);
      }
      loadSessions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete session');
    } finally {
      setSessionToDelete(null);
    }
  };

  if (loadingAgent) {
    return (
      <Center style={{ height: '100%', minHeight: 400 }}>
        <Loader />
      </Center>
    );
  }

  if (!agent) {
    return (
      <Alert icon={<IconAlertCircle size={16} />} color="red">
        Agent not found
      </Alert>
    );
  }

  return (
    <Box style={{ display: 'flex', height: 'calc(100vh - 40px)', gap: 16 }}>
      <Modal
        opened={!!sessionToDelete}
        onClose={() => setSessionToDelete(null)}
        title="Delete conversation"
        centered
        size="sm"
      >
        <Text size="sm" mb="lg">
          Are you sure you want to delete this conversation? This action cannot be undone.
        </Text>
        <Group justify="flex-end" gap="sm">
          <Button variant="default" onClick={() => setSessionToDelete(null)}>
            Cancel
          </Button>
          <Button color="red" onClick={confirmDeleteSession}>
            Delete
          </Button>
        </Group>
      </Modal>

      <ChatSidebar
        sessions={sessions}
        currentSessionId={currentSessionId}
        loading={loadingSessions}
        onNewChat={handleNewChat}
        onSelectSession={handleSelectSession}
        onDeleteSession={handleDeleteSession}
        isMobile={isMobile}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <Box style={{ flex: 1, position: 'relative', minWidth: 0, overflow: 'hidden' }}>
        <ChatHeader
          agent={agent}
          isIncognito={isIncognitoSession || (isNewChat && startIncognito)}
          isMobile={isMobile}
          onBack={() => navigate('/agents')}
          onOpenSidebar={() => setSidebarOpen(true)}
        />

        <ChatMessages
          messages={messages}
          loading={loadingMessages}
          sending={sending}
          agentName={agent.name}
          isNewChat={isNewChat}
          isIncognito={startIncognito}
          error={error}
          onClearError={() => setError('')}
          hasMore={hasMoreMessages}
          loadingMore={loadingMoreMessages}
          onLoadMore={handleLoadMoreMessages}
        />

        <ChatInput
          onSend={handleSend}
          sending={sending}
          inputSchema={inputSchema}
        />
      </Box>
    </Box>
  );
}
