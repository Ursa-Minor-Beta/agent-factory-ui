import { useRef, useEffect, type ElementRef } from 'react';
import { Box, Text, Stack, Loader, Center } from '@mantine/core';
import { Virtuoso } from 'react-virtuoso';
import { IconGhost } from '@tabler/icons-react';
import type { ChatMessagesProps } from '../types';
import { MessageBubble } from './MessageBubble';
import { RunStatus, RunErrorAlert } from '../../../components/AgentStream';

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
  steps,
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
        <RunErrorAlert
          error={error}
          runId={errorRunId}
          onRetry={onRetry}
          onClose={onClearError}
          mb="md"
          style={{ position: 'absolute', top: 80, left: 16, right: 16, zIndex: 5 }}
        />
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
                {sending && 
                    <RunStatus 
                      statusText={statusText} 
                      runId={currentRunId} 
                      steps={steps} 
                      ms={22} 
                      mx="sm" 
                      mb="xs" 
                      />
                }
                <Box style={{ height: inputHeight + 32 }} />
              </>
            ),
        }}
      />
    </Box>
  );
}
