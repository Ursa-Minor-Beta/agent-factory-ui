import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Loader, Alert, Center, Modal, Text, Group, Button } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { IconAlertCircle } from '@tabler/icons-react';
import { agentsApi, sessionsApi, runsApi } from '../../api';
import type { Agent, Session, Run } from '../../types';
import { ChatHeader } from './ChatHeader';
import { ChatInput } from './ChatInput';
import { ChatMessages } from './ChatMessages';
import { ChatSidebar } from './ChatSidebar';
import { AgentEditModal } from '../../components/AgentEditModal';
import { AgentJsonModal } from '../../components/AgentJsonModal';
import { RunDetailsModal } from '../../components/RunDetailsModal';
import { getInputSchema, type ChatMessage, type MessageAttachment } from './types';

// Helper to format field name as readable label
function formatLabel(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .trim();
}

// Detect if string looks like base64 (long alphanumeric string)
function isBase64(str: string): boolean {
  if (typeof str !== 'string' || str.length < 200) return false;
  const base64Regex = /^[A-Za-z0-9+/=]+$/;
  return base64Regex.test(str.slice(0, 500));
}

// Get base64 size in human readable format
function getBase64Size(base64: string): string {
  const bytes = Math.ceil((base64.length * 3) / 4);
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Known image field names
const IMAGE_FIELDS = ['screenshot', 'image', 'thumbnail', 'preview', 'photo', 'picture'];

// Extract base64 attachments from object recursively
function extractAttachments(
  data: Record<string, unknown>,
  attachments: MessageAttachment[],
  prefix = ''
): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const keyLower = key.toLowerCase();

    if (typeof value === 'string' && isBase64(value)) {
      const isImage = IMAGE_FIELDS.some(f => keyLower.includes(f));
      attachments.push({
        name: fullKey,
        type: isImage ? 'image' : 'binary',
        data: value,
        size: getBase64Size(value),
      });
      // Don't include in cleaned output
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Handle nested objects (like screenshots: { name: base64 })
      const nestedAttachments: MessageAttachment[] = [];
      const cleanedNested = extractAttachments(value as Record<string, unknown>, nestedAttachments, fullKey);

      // Check if this object only contained base64 values
      if (nestedAttachments.length > 0) {
        attachments.push(...nestedAttachments);
      }
      if (Object.keys(cleanedNested).length > 0) {
        cleaned[key] = cleanedNested;
      }
    } else if (Array.isArray(value)) {
      const cleanedArray: unknown[] = [];
      value.forEach((item, index) => {
        if (typeof item === 'string' && isBase64(item)) {
          const isImage = IMAGE_FIELDS.some(f => keyLower.includes(f));
          attachments.push({
            name: `${fullKey}[${index}]`,
            type: isImage ? 'image' : 'binary',
            data: item,
            size: getBase64Size(item),
          });
        } else if (typeof item === 'object' && item !== null) {
          const nestedAttachments: MessageAttachment[] = [];
          const cleanedItem = extractAttachments(item as Record<string, unknown>, nestedAttachments, `${fullKey}[${index}]`);
          attachments.push(...nestedAttachments);
          if (Object.keys(cleanedItem).length > 0) {
            cleanedArray.push(cleanedItem);
          }
        } else {
          cleanedArray.push(item);
        }
      });
      if (cleanedArray.length > 0) {
        cleaned[key] = cleanedArray;
      }
    } else {
      cleaned[key] = value;
    }
  }

  return cleaned;
}

// Helper to stringify a value (handles nested objects)
function stringifyValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2);
  }
  return String(value);
}

// Helper to format input/output object for display (returns text and attachments)
function formatContentWithAttachments(data: Record<string, unknown>): { text: string; attachments: MessageAttachment[] } {
  const attachments: MessageAttachment[] = [];
  const cleaned = extractAttachments(data, attachments);

  const entries = Object.entries(cleaned);
  let text = '';
  if (entries.length === 1) {
    text = stringifyValue(entries[0][1]);
  } else if (entries.length > 1) {
    text = entries.map(([key, value]) => `**${formatLabel(key)}**  \n${stringifyValue(value)}`).join('\n\n&nbsp;\n\n');
  }

  return { text, attachments };
}

