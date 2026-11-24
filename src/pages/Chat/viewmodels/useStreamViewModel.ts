import { useCallback } from 'react';
import type { ChatMessage } from '../types';
import { parseMessageContent } from '../models/messageParser';
import { formatContent } from '../models/formatting';
import { useAgentStream, type RunStep } from '../../../components/AgentStream';

export interface StreamState {
  sending: boolean;
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
  currentRunId: string | null;
  cancelling: boolean;
  statusText?: string;
  steps: RunStep[];

  // Actions
  send: (input: Record<string, unknown>) => Promise<void>;
  cancel: () => Promise<void>;

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
  const { running: sending, start, cancel } = stream;

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

      const result = await start(
        agentId,
        {
          input,
          sessionId: sessionId || undefined,
          incognito,
        },
        {
          onInit: (data) => callbacks.onInit?.(data),
        }
      );
      if (result.aborted) return;
      // Failed / stopped run - the server stores it as a failed / cancelled message (if the run started), mirror it locally
      if (result.error || result.cancelled) {
        callbacks.onMessage?.({
          id: `${result.cancelled ? 'cancelled' : 'error'}-${Date.now()}`,
          role: 'assistant',
          content: result.error ?? '',
          status: result.cancelled ? 'cancelled' : 'failed',
          toolCalls: result.toolCalls,
          createdAt: new Date().toISOString(),
          runId: result.runId,
        });
        return;
      }
      // Built once the stream ends - tool calls of the answer are known by then
      if (result.response === undefined) return;

      const { text, fileRefs } = parseMessageContent(result.response);
      const assistantMessage: ChatMessage = {
        id: `response-${Date.now()}`,
        role: 'assistant',
        content: text,
        fileRefs: fileRefs.length > 0 ? fileRefs : undefined,
        toolCalls: result.toolCalls,
        createdAt: new Date().toISOString(),
        runId: result.runId,
      };

      callbacks.onMessage?.(assistantMessage);
    },
    [agentId, sessionId, incognito, sending, start, callbacks]
  );

  return {
    sending,
    // Run id only while it runs
    currentRunId: sending ? stream.runId : null,
    cancelling: stream.cancelling,
    statusText: stream.statusText,
    steps: stream.steps,
    send,
    cancel,
    createUserMessage,
  };
}
