import { useRef, useEffect, useState, type ElementRef } from 'react';
import { Box, Text, Stack, Paper, Loader, Alert, Center, ActionIcon, Tooltip, Group, Button, ScrollArea, CopyButton, Code, Image, Modal } from '@mantine/core';
import { Virtuoso } from 'react-virtuoso';
import { IconAlertCircle, IconGhost, IconRefresh, IconChevronDown, IconChevronUp, IconCopy, IconCheck, IconDownload, IconFile } from '@tabler/icons-react';
import { MarkdownRenderer } from '../../components/MarkdownRenderer';
import type { ChatMessagesProps, MessageAttachment } from './types';

const MAX_PREVIEW_LENGTH = 500;
const MAX_MARKDOWN_LENGTH = 5000;
const MAX_EXPANDED_HEIGHT = 400;

// Download base64 data as file
function downloadBase64(data: string, filename: string, isImage: boolean) {
  const mimeType = isImage ? 'image/png' : 'application/octet-stream';
  const link = document.createElement('a');
  link.href = `data:${mimeType};base64,${data}`;
  link.download = filename;
  link.click();
}

// Attachment preview component
function AttachmentPreview({ attachments }: { attachments: MessageAttachment[] }) {
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  if (attachments.length === 0) return null;

  return (
    <>
      {/* Image preview modal */}
      <Modal
        opened={!!previewImage}
        onClose={() => setPreviewImage(null)}
        size="xl"
        padding={0}
        withCloseButton
      >
        {previewImage && (
          <Image src={`data:image/png;base64,${previewImage}`} alt="Preview" fit="contain" />
        )}
      </Modal>

      <Group gap="xs" mt="sm" wrap="wrap">
        {attachments.map((att, idx) => (
          <Tooltip key={idx} label={`${att.name} (${att.size})`}>
            <Box
              style={{
                position: 'relative',
                borderRadius: 8,
                overflow: 'hidden',
                cursor: 'pointer',
                border: '1px solid var(--mantine-color-dark-4)',
              }}
            >
              {att.type === 'image' ? (
                <Box onClick={() => setPreviewImage(att.data)}>
                  <Image
                    src={`data:image/png;base64,${att.data}`}
                    alt={att.name}
                    w={80}
                    h={60}
                    fit="cover"
                  />
                  <ActionIcon
                    variant="filled"
                    size="xs"
                    style={{ position: 'absolute', bottom: 4, right: 4 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadBase64(att.data, `${att.name}.png`, true);
                    }}
                  >
                    <IconDownload size={12} />
                  </ActionIcon>
                </Box>
              ) : (
                <Box
                  p="xs"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    backgroundColor: 'var(--mantine-color-dark-6)',
                  }}
                  onClick={() => downloadBase64(att.data, att.name, false)}
                >
                  <IconFile size={20} />
                  <Text size="xs" style={{ maxWidth: 100 }} truncate>
                    {att.size}
                  </Text>
                </Box>
              )}
            </Box>
          </Tooltip>
        ))}
      </Group>
    </>
  );
}

