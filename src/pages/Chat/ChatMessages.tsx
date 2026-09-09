import { useRef, useEffect, type ElementRef } from 'react';
import { Box, Text, Stack, Paper, Loader, Alert, Center } from '@mantine/core';
import { Virtuoso } from 'react-virtuoso';
import { IconAlertCircle, IconGhost } from '@tabler/icons-react';
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
        itemContent={(index, message) => (
          <Box
            px="md"
            pt={index === 0 ? 100 : 8}
            pb="xs"
            style={{
              display: 'flex',
              justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            <Paper
              p="sm"
              radius="lg"
              style={{
                maxWidth: '80%',
                backgroundColor:
                  message.role === 'user'
                    ? 'var(--mantine-color-cyan-9)'
                    : 'var(--mantine-color-dark-5)',
              }}
            >
              <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                {message.content}
              </Text>
            </Paper>
          </Box>
        )}
      />
    </Box>
  );
}
