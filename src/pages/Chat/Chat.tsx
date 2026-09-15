import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Loader, Alert, Center, Modal, Text, Group, Button } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { IconAlertCircle } from '@tabler/icons-react';
import { agentsApi, sessionsApi, runsApi, ApiError } from '../../api';
import type { Agent, Session, Run } from '../../types';
import { ChatHeader } from './ChatHeader';
import { ChatInput } from './ChatInput';
import { ChatMessages } from './ChatMessages';
import { ChatSidebar } from './ChatSidebar';
import { AgentEditModal } from '../../components/AgentEditModal';
import { AgentJsonModal } from '../../components/AgentJsonModal';
import { RunDetailsModal } from '../../components/RunDetailsModal';
import { getInputSchema, type ChatMessage, type MessageAttachment, type FileRef } from './types';

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

// Check if string is an inner file reference (inner:<fileId>:<fieldName>)
function isInnerFileRef(str: string): boolean {
  return typeof str === 'string' && str.startsWith('inner:');
}

// Parse inner file reference to FileRef
function parseInnerRef(str: string, fieldName: string): FileRef | null {
  if (!isInnerFileRef(str)) return null;
  const parts = str.split(':');
  if (parts.length < 2) return null;
  const fileId = parts[1];
  const refFieldName = parts.slice(2).join(':') || fieldName;
  // Guess mime type from field name
  const lower = fieldName.toLowerCase();
  let mimeType = 'application/octet-stream';
  if (lower.includes('screenshot') || lower.includes('image') || lower.includes('png')) {
    mimeType = 'image/png';
  } else if (lower.includes('jpg') || lower.includes('jpeg') || lower.includes('photo')) {
    mimeType = 'image/jpeg';
  } else if (lower.includes('pdf')) {
    mimeType = 'application/pdf';
  }
  return { index: 0, fileId, fieldName: refFieldName, mimeType };
}

