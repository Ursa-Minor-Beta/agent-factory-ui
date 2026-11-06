import { memo, useCallback, useEffect, useRef } from 'react';
import { ActionIcon, Center, Group, Loader, ScrollArea, Stack, Text, Tooltip } from '@mantine/core';
import { useLocalStorage } from '@mantine/hooks';
import { IconCode, IconMessagePlus } from '@tabler/icons-react';
import { AssistantInput } from './AssistantInput';
import { MessageBubble } from '../../../../pages/Chat/ChatMessages/MessageBubble';
import { useAgentModal } from '../../../AgentCreateModal';
import { useRunDetailsModal } from '../../../RunDetailsModal';
import { useAssistantChat, type AssistantMessage } from './useAssistantChat';
import { AssistantAgentSelect } from './AssistantAgentSelect';
import { RunStatus, RunErrorAlert } from '../../../AgentStream';
import type { AssistantEditor } from './assistantTools';

export type { AssistantEditor } from './assistantTools';

const ASSISTANT_AGENT_STORAGE_KEY = 'agent-editor-assistant-agent';

interface AssistantTabProps {
  // Edited agent id, 'new' for an unsaved agent
  agentKey: string;
  editor: AssistantEditor;
  onSendingChange?: (sending: boolean) => void;
}

const noop = () => {};

// Memoized: messages are immutable, a new message must not re-render (re-parse markdown of) older ones
// Same bubble as the Chat page (copy, timestamp, run details, file previews, tool calls)
const MessageItem = memo(function MessageItem({ message, onViewRun }: { message: AssistantMessage; onViewRun: (runId: string) => void }) {
  return (
    <MessageBubble
      message={message}
      isFirst={false}
      showRetry={false}
      onRetry={noop}
      onViewRun={onViewRun}
    />
  );
});

// Memoized: PanelLeft re-renders on every editor change, the chat only depends on stable props
export const AssistantTab = memo(function AssistantTab({ agentKey, editor, onSendingChange }: AssistantTabProps) {
  // Last picked builder agent, stored as a plain id
  const [assistantAgentId, setAssistantAgentId] = useLocalStorage<string | null>({
    key: ASSISTANT_AGENT_STORAGE_KEY,
    defaultValue: null,
    getInitialValueInEffect: false,
    serialize: (value) => value ?? '',
    deserialize: (value) => value || null,
  });
  const { openEditAgent } = useAgentModal();
  const { openRunDetails } = useRunDetailsModal();
  // useRunDetailsModal returns a new function on every URL change - keep a stable one for memoized messages
  const openRunDetailsRef = useRef(openRunDetails);
  openRunDetailsRef.current = openRunDetails;
  const handleViewRun = useCallback((runId: string) => openRunDetailsRef.current(runId), []);
  const { messages, loadingHistory, sending, statusText, runId, steps, error, errorRunId, clearError, send, cancel, newChat } =
    useAssistantChat(assistantAgentId ?? undefined, agentKey, editor);

  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    onSendingChange?.(sending);
  }, [sending, onSendingChange]);

  // Keep the latest message in view
  useEffect(() => {
    viewportRef.current?.scrollTo({ top: viewportRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, statusText, steps]);

  return (
    <Stack gap={0} style={{ flex: 1, minHeight: 0 }}>
      <Group gap={6} px="xs" py={6} wrap="nowrap">
        <AssistantAgentSelect value={assistantAgentId} onChange={setAssistantAgentId} disabled={sending} />
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

        {sending && <RunStatus statusText={statusText} runId={runId} steps={steps} mx="md" mb="xs" />}

        {error && <RunErrorAlert error={error} runId={errorRunId} onClose={clearError} variant="light" size="xs" mb="xs" />}
      </ScrollArea>

      <AssistantInput disabled={!assistantAgentId} sending={sending} onSend={send} onCancel={cancel} />
    </Stack>
  );
});
