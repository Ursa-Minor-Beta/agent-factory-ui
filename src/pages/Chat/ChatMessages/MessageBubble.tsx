import { Box, Paper, ActionIcon, Tooltip, Group, CopyButton } from '@mantine/core';
import { IconRefresh, IconCopy, IconCheck, IconListDetails } from '@tabler/icons-react';
import type { ChatMessage } from '../types';
import { CollapsibleContent } from './CollapsibleContent';
import { AttachmentPreview } from './AttachmentPreview';

interface MessageBubbleProps {
  message: ChatMessage;
  isFirst: boolean;
  showRetry: boolean;
  onRetry: () => void;
  onViewRun: (runId: string) => void;
}

export function MessageBubble({ message, isFirst, showRetry, onRetry, onViewRun }: MessageBubbleProps) {
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
        {message.role === 'assistant' && (
          <Box
            className="message-hover-zone"
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: 24,
            }}
          >
            <Group
              gap={4}
              className="message-hover-btns"
              style={{
                position: 'absolute',
                bottom: 4,
                left: 4,
                opacity: 0,
                transition: 'opacity 0.15s',
                backgroundColor: 'var(--mantine-color-dark-6)',
                borderRadius: 4,
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
              {message.runId && (
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
            </Group>
          </Box>
        )}
        <style>{`
          .message-hover-zone:hover .message-hover-btns {
            opacity: 1 !important;
          }
        `}</style>
      </Paper>
    </Box>
  );
}