// Extract base64 attachments and inner file refs from object recursively
function extractAttachments(
  data: Record<string, unknown>,
  attachments: MessageAttachment[],
  fileRefs: FileRef[],
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
    } else if (typeof value === 'string' && isInnerFileRef(value)) {
      // Handle inner file reference
      const ref = parseInnerRef(value, fullKey);
      if (ref) {
        ref.index = fileRefs.length;
        fileRefs.push(ref);
      }
      // Don't include in cleaned output
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Handle nested objects (like screenshots: { name: base64 })
      const nestedAttachments: MessageAttachment[] = [];
      const nestedFileRefs: FileRef[] = [];
      const cleanedNested = extractAttachments(value as Record<string, unknown>, nestedAttachments, nestedFileRefs, fullKey);

      // Check if this object only contained base64 values or file refs
      if (nestedAttachments.length > 0) {
        attachments.push(...nestedAttachments);
      }
      if (nestedFileRefs.length > 0) {
        nestedFileRefs.forEach(ref => {
          ref.index = fileRefs.length;
          fileRefs.push(ref);
        });
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
        } else if (typeof item === 'string' && isInnerFileRef(item)) {
          const ref = parseInnerRef(item, `${fullKey}[${index}]`);
          if (ref) {
            ref.index = fileRefs.length;
            fileRefs.push(ref);
          }
        } else if (typeof item === 'object' && item !== null) {
          const nestedAttachments: MessageAttachment[] = [];
          const nestedFileRefs: FileRef[] = [];
          const cleanedItem = extractAttachments(item as Record<string, unknown>, nestedAttachments, nestedFileRefs, `${fullKey}[${index}]`);
          attachments.push(...nestedAttachments);
          nestedFileRefs.forEach(ref => {
            ref.index = fileRefs.length;
            fileRefs.push(ref);
          });
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

// Helper to format input/output object for display (returns text, attachments, and file refs)
function formatContentWithAttachments(data: Record<string, unknown>): { text: string; attachments: MessageAttachment[]; fileRefs: FileRef[] } {
  const attachments: MessageAttachment[] = [];
  const fileRefs: FileRef[] = [];
  const cleaned = extractAttachments(data, attachments, fileRefs);

  const entries = Object.entries(cleaned);
  let text = '';
  if (entries.length === 1) {
    text = stringifyValue(entries[0][1]);
  } else if (entries.length > 1) {
    text = entries.map(([key, value]) => `**${formatLabel(key)}**  \n${stringifyValue(value)}`).join('\n\n&nbsp;\n\n');
  }

  return { text, attachments, fileRefs };
}

// Legacy helper for user input display (no attachment extraction needed)
function formatContent(data: Record<string, unknown>): string {
  const entries = Object.entries(data);
  if (entries.length === 0) return '';
  if (entries.length === 1) return stringifyValue(entries[0][1]);
  return entries.map(([key, value]) => `**${formatLabel(key)}**  \n${stringifyValue(value)}`).join('\n\n&nbsp;\n\n');
}

// Helper to parse JSON message content (handles both string and object input)
function parseMessageContent(content: unknown): { text: string; attachments: MessageAttachment[]; fileRefs: FileRef[] } {
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
    return { text: content, attachments: [], fileRefs: [] };
  }

  // For other primitives, convert to string
  return { text: String(content ?? ''), attachments: [], fileRefs: [] };
}

// Parse file references from message.files array
// Format: "inner:<fileId>:<fieldName>"
function parseFileReferences(files: string[] | undefined, content: string): FileRef[] {
  if (!files || files.length === 0) return [];

  const fileRefs: FileRef[] = [];
  // Match placeholders like [file:0:image/png]
  const placeholderRegex = /\[file:(\d+):([^\]]+)\]/g;
  let match;

  while ((match = placeholderRegex.exec(content)) !== null) {
    const index = parseInt(match[1], 10);
    const mimeType = match[2];

    if (index < files.length) {
      const fileRef = files[index];
      // Parse "inner:<fileId>:<fieldName>"
      const parts = fileRef.split(':');
      if (parts.length >= 2) {
        const fileId = parts[1];
        const fieldName = parts.slice(2).join(':'); // In case fieldName has colons
        fileRefs.push({ index, fileId, fieldName, mimeType });
      }
    }
  }

  return fileRefs;
}