function CollapsibleContent({ content }: { content: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = content.length > MAX_PREVIEW_LENGTH;
  const isVeryLong = content.length > MAX_MARKDOWN_LENGTH;

  // Short content - render normally
  if (!isLong) {
    return <MarkdownRenderer>{content}</MarkdownRenderer>;
  }

  // Very long content - use Code block (no markdown parsing)
  if (isVeryLong) {
    const preview = content.slice(0, MAX_PREVIEW_LENGTH);
    return (
      <>
        <ScrollArea.Autosize mah={expanded ? MAX_EXPANDED_HEIGHT : undefined}>
          <Code block style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 12 }}>
            {expanded ? content : preview + '...'}
          </Code>
        </ScrollArea.Autosize>
        <Group gap="xs" mt="xs">
          <Button
            variant="subtle"
            size="xs"
            leftSection={expanded ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? 'Show less' : `Show more (${Math.round(content.length / 1000)}k chars)`}
          </Button>
          <CopyButton value={content}>
            {({ copied, copy }) => (
              <Tooltip label={copied ? 'Copied' : 'Copy full content'}>
                <ActionIcon variant="subtle" size="sm" onClick={copy}>
                  {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                </ActionIcon>
              </Tooltip>
            )}
          </CopyButton>
        </Group>
      </>
    );
  }

  // Medium length - use markdown with scroll
  return (
    <>
      {expanded ? (
        <ScrollArea.Autosize mah={MAX_EXPANDED_HEIGHT}>
          <MarkdownRenderer>{content}</MarkdownRenderer>
        </ScrollArea.Autosize>
      ) : (
        <MarkdownRenderer>{content.slice(0, MAX_PREVIEW_LENGTH) + '...'}</MarkdownRenderer>
      )}
      <Group gap="xs" mt="xs">
        <Button
          variant="subtle"
          size="xs"
          leftSection={expanded ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? 'Show less' : 'Show more'}
        </Button>
        <CopyButton value={content}>
          {({ copied, copy }) => (
            <Tooltip label={copied ? 'Copied' : 'Copy full content'}>
              <ActionIcon variant="subtle" size="sm" onClick={copy}>
                {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
              </ActionIcon>
            </Tooltip>
          )}
        </CopyButton>
      </Group>
    </>
  );
}

export function ChatMessages({
  messages,
  loading,
  sending,
  agentName,
  isNewChat,
  isIncognito,
  error,
  onClearError,
  onRetry,
  hasMore,
  loadingMore,
  onLoadMore,
}: ChatMessagesProps) {
  const virtuosoRef = useRef<ElementRef<typeof Virtuoso>>(null);
  const isAtBottomRef = useRef(true);

  // Auto-scroll to bottom when new messages arrive (if already at bottom)
  useEffect(() => {
    if (isAtBottomRef.current && messages.length > 0) {
      virtuosoRef.current?.scrollToIndex({
        index: messages.length - 1,
        behavior: 'smooth',
        align: 'end',
      });
    }
  }, [messages.length]);

  // Scroll to bottom when sending starts
  useEffect(() => {
    if (sending) {
      virtuosoRef.current?.scrollToIndex({
        index: messages.length - 1,
        behavior: 'smooth',
        align: 'end',
      });
    }
  }, [sending, messages.length]);

  if (loading) {
    return (
      <Center style={{ height: '100%' }}>
        <Loader />
      </Center>
    );
  }

  if (messages.length === 0) {
    return (
      <Center style={{ height: '100%' }}>
        <Stack align="center" gap="xs">
          <Text size="lg" c="dimmed">
            Start a conversation
          </Text>
          <Text size="sm" c="dimmed">
            Send a message to chat with {agentName}
          </Text>
          {isNewChat && isIncognito && (
            <Text size="xs" c="violet">
              <IconGhost size={14} style={{ verticalAlign: 'middle' }} />{' '}
              Incognito mode - messages won't be saved
            </Text>
          )}
        </Stack>
      </Center>
    );
  }

  return (
    <Box style={{ height: '100%', position: 'relative' }}>
      {error && (
        <Alert
          icon={<IconAlertCircle size={16} />}
          color="red"
          mb="md"
          withCloseButton
          onClose={onClearError}
          style={{
            position: 'absolute',
            top: 80,
            left: 16,
            right: 16,
            zIndex: 5,
          }}
        >
          <Group justify="space-between" align="center">
            <Text size="sm">{error}</Text>
            <Button
              size="xs"
              variant="light"
              color="red"
              leftSection={<IconRefresh size={14} />}
              onClick={onRetry}
            >
              Retry
            </Button>
          </Group>
        </Alert>
      )}

      <Virtuoso
        ref={virtuosoRef}
        data={messages}
        style={{ height: '100%' }}
        initialTopMostItemIndex={messages.length - 1}
        followOutput="smooth"
        atBottomStateChange={(atBottom) => {
          isAtBottomRef.current = atBottom;
        }}
        startReached={() => {
          if (hasMore && !loadingMore) {
            onLoadMore();
          }
        }}
        components={{
          Header: () =>
            loadingMore ? (
              <Center py="md">
                <Loader size="sm" />
              </Center>
            ) : null,
          Footer: () => (
              <>
                {sending && (
                  <Box
                    style={{ display: 'flex', justifyContent: 'flex-start' }}
                    px="md"
                    pb="xs"
                  >
                    <Paper
                      p="sm"
                      radius="lg"
                      style={{ backgroundColor: 'var(--mantine-color-dark-5)' }}
                    >
                      <Loader size="xs" />
                    </Paper>
                  </Box>
                )}
                <Box style={{ height: 130 }} />
              </>
            ),
        }}
        itemContent={(index, message) => {
          const isLastMessage = index === messages.length - 1;
          const showRetry = error && isLastMessage && message.role === 'user' && !sending;

          return (
            <Box
              px="md"
              pt={index === 0 ? 100 : 8}
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
              </Paper>
            </Box>
          );
        }}
      />
    </Box>
  );
}
