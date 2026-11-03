import { useEffect, useRef, useState } from 'react';
import { ActionIcon, Alert, Box, Center, Group, Loader, Paper, ScrollArea, Stack, Text, Textarea, Tooltip } from '@mantine/core';
import { IconAlertTriangle, IconArrowUp, IconCheck, IconCode, IconMessagePlus, IconPlayerStop } from '@tabler/icons-react';
import { MarkdownRenderer } from '../../../MarkdownRenderer';
import { useAgentModal } from '../../../AgentCreateModal';
import { useAssistantChat, type AssistantMessage } from './useAssistantChat';
import { AssistantAgentSelect } from './AssistantAgentSelect';
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

function MessageItem({ message }: { message: AssistantMessage }) {
  if (message.role === 'user') {
    return (
      <Paper px="sm" py={6} radius="md" bg="var(--mantine-color-cyan-light)" ml="xl" style={{ alignSelf: 'flex-end' }}>
        <Text size="sm" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {message.content}
        </Text>
      </Paper>
    );
  }

  if (message.role === 'tool') {
    return (
      <Box>
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

  return (
    <Box style={{ wordBreak: 'break-word' }}>
      <MarkdownRenderer>{message.content}</MarkdownRenderer>
    </Box>
  );
}

export function AssistantTab({ agentKey, editor, onSendingChange }: AssistantTabProps) {
  const [assistantAgentId, setAssistantAgentId] = useState(readAssistantAgentId);
  const { openEditAgent } = useAgentModal();
  const { messages, loadingHistory, sending, statusText, error, clearError, send, cancel, newChat } =
    useAssistantChat(assistantAgentId ?? undefined, agentKey, editor);

  const handleAssistantAgentChange = (agentId: string | null) => {
    setAssistantAgentId(agentId);
    writeAssistantAgentId(agentId);
  };
  const [draft, setDraft] = useState('');
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    onSendingChange?.(sending);
  }, [sending, onSendingChange]);

  // Keep the latest message in view
  useEffect(() => {
    viewportRef.current?.scrollTo({ top: viewportRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, statusText]);

  const handleSend = () => {
    if (!draft.trim() || sending || !assistantAgentId) return;
    send(draft);
    setDraft('');
  };

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
          <Stack gap="sm" py="xs">
            {messages.map((message) => (
              <MessageItem key={message.id} message={message} />
            ))}
          </Stack>
        )}

        {sending && (
          <Group gap={6} pb="xs">
            <Loader size={12} />
            <Text size="xs" c="dimmed">
              {statusText || 'Thinking...'}
            </Text>
          </Group>
        )}

        {error && (
          <Alert color="red" variant="light" p="xs" mb="xs" withCloseButton onClose={clearError}>
            <Text size="xs">{error}</Text>
          </Alert>
        )}
      </ScrollArea>

      <Box p="xs" style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}>
        <Group gap={6} align="flex-end" wrap="nowrap">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={assistantAgentId ? 'Ask the assistant...' : 'Select a builder agent first'}
            disabled={!assistantAgentId}
            autosize
            minRows={1}
            maxRows={8}
            size="sm"
            style={{ flex: 1 }}
          />
          {sending ? (
            <Tooltip label="Stop">
              <ActionIcon size="lg" variant="light" color="red" onClick={cancel}>
                <IconPlayerStop size={16} />
              </ActionIcon>
            </Tooltip>
          ) : (
            <Tooltip label="Send (Enter)">
              <ActionIcon size="lg" variant="filled" onClick={handleSend} disabled={!draft.trim() || !assistantAgentId}>
                <IconArrowUp size={16} />
              </ActionIcon>
            </Tooltip>
          )}
        </Group>
      </Box>
    </Stack>
  );
}