// Helper to map API message to ChatMessage
function mapApiMessageToChatMessage(m: { id: string; role: 'user' | 'assistant' | 'system' | 'tool'; content: string; files?: string[]; runId?: string; createdAt: string }): ChatMessage {
  const { text, attachments, fileRefs: contentFileRefs } = parseMessageContent(m.content);
  const messageFileRefs = parseFileReferences(m.files, typeof m.content === 'string' ? m.content : text);

  // Merge file refs from content and message.files array
  const allFileRefs = [...contentFileRefs, ...messageFileRefs];

  return {
    id: m.id,
    role: m.role,
    runId: m.runId,
    content: text,
    attachments: attachments.length > 0 ? attachments : undefined,
    fileRefs: allFileRefs.length > 0 ? allFileRefs : undefined,
    createdAt: m.createdAt,
  };
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
  const [errorRunId, setErrorRunId] = useState<string | undefined>();
  const [startIncognito, setStartIncognito] = useState(false);
  const [lastInput, setLastInput] = useState<Record<string, unknown> | null>(null);

  // Run cancellation state
  const [currentRunId, setCurrentRunId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [statusText, setStatusText] = useState<string | undefined>();
  const abortControllerRef = useRef<AbortController | null>(null);

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
        setMessages(data.map(mapApiMessageToChatMessage));
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
      // Prepend older messages
      setMessages((prev) => [...data.map(mapApiMessageToChatMessage), ...prev]);
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
    setCurrentRunId(null);
    setCancelling(false);

    const shouldBeIncognito = isNewChat && startIncognito;

    // Create abort controller for request cancellation
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      await sessionsApi.chatStream(
        agentId,
        {
          input,
          sessionId: currentSessionId || undefined,
          incognito: shouldBeIncognito,
        },
        {
          onInit: (data) => {
            // Store runId immediately for cancel support
            setCurrentRunId(data.runId);
            if (data.isNewSession && data.sessionId) {
              setCurrentSessionId(data.sessionId);
              setStartIncognito(false);
              if (!data.sessionId.startsWith('incognito_')) {
                loadSessions();
              }
            }
          },
          onStatus: (data) => {
            // Update status text for display
            setStatusText(data.statusText);
          },
          onDone: (data) => {
            if (data.cancelled) {
              setError('Run was cancelled');
              return;
            }

            const { text, attachments, fileRefs } = parseMessageContent(data.response);
            const assistantMessage: ChatMessage = {
              id: `response-${Date.now()}`,
              role: 'assistant',
              content: text,
              attachments: attachments.length > 0 ? attachments : undefined,
              fileRefs: fileRefs.length > 0 ? fileRefs : undefined,
              createdAt: new Date().toISOString(),
              runId: data.runId,
            };

            setMessages((prev) => [...prev, assistantMessage]);
          },
          onError: (data) => {
            setError(data.message);
            if (data.runId) {
              setErrorRunId(data.runId);
            }
          },
        },
        abortController.signal
      );
    } catch (err) {
      // Handle abort/cancel
      if (err instanceof DOMException && err.name === 'AbortError') {
        // Don't show error for user-initiated cancel
        return;
      }
      setError(err instanceof Error ? err.message : 'Failed to send message');
      if (err instanceof ApiError && err.runId) {
        setErrorRunId(err.runId);
      } else {
        setErrorRunId(undefined);
      }
    } finally {
      setSending(false);
      setCurrentRunId(null);
      setCancelling(false);
      setStatusText(undefined);
      abortControllerRef.current = null;
    }
  };

  const handleCancelRun = useCallback(async () => {
    if (cancelling || !agentId) return;

    setCancelling(true);

    // If we have a runId, cancel it on the server using the new endpoint
    if (currentRunId) {
      try {
        await sessionsApi.cancelChat(agentId, currentRunId);
      } catch {
        // Ignore cancel errors - we'll still abort the request
      }
    }

    // Abort the fetch request
    abortControllerRef.current?.abort();
  }, [agentId, currentRunId, cancelling]);

  const handleRetry = useCallback(() => {
    if (!lastInput || sending) return;
    // Remove the last user message (the failed one)
    setMessages((prev) => prev.slice(0, -1));
    setError('');
    setErrorRunId(undefined);
    // Re-send with the same input
    handleSend(lastInput);
  }, [lastInput, sending]);

  const handleRepeat = useCallback((content: string) => {
    if (sending) return;
    // Get the first field from schema to use for the repeated content
    const schemaFields = Object.keys(inputSchema);
    if (schemaFields.length === 0) return;
    const firstField = schemaFields[0];
    handleSend({ [firstField]: content });
  }, [sending, inputSchema]);

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
      setSessions((prev) => prev.filter((s) => s.id !== sessionToDelete));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete session');
    } finally {
      setSessionToDelete(null);
    }
  };

  const handleRenameSession = async (id: string, title: string) => {
    await sessionsApi.update(id, { title: title || null });
    setSessions((prev) => prev.map((s) => {
      if (s.id === id) {
        return { ...s, title }
      }
      return s
    }));
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
        onRenameSession={handleRenameSession}
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
          errorRunId={errorRunId}
          onClearError={() => { setError(''); setErrorRunId(undefined); }}
          onRetry={handleRetry}
          hasMore={hasMoreMessages}
          loadingMore={loadingMoreMessages}
          onLoadMore={handleLoadMoreMessages}
          onViewRun={handleViewRun}
          onRepeat={handleRepeat}
          statusText={statusText}
        />

        <ChatInput
          onSend={handleSend}
          sending={sending}
          inputSchema={inputSchema}
          draftKey={`chat-draft-${agentId}-${currentSessionId || 'new'}`}
          onCancel={handleCancelRun}
        />
      </Box>
    </Box>
  );
}
