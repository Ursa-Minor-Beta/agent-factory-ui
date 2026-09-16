import { api, fetchWithRefresh } from './client';
import type { Session, Message, ChatResponse } from '../types';

// SSE Event types
export interface ChatInitEvent {
  runId: string;
  sessionId: string;
  isNewSession: boolean;
}

export interface ChatStatusEvent {
  nodeId: string;
  status: 'started' | 'completed' | 'failed' | 'skipped';
  statusText?: string;
}

export interface ChatDoneEvent {
  response: string;
  files?: string[];
  runId: string;
  sessionId: string;
  isNewSession: boolean;
  cancelled?: boolean;
}

export interface ChatErrorEvent {
  code: string;
  message: string;
  runId?: string;
}

export interface ChatStreamCallbacks {
  onInit?: (data: ChatInitEvent) => void;
  onStatus?: (data: ChatStatusEvent) => void;
  onDone?: (data: ChatDoneEvent) => void;
  onError?: (data: ChatErrorEvent) => void;
}

export interface CancelChatResponse {
  success: boolean;
  cancelled: boolean;
  message: string;
}

export interface SessionsQueryParams {
  agentId?: string;
  status?: 'active' | 'archived';
  limit?: number;
  offset?: number;
}

export interface ChatInput {
  input: Record<string, unknown>;
  sessionId?: string;
  incognito?: boolean;
}

function buildQueryString(params: SessionsQueryParams): string {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      searchParams.append(key, String(value));
    }
  });
  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
}

export interface SessionUpdate {
  title?: string | null;
  status?: 'active' | 'archived';
}

export const sessionsApi = {
  list: (params: SessionsQueryParams = {}) =>
    api.get<Session[]>(`/api/sessions${buildQueryString(params)}`),

  getById: (id: string) =>
    api.get<Session>(`/api/sessions/${id}`),

  update: (id: string, data: SessionUpdate) =>
    api.patch<Session>(`/api/sessions/${id}`, data),

  delete: (id: string) =>
    api.delete<void>(`/api/sessions/${id}`),

  getMessages: (id: string, limit?: number, offset?: number) => {
    const params = new URLSearchParams();
    if (limit !== undefined) params.append('limit', String(limit));
    if (offset !== undefined) params.append('offset', String(offset));
    const qs = params.toString();
    return api.get<Message[]>(`/api/sessions/${id}/messages${qs ? `?${qs}` : ''}`);
  },

  chat: (agentId: string, data: ChatInput, signal?: AbortSignal) =>
    api.post<ChatResponse>(`/api/agents/${agentId}/chat`, data, { signal }),

  // SSE streaming chat
  chatStream: async (
    agentId: string,
    data: ChatInput,
    callbacks: ChatStreamCallbacks,
    signal?: AbortSignal
  ): Promise<void> => {
    const response = await fetchWithRefresh(`/api/agents/${agentId}/chat/stream`, {
      method: 'POST',
      body: JSON.stringify(data),
      signal,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      callbacks.onError?.({
        code: errorData.error?.code || 'STREAM_ERROR',
        message: errorData.error?.message || 'Failed to start chat stream',
      });
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      callbacks.onError?.({ code: 'NO_READER', message: 'No response body reader' });
      return;
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let currentEventType = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('event:')) {
            currentEventType = line.slice(6).trim();
            continue;
          }
          if (line.startsWith('data:')) {
            const jsonStr = line.slice(5).trim();
            if (!jsonStr) continue;

            try {
              const eventData = JSON.parse(jsonStr);

              // Use event type if available, otherwise infer from data structure
              switch (currentEventType) {
                case 'init':
                  callbacks.onInit?.(eventData as ChatInitEvent);
                  break;
                case 'status':
                  callbacks.onStatus?.(eventData as ChatStatusEvent);
                  break;
                case 'done':
                  callbacks.onDone?.(eventData as ChatDoneEvent);
                  break;
                case 'error':
                  callbacks.onError?.(eventData as ChatErrorEvent);
                  break;
                default:
                  // Fallback: infer from data structure
                  if ('runId' in eventData && 'sessionId' in eventData && !('response' in eventData)) {
                    callbacks.onInit?.(eventData as ChatInitEvent);
                  } else if ('nodeId' in eventData && 'status' in eventData) {
                    callbacks.onStatus?.(eventData as ChatStatusEvent);
                  } else if ('response' in eventData) {
                    callbacks.onDone?.(eventData as ChatDoneEvent);
                  } else if ('code' in eventData && 'message' in eventData) {
                    callbacks.onError?.(eventData as ChatErrorEvent);
                  }
              }
              currentEventType = ''; // Reset after processing
            } catch {
              // Ignore parse errors
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  },

  // Cancel chat by runId
  cancelChat: (agentId: string, runId: string) =>
    api.post<CancelChatResponse>(`/api/agents/${agentId}/cancel`, { runId }),
};
