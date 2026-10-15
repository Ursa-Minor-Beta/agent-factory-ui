import { useState, useCallback, useRef } from 'react';
import { sessionsApi, ApiError } from '../../../api';
import type { ChatMessage } from '../types';
import { parseMessageContent } from '../models/messageParser';
import { formatContent } from '../models/formatting';

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
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [errorRunId, setErrorRunId] = useState<string | undefined>();
  const [currentRunId, setCurrentRunId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [statusText, setStatusText] = useState<string | undefined>();

  const abortControllerRef = useRef<AbortController | null>(null);
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

      setSending(true);
      setError('');
      setErrorRunId(undefined);
      lastInputRef.current = input;
      setCurrentRunId(null);
      setCancelling(false);
      setStatusText('Sending...');

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      try {
        await sessionsApi.chatStream(
          agentId,
          {
            input,
            sessionId: sessionId || undefined,
            incognito,
          },
          {
            onInit: (data) => {
              setCurrentRunId(data.runId);
              callbacks.onInit?.(data);
            },
            onStatus: (data) => {
              setStatusText(data.statusText || 'Preparing...');
            },
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
            onError: (data) => {
              setError(data.message);
              if (data.runId) {
                setErrorRunId(data.runId);
              }
            },
          },
          abortController.signal
        );
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return;
        }
        setError(err instanceof Error ? err.message : 'Failed to send message');
        if (err instanceof ApiError && err.runId) {
          setErrorRunId(err.runId);
        } else {
          setErrorRunId(undefined);
        }
      } finally {
        setSending(false);
        setCurrentRunId(null);
        setCancelling(false);
        setStatusText(undefined);
        abortControllerRef.current = null;
      }
    },
    [agentId, sessionId, incognito, sending, callbacks]
  );

  const cancel = useCallback(async () => {
    if (cancelling || !agentId) return;

    setCancelling(true);

    if (currentRunId) {
      try {
        await sessionsApi.cancelChat(agentId, currentRunId);
      } catch {
        // Ignore cancel errors
      }
    }

    abortControllerRef.current?.abort();
  }, [agentId, currentRunId, cancelling]);

  const retry = useCallback(() => {
    if (!lastInputRef.current || sending) return;
    send(lastInputRef.current);
  }, [send, sending]);

  const clearError = useCallback(() => {
    setError('');
    setErrorRunId(undefined);
  }, []);

  return {
    sending,
    error,
    errorRunId,
    currentRunId,
    cancelling,
    statusText,
    send,
    cancel,
    retry,
    clearError,
    createUserMessage,
  };
}
