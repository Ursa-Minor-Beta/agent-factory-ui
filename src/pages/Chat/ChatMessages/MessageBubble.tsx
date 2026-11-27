import { memo } from 'react';
import { Box, Paper, ActionIcon, Tooltip, Group, CopyButton, Text } from '@mantine/core';
import { IconCopy, IconCheck, IconListDetails, IconRepeat, IconAlertCircle, IconPlayerStop } from '@tabler/icons-react';
import type { ChatMessage } from '../types';
import { MessageContent } from './MessageContent';
import { MessageToolCalls } from '../../../components/AgentStream';

function formatMessageDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    // Today: show only time
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  // Other days: show date + time
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

interface MessageBubbleProps {
  message: ChatMessage;
  isFirst: boolean;
  onViewRun: (runId: string) => void;
  onRepeat?: (input: Record<string, unknown>) => void;
}

// Memoized - the list re-renders on every stream update, bubbles only when their own props change
export const MessageBubble = memo(function MessageBubble({ message, isFirst, onViewRun, onRepeat }: MessageBubbleProps) {
  return (
    <Box
      px="md"
      pt={isFirst ? 100 : 'md'}
      pb="xs"
      style={{
        display: 'flex',
        marginRight: message.role === 'user' ? '.5rem' : '',
        marginLeft: message.role !== 'user' ? '.5rem' : '',
        justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
        alignItems: 'flex-end',
        gap: 8,
      }}
    >
      <Paper
        className={message.role === 'user' ? 'message-bubble message-bubble-user' : 'message-bubble'}
        p="sm"
        radius="lg"
        style={{
          minWidth: '40px',
          maxWidth: '90%',
          position: 'relative',
          backgroundColor:
            message.status === 'failed'
              ? 'light-dark(var(--mantine-color-red-0), rgba(250, 82, 82, 0.15))'
              : message.role === 'user'
              ? 'var(--mantine-color-cyan-light)'
              : 'light-dark(var(--mantine-color-gray-1), var(--mantine-color-dark-5))',
        }}
      >
        {message.toolCalls && <MessageToolCalls toolCalls={message.toolCalls} />}
        {message.status === 'failed' ? (
          <Group gap="xs" wrap="nowrap" align="flex-start">
            <IconAlertCircle size={18} color="var(--mantine-color-red-filled)" style={{ flexShrink: 0, marginTop: 2 }} />
            <Box>
              <Text size="sm" c="red" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {message.content}
              </Text>
            </Box>
          </Group>
        ) : message.status === 'cancelled' ? (
          <Group gap={6} wrap="nowrap">
            <IconPlayerStop size={14} color="var(--mantine-color-dimmed)" />
            <Text size="sm" c="dimmed" fs="italic">
              Stopped
            </Text>
          </Group>
        ) : (
          <MessageContent
            content={message.content}
            attachments={message.attachments}
            fileRefs={message.fileRefs}
            messageId={message.id}
          />
        )}
        {message.createdAt && (
          <Text size="xs" c="dimmed" mt={4} style={{ textAlign: message.role === 'user' ? 'right' : 'left' }}>
            {formatMessageDate(message.createdAt)}
          </Text>
        )}
        <Group
          gap={4}
          className="message-hover-btns"
          style={{
            position: 'absolute',
            bottom: -20,
            right: 0,
            opacity: 0,
            transition: 'opacity 0.15s',
          }}
        >
          <CopyButton value={message.status === 'cancelled' ? 'Stopped' : message.content}>
            {({ copied, copy }) => (
              <Tooltip label={copied ? 'Copied' : 'Copy'}>
                <ActionIcon variant="subtle" size="xs" onClick={copy}>
                  {copied ? <IconCheck size={12} /> : <IconCopy size={12} />}
                </ActionIcon>
              </Tooltip>
            )}
          </CopyButton>
          {message.role === 'assistant' && message.runId && (
            <Tooltip label="View run details">
              <ActionIcon
                variant="subtle"
                size="xs"
                onClick={() => onViewRun(message.runId!)}
              >
                <IconListDetails size={12} />
              </ActionIcon>
            </Tooltip>
          )}
          {message.role === 'user' && onRepeat && message.rawInput && (
            <Tooltip label="Repeat">
              <ActionIcon
                variant="subtle"
                size="xs"
                onClick={() => onRepeat(message.rawInput!)}
              >
                <IconRepeat size={12} />
              </ActionIcon>
            </Tooltip>
          )}
        </Group>
        <style>{`
          .message-bubble:hover .message-hover-btns {
            opacity: 1 !important;
          }
          /* Markdown collapses single newlines; keep the user's typed line breaks */
          .message-bubble-user p {
            white-space: pre-wrap;
          }
        `}</style>
      </Paper>
    </Box>
  );
});
