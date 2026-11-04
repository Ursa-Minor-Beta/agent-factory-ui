import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { ActionIcon, Alert, Box, Center, Group, Loader, ScrollArea, Stack, Text, Tooltip } from '@mantine/core';
import { IconAlertTriangle, IconCheck, IconCode, IconMessagePlus } from '@tabler/icons-react';
import { AssistantInput } from './AssistantInput';
import { MessageBubble } from '../../../../pages/Chat/ChatMessages/MessageBubble';
import { useAgentModal } from '../../../AgentCreateModal';
import { useRunDetailsModal } from '../../../RunDetailsModal';
import { useAssistantChat, type AssistantMessage } from './useAssistantChat';
import { AssistantAgentSelect } from './AssistantAgentSelect';
import { RunStatus } from '../../../AgentStream';
import type { AssistantEditor } from './assistantTools';

export type { AssistantEditor } from './assistantTools';

const ASSISTANT_AGENT_STORAGE_KEY = 'agent-editor-assistant-agent';

// Last picked builder agent
function readAssistantAgentId(): string | null {
  try {
    return localStorage.getItem(ASSISTANT_AGENT_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeAssistantAgentId(agentId: string | null) {
  try {
    if (agentId) localStorage.setItem(ASSISTANT_AGENT_STORAGE_KEY, agentId);
    else localStorage.removeItem(ASSISTANT_AGENT_STORAGE_KEY);
  } catch {
    // Storage unavailable - choice just won't survive reload
  }
}

interface AssistantTabProps {
  // Edited agent id, 'new' for an unsaved agent
  agentKey: string;
  editor: AssistantEditor;
  onSendingChange?: (sending: boolean) => void;
}

const noop = () => {};

// Memoized: messages are immutable, a new message must not re-render (re-parse markdown of) older ones
const MessageItem = memo(function MessageItem({ message, onViewRun }: { message: AssistantMessage; onViewRun: (runId: string) => void }) {
  if (message.role === 'tool') {
    return (
      <Box px="md" py={4}>
        <Group gap={6} wrap="nowrap">
          {message.ok
            ? <IconCheck size={14} color="var(--mantine-color-green-5)" />
            : <IconAlertTriangle size={14} color="var(--mantine-color-orange-5)" />}
          <Text size="xs" c="dimmed" truncate>
            {message.content}
          </Text>
        </Group>
        {message.errors?.map((err) => (
          <Text key={err} size="xs" c="orange" pl={20}>
            {err}
          </Text>
        ))}
      </Box>
    );
  }

  // Same bubble as the Chat page (copy, timestamp, run details, file previews)
  return (
    <MessageBubble
      message={{ ...message, role: message.role }}
      isFirst={false}
      showRetry={false}
      onRetry={noop}
      onViewRun={onViewRun}
    />
  );
});

export function AssistantTab({ agentKey, editor, onSendingChange }: AssistantTabProps) {
  const [assistantAgentId, setAssistantAgentId] = useState(readAssistantAgentId);
  const { openEditAgent } = useAgentModal();
  const { openRunDetails } = useRunDetailsModal();
  // useRunDetailsModal returns a new function on every URL change - keep a stable one for memoized messages
  const openRunDetailsRef = useRef(openRunDetails);
  openRunDetailsRef.current = openRunDetails;
  const handleViewRun = useCallback((runId: string) => openRunDetailsRef.current(runId), []);
  const { messages, loadingHistory, sending, statusText, runId, steps, error, clearError, send, cancel, newChat } =
    useAssistantChat(assistantAgentId ?? undefined, agentKey, editor);

  const handleAssistantAgentChange = (agentId: string | null) => {
    setAssistantAgentId(agentId);
    writeAssistantAgentId(agentId);
  };
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    onSendingChange?.(sending);
  }, [sending, onSendingChange]);

  // Keep the latest message in view
  useEffect(() => {
    viewportRef.current?.scrollTo({ top: viewportRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, statusText]);

  return (
    <Stack gap={0} style={{ flex: 1, minHeight: 0 }}>
      <Group gap={6} px="xs" py={6} wrap="nowrap">
        <AssistantAgentSelect value={assistantAgentId} onChange={handleAssistantAgentChange} disabled={sending} />
        <Tooltip label="JSON editor">
          <ActionIcon
            size="sm"
            variant="subtle"
            onClick={() => assistantAgentId && openEditAgent(assistantAgentId)}
            disabled={!assistantAgentId}
          >
            <IconCode size={16} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="New chat">
          <ActionIcon size="sm" variant="subtle" onClick={newChat} disabled={!messages.length && !sending}>
            <IconMessagePlus size={16} />
          </ActionIcon>
        </Tooltip>
      </Group>

      <ScrollArea viewportRef={viewportRef} style={{ flex: 1, minHeight: 0 }} px="xs">
        {loadingHistory ? (
          <Center py="xl">
            <Loader size="sm" />
          </Center>
        ) : !assistantAgentId ? (
          <Text size="sm" c="dimmed" ta="center" py="xl" px="sm">
            Select a builder agent to start
          </Text>
        ) : !messages.length ? (
          <Text size="sm" c="dimmed" ta="center" py="xl" px="sm">
            Describe the agent you want, or ask to change it - e.g. "Add an LLM node that summarizes the HTTP response"
          </Text>
        ) : (
          <Stack gap={0} py="xs" style={{ wordBreak: 'break-word' }}>
            {messages.map((message) => (
              <MessageItem key={message.id} message={message} onViewRun={handleViewRun} />
            ))}
          </Stack>
        )}

        {sending && <RunStatus statusText={statusText} runId={runId} steps={steps} />}

        {error && (
          <Alert color="red" variant="light" p="xs" mb="xs" withCloseButton onClose={clearError}>
            <Text size="xs">{error}</Text>
          </Alert>
        )}
      </ScrollArea>

      <AssistantInput disabled={!assistantAgentId} sending={sending} onSend={send} onCancel={cancel} />
    </Stack>
  );
}
