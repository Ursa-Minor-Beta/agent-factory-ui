import { useCallback, useRef } from 'react';
import type { ChatMessage } from '../types';
import { parseMessageContent } from '../models/messageParser';
import { formatContent } from '../models/formatting';
import { useAgentStream, type RunStep } from '../../../components/AgentStream';

export interface StreamState {
  sending: boolean;
  error: string;
  errorRunId?: string;
  currentRunId: string | null;
  cancelling: boolean;
  statusText?: string;
}

export interface StreamCallbacks {
  onInit?: (data: { runId: string; sessionId: string; isNewSession: boolean }) => void;
  onMessage?: (message: ChatMessage) => void;
}

export interface UseStreamViewModelReturn {
  // State
  sending: boolean;
  error: string;
  errorRunId?: string;
  currentRunId: string | null;
  cancelling: boolean;
  statusText?: string;
  steps: RunStep[];

  // Actions
  send: (input: Record<string, unknown>) => Promise<void>;
  cancel: () => Promise<void>;
  retry: () => void;
  clearError: () => void;

  // For adding optimistic user message
  createUserMessage: (input: Record<string, unknown>) => ChatMessage;
}

export function useStreamViewModel(
  agentId: string | undefined,
  sessionId: string | null,
  incognito: boolean,
  callbacks: StreamCallbacks
): UseStreamViewModelReturn {
  const stream = useAgentStream();
  const { running: sending, start, cancel, clearError } = stream;
  const lastInputRef = useRef<Record<string, unknown> | null>(null);

  const createUserMessage = useCallback((input: Record<string, unknown>): ChatMessage => {
    return {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: formatContent(input),
      rawInput: input,
      createdAt: new Date().toISOString(),
    };
  }, []);

  const send = useCallback(
    async (input: Record<string, unknown>) => {
      if (!agentId || sending) return;
      lastInputRef.current = input;

      await start(
        agentId,
        {
          input,
          sessionId: sessionId || undefined,
          incognito,
        },
        {
          onInit: (data) => callbacks.onInit?.(data),
          onDone: (data) => {
            if (data.cancelled) return;

            const { text, fileRefs } = parseMessageContent(data.response);
            const assistantMessage: ChatMessage = {
              id: `response-${Date.now()}`,
              role: 'assistant',
              content: text,
              fileRefs: fileRefs.length > 0 ? fileRefs : undefined,
              createdAt: new Date().toISOString(),
              runId: data.runId,
            };

            callbacks.onMessage?.(assistantMessage);
          },
        }
      );
    },
    [agentId, sessionId, incognito, sending, start, callbacks]
  );

  const retry = useCallback(() => {
    if (!lastInputRef.current || sending) return;
    send(lastInputRef.current);
  }, [send, sending]);

  return {
    sending,
    error: stream.error,
    errorRunId: stream.errorRunId,
    // Run id only while it runs
    currentRunId: sending ? stream.runId : null,
    cancelling: stream.cancelling,
    statusText: stream.statusText,
    steps: stream.steps,
    send,
    cancel,
    retry,
    clearError,
    createUserMessage,
  };
}