// Legacy helper for user input display (no attachment extraction needed)
function formatContent(data: Record<string, unknown>): string {
  const entries = Object.entries(data);
  if (entries.length === 0) return '';
  if (entries.length === 1) return stringifyValue(entries[0][1]);
  return entries.map(([key, value]) => `**${formatLabel(key)}**  \n${stringifyValue(value)}`).join('\n\n&nbsp;\n\n');
}

// Helper to parse JSON message content (handles both string and object input)
function parseMessageContent(content: unknown): { text: string; attachments: MessageAttachment[] } {
  // If content is already an object, format it directly
  if (typeof content === 'object' && content !== null) {
    return formatContentWithAttachments(content as Record<string, unknown>);
  }

  // If content is a string, try to parse as JSON
  if (typeof content === 'string') {
    try {
      const parsed = JSON.parse(content);
      if (typeof parsed === 'object' && parsed !== null) {
        return formatContentWithAttachments(parsed);
      }
    } catch {
      // Not JSON, use as-is
    }
    return { text: content, attachments: [] };
  }

  // For other primitives, convert to string
  return { text: String(content ?? ''), attachments: [] };
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
  const [lastInput, setLastInput] = useState<Record<string, unknown> | null>(null);

  // Mobile sidebar
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Delete confirmation modal
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);

  // Edit agent modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [jsonModalOpen, setJsonModalOpen] = useState(false);

  // Run details modal
  const [selectedRun, setSelectedRun] = useState<Run | null>(null);

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
        const parsedMessages = data.map((m) => {
          const { text, attachments } = parseMessageContent(m.content);
          return {
            id: m.id,
            role: m.role,
            content: text,
            attachments: attachments.length > 0 ? attachments : undefined,
            createdAt: m.createdAt,
          };
        });
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
      const parsedMessages = data.map((m) => {
        const { text, attachments } = parseMessageContent(m.content);
        return {
          id: m.id,
          role: m.role,
          content: text,
          attachments: attachments.length > 0 ? attachments : undefined,
          createdAt: m.createdAt,
        };
      });
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
    if (!agentId || sending) return;

    // Format user message content for display
    const displayContent = formatContent(input);

    const userMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: displayContent,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setSending(true);
    setError('');
    setLastInput(input);

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

      const { text, attachments } = parseMessageContent(response.response);
      const assistantMessage: ChatMessage = {
        id: `response-${Date.now()}`,
        role: 'assistant',
        content: text,
        attachments: attachments.length > 0 ? attachments : undefined,
        createdAt: new Date().toISOString(),
        runId: response.runId,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
      // Don't remove user message - it may have been saved before the error
    } finally {
      setSending(false);
    }
  };

  const handleRetry = useCallback(() => {
    if (!lastInput || sending) return;
    // Remove the last user message (the failed one)
    setMessages((prev) => prev.slice(0, -1));
    setError('');
    // Re-send with the same input
    handleSend(lastInput);
  }, [lastInput, sending]);

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

  const handleAgentSave = async () => {
    if (!agentId) return;
    try {
      const data = await agentsApi.getById(agentId);
      setAgent(data);
    } catch (err) {
      console.error('Failed to reload agent:', err);
    }
  };

  const handleViewRun = async (runId: string) => {
    try {
      const run = await runsApi.getById(runId);
      setSelectedRun(run);
    } catch (err) {
      console.error('Failed to load run:', err);
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

      <AgentEditModal
        opened={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        agent={agent}
        onSave={handleAgentSave}
        isMobile={isMobile}
      />

      <AgentJsonModal
        agent={jsonModalOpen ? agent : null}
        onClose={() => setJsonModalOpen(false)}
        onSave={handleAgentSave}
        isMobile={isMobile}
      />

      <RunDetailsModal
        run={selectedRun}
        opened={!!selectedRun}
        onClose={() => setSelectedRun(null)}
      />

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
          onOpenSidebar={() => setSidebarOpen(true)}
          onEditAgent={() => setEditModalOpen(true)}
          onEditJson={() => setJsonModalOpen(true)}
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
          onRetry={handleRetry}
          hasMore={hasMoreMessages}
          loadingMore={loadingMoreMessages}
          onLoadMore={handleLoadMoreMessages}
          onViewRun={handleViewRun}
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
