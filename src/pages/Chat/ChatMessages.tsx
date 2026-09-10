import { useRef, useEffect, type ElementRef } from 'react';
import { Box, Text, Stack, Paper, Loader, Alert, Center, ActionIcon, Tooltip, Code } from '@mantine/core';
import { Virtuoso } from 'react-virtuoso';
import { IconAlertCircle, IconGhost, IconRefresh } from '@tabler/icons-react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import type { ChatMessagesProps } from './types';

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
          {error}
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
                <Markdown
                  remarkPlugins={[remarkGfm, remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                  components={{
                    p: ({ children }) => (
                      <Text size="sm" style={{ margin: 0 }}>
                        {children}
                      </Text>
                    ),
                    code: ({ children }) => <Code>{children}</Code>,
                    pre: ({ children }) => (
                      <Box
                        component="pre"
                        style={{
                          backgroundColor: 'var(--mantine-color-dark-7)',
                          padding: 'var(--mantine-spacing-xs)',
                          borderRadius: 'var(--mantine-radius-sm)',
                          overflow: 'auto',
                          margin: 'var(--mantine-spacing-xs) 0',
                        }}
                      >
                        {children}
                      </Box>
                    ),
                    ul: ({ children }) => (
                      <Box component="ul" style={{ margin: '4px 0', paddingLeft: 20 }}>
                        {children}
                      </Box>
                    ),
                    ol: ({ children }) => (
                      <Box component="ol" style={{ margin: '4px 0', paddingLeft: 20 }}>
                        {children}
                      </Box>
                    ),
                    li: ({ children }) => (
                      <Text component="li" size="sm">
                        {children}
                      </Text>
                    ),
                    table: ({ children }) => (
                      <Box
                        component="table"
                        style={{
                          borderCollapse: 'collapse',
                          margin: '8px 0',
                          fontSize: 'var(--mantine-font-size-sm)',
                          width: '100%',
                        }}
                      >
                        {children}
                      </Box>
                    ),
                    th: ({ children }) => (
                      <Box
                        component="th"
                        style={{
                          border: '1px solid var(--mantine-color-dark-4)',
                          padding: '6px 10px',
                          textAlign: 'left',
                        }}
                      >
                        {children}
                      </Box>
                    ),
                    td: ({ children }) => (
                      <Box
                        component="td"
                        style={{
                          border: '1px solid var(--mantine-color-dark-4)',
                          padding: '6px 10px',
                        }}
                      >
                        {children}
                      </Box>
                    ),
                    blockquote: ({ children }) => (
                      <Box
                        component="blockquote"
                        style={{
                          borderLeft: '3px solid var(--mantine-color-cyan-6)',
                          margin: '8px 0',
                          paddingLeft: 12,
                          color: 'var(--mantine-color-dimmed)',
                        }}
                      >
                        {children}
                      </Box>
                    ),
                  }}
                >
                  {message.content}
                </Markdown>
              </Paper>
            </Box>
          );
        }}
      />
    </Box>
  );
}
