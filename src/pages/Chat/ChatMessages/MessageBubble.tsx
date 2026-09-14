import { Box, Paper, ActionIcon, Tooltip, Group, CopyButton } from '@mantine/core';
import { IconRefresh, IconCopy, IconCheck, IconListDetails, IconRepeat } from '@tabler/icons-react';
import type { ChatMessage } from '../types';
import { CollapsibleContent } from './CollapsibleContent';
import { AttachmentPreview } from './AttachmentPreview';

interface MessageBubbleProps {
  message: ChatMessage;
  isFirst: boolean;
  showRetry: boolean;
  onRetry: () => void;
  onViewRun: (runId: string) => void;
  onRepeat?: (content: string) => void;
}

export function MessageBubble({ message, isFirst, showRetry, onRetry, onViewRun, onRepeat }: MessageBubbleProps) {
  return (
    <Box
      px="md"
      pt={isFirst ? 100 : 8}
      pb="xs"
      style={{
        display: 'flex',
        justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
        alignItems: 'flex-end',
        gap: 8,
      }}
    >
      {showRetry && (
        <Tooltip label="Retry">
          <ActionIcon
            variant="subtle"
            color="red"
            size="sm"
            onClick={onRetry}
          >
            <IconRefresh size={16} />
          </ActionIcon>
        </Tooltip>
      )}
      <Paper
        className="message-bubble"
        p="sm"
        radius="lg"
        style={{
          maxWidth: '80%',
          position: 'relative',
          backgroundColor:
            message.role === 'user'
              ? showRetry
                ? 'var(--mantine-color-red-9)'
                : 'var(--mantine-color-cyan-9)'
              : 'var(--mantine-color-dark-5)',
        }}
      >
        {message.content && <CollapsibleContent content={message.content} />}
        {message.attachments && message.attachments.length > 0 && (
          <AttachmentPreview attachments={message.attachments} />
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
          <CopyButton value={message.content}>
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
          {message.role === 'user' && onRepeat && (
            <Tooltip label="Repeat">
              <ActionIcon
                variant="subtle"
                size="xs"
                onClick={() => onRepeat(message.content)}
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
        `}</style>
      </Paper>
    </Box>
  );
}
