import { useState, useCallback, useEffect } from 'react';
import { sessionsApi } from '../../../api';
import type { ChatMessage } from '../types';
import { mapApiMessageToChatMessage } from '../models/messageParser';

const MESSAGES_PER_PAGE = 50;

export interface UseMessagesViewModelReturn {
  // State
  messages: ChatMessage[];
  loading: boolean;
  hasMore: boolean;
  loadingMore: boolean;

  // Actions
  loadMore: () => Promise<void>;
  addMessage: (message: ChatMessage) => void;
  removeLastMessage: () => void;
  clearMessages: () => void;
}

export function useMessagesViewModel(sessionId: string | null): UseMessagesViewModelReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Load messages when session changes
  useEffect(() => {
    if (!sessionId || sessionId.startsWith('incognito_')) {
      if (!sessionId) {
        setMessages([]);
        setHasMore(false);
      }
      return;
    }

    const loadMessages = async () => {
      try {
        setLoading(true);
        const data = await sessionsApi.getMessages(sessionId, MESSAGES_PER_PAGE, 0);
        setMessages(data.map(mapApiMessageToChatMessage).reverse());
        setHasMore(data.length === MESSAGES_PER_PAGE);
      } catch (err) {
        console.error('Failed to load messages:', err);
      } finally {
        setLoading(false);
      }
    };

    loadMessages();
  }, [sessionId]);

  const loadMore = useCallback(async () => {
    if (!sessionId || loadingMore || !hasMore) return;

    try {
      setLoadingMore(true);
      const data = await sessionsApi.getMessages(sessionId, MESSAGES_PER_PAGE, messages.length);
      // Prepend older messages
      setMessages((prev) => [...data.map(mapApiMessageToChatMessage), ...prev]);
      setHasMore(data.length === MESSAGES_PER_PAGE);
    } catch (err) {
      console.error('Failed to load more messages:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [sessionId, loadingMore, hasMore, messages.length]);

  const addMessage = useCallback((message: ChatMessage) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  const removeLastMessage = useCallback(() => {
    setMessages((prev) => prev.slice(0, -1));
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setHasMore(false);
  }, []);

  return {
    messages,
    loading,
    hasMore,
    loadingMore,
    loadMore,
    addMessage,
    removeLastMessage,
    clearMessages,
  };
}
