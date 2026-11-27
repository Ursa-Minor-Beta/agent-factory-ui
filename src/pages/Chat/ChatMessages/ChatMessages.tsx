import { useRef, useEffect, useCallback, useMemo, type ElementRef } from 'react';
import { Box, Text, Stack, Loader, Center } from '@mantine/core';
import { Virtuoso, type Components } from 'react-virtuoso';
import { IconGhost } from '@tabler/icons-react';
import type { ChatMessage, ChatMessagesProps } from '../types';
import { MessageBubble } from './MessageBubble';
import { RunStatus, type RunStep } from '../../../components/AgentStream';

// Changing values reach Header / Footer via Virtuoso context - the components themselves stay stable,
// so the footer (run status spinner) is not remounted on every stream update
interface ListContext {
  loadingMore: boolean;
  sending: boolean;
  statusText?: string;
  steps?: RunStep[];
  currentRunId?: string;
  inputHeight: number;
}

const listComponents: Components<ChatMessage, ListContext> = {
  Header: ({ context }) =>
    context?.loadingMore ? (
      <Center py="md">
        <Loader size="sm" />
      </Center>
    ) : null,
  Footer: ({ context }) => (
    <>
      {context?.sending && (
        <RunStatus
          statusText={context.statusText}
          runId={context.currentRunId}
          steps={context.steps}
          ms={22}
          mx="sm"
          mb="xs"
        />
      )}
      <Box style={{ height: (context?.inputHeight ?? 100) + 32 }} />
    </>
  ),
};

const computeItemKey = (_index: number, message: ChatMessage) => message.id;

export function ChatMessages({
  currentRunId,
  messages,
  loading,
  sending,
  agentName,
  isNewChat,
  isIncognito,
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

  // Latest callbacks in a ref - parents may pass new functions each render, rows must not re-render because of it
  const callbacksRef = useRef({ onViewRun, onRepeat });
  useEffect(() => {
    callbacksRef.current = { onViewRun, onRepeat };
  }, [onViewRun, onRepeat]);
  const handleViewRun = useCallback((runId: string) => callbacksRef.current.onViewRun(runId), []);
  const handleRepeat = useCallback((input: Record<string, unknown>) => callbacksRef.current.onRepeat(input), []);

  const itemContent = useCallback(
    (index: number, message: ChatMessage) => (
      <MessageBubble message={message} isFirst={index === 0} onViewRun={handleViewRun} onRepeat={handleRepeat} />
    ),
    [handleViewRun, handleRepeat]
  );

  const context = useMemo<ListContext>(
    () => ({ loadingMore, sending, statusText, steps, currentRunId, inputHeight }),
    [loadingMore, sending, statusText, steps, currentRunId, inputHeight]
  );

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
      <Virtuoso
        ref={virtuosoRef}
        data={messages}
        context={context}
        computeItemKey={computeItemKey}
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
        itemContent={itemContent}
        components={listComponents}
      />
    </Box>
  );
}
