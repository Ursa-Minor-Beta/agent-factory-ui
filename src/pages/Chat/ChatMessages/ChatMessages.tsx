import { useRef, useEffect, type ElementRef } from 'react';
import { Box, Text, Stack, Paper, Loader, Alert, Center, Button, Group } from '@mantine/core';
import { Virtuoso } from 'react-virtuoso';
import { IconAlertCircle, IconGhost, IconRefresh, IconListDetails } from '@tabler/icons-react';
import type { ChatMessagesProps } from '../types';
import { MessageBubble } from './MessageBubble';

export function ChatMessages({
  currentRunId,
  messages,
  loading,
  sending,
  agentName,
  isNewChat,
  isIncognito,
  error,
  errorRunId,
  onClearError,
  onRetry,
  hasMore,
  loadingMore,
  onLoadMore,
  onViewRun,
  onRepeat,
  statusText,
  inputHeight = 100,
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
            <Group gap="xs">
              {errorRunId && (
                <Button
                  size="xs"
                  variant="light"
                  color="red"
                  leftSection={<IconListDetails size={14} />}
                  onClick={() => onViewRun(errorRunId)}
                >
                  Run Details
                </Button>
              )}
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
          </Group>
        </Alert>
      )}

      <Virtuoso
        ref={virtuosoRef}
        data={messages}
        style={{ height: '100%' }}
        initialTopMostItemIndex={messages.length - 1}
        followOutput={false}
        atBottomStateChange={(atBottom) => {
          isAtBottomRef.current = atBottom;
        }}
        startReached={() => {
          if (hasMore && !loadingMore) {
            onLoadMore();
          }
        }}
        itemContent={(index, message) => {
          const isLastMessage = index === messages.length - 1;
          const showRetry = error && isLastMessage && message.role === 'user' && !sending;
          return (
            <MessageBubble
              message={message}
              isFirst={index === 0}
              showRetry={!!showRetry}
              onRetry={onRetry}
              onViewRun={onViewRun}
              onRepeat={onRepeat}
            />
          );
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
                    ms="xs"
                    px="sm"
                    pb="xs"
                  >
                    <Paper
                      py="xs"
                      px="md"
                      radius="lg"
                      className="chat-status-bubble"
                      style={{ 
                          minWidth: '140px', 
                          backgroundColor: 'light-dark(var(--mantine-color-gray-1), var(--mantine-color-dark-6))', 
                        }}
                    >
                      <style>{`
                        .chat-status-bubble .run-details-btn { display: none; }
                        .chat-status-bubble .status-content { display: flex; }
                        .chat-status-bubble:hover .run-details-btn { display: flex; }
                        .chat-status-bubble:hover .status-content { display: none; }
                      `}</style>
                      <Group 
                        gap="sm" 
                        align='center'
                        style={{ 
                          height: '2rem'
                        }}
                        wrap="nowrap"
                        >
                        <Loader type="dots" size="xs" className="status-content" />
                        {statusText && (
                          <Text size="xs" c="dimmed" className="status-content">
                            {statusText}
                          </Text>
                        )}
                        {currentRunId && (
                            <Button
                              size="xs"
                              className="run-details-btn"
                              leftSection={<IconListDetails size={12} />}
                              style={{ width: '100%'}}
                              onClick={() => onViewRun(currentRunId)}
                              >Run Details
                            </Button>
                        )}
                      </Group>
                    </Paper>
                  </Box>
                )}
                <Box style={{ height: inputHeight + 32 }} />
              </>
            ),
        }}
      />
    </Box>
  );
}
