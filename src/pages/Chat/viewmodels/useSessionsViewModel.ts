import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { sessionsApi } from '../../../api';
import type { Session } from '../../../types';

export interface UseSessionsViewModelReturn {
  // State
  sessions: Session[];
  currentSessionId: string | null;
  loading: boolean;
  isIncognitoSession: boolean;
  startIncognito: boolean;

  // Actions
  loadSessions: () => Promise<Session[]>;
  selectSession: (session: Session) => void;
  deleteSession: (id: string) => Promise<void>;
  renameSession: (id: string, title: string) => Promise<void>;
  startNewChat: (incognito?: boolean) => void;
  setCurrentSessionId: (id: string | null) => void;
  setStartIncognito: (value: boolean) => void;

  // For stream callbacks
  handleNewSession: (sessionId: string, isIncognito: boolean) => void;
}

export function useSessionsViewModel(
  agentId: string | undefined,
  urlSessionId: string | undefined
): UseSessionsViewModelReturn {
  const navigate = useNavigate();

  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(urlSessionId || null);
  const [loading, setLoading] = useState(true);
  const [startIncognito, setStartIncognito] = useState(false);

  const isIncognitoSession = currentSessionId?.startsWith('incognito_') || false;

  // Sync currentSessionId with URL
  useEffect(() => {
    setCurrentSessionId(urlSessionId || null);
  }, [urlSessionId]);

  // Reset sessions when agent changes
  useEffect(() => {
    setSessions([]);
    setStartIncognito(false);
  }, [agentId]);

  // Update URL when session changes
  useEffect(() => {
    if (
      urlSessionId !== currentSessionId &&
      currentSessionId &&
      !currentSessionId.startsWith('incognito_')
    ) {
      navigate(`/agents/${agentId}/chat/${currentSessionId}`, { replace: true });
    }
  }, [currentSessionId, urlSessionId, agentId, navigate]);

  const loadSessions = useCallback(async (): Promise<Session[]> => {
    if (!agentId) return [];

    try {
      setLoading(true);
      const data = await sessionsApi.list({ agentId, status: 'active', limit: 50 });
      setSessions(data);
      return data;
    } catch (err) {
      console.error('Failed to load sessions:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  // Initial load with auto-select
  useEffect(() => {
    if (!agentId) return;

    const initSessions = async () => {
      try {
        setLoading(true);
        const data = await sessionsApi.list({ agentId, status: 'active', limit: 50 });
        setSessions(data);

        // Auto-select most recent session only on initial load
        if (!urlSessionId && !startIncognito && data.length > 0) {
          const mostRecent = data[0];
          setCurrentSessionId(mostRecent.id);
          navigate(`/agents/${agentId}/chat/${mostRecent.id}`, { replace: true });
        }
      } catch (err) {
        console.error('Failed to load sessions:', err);
      } finally {
        setLoading(false);
      }
    };

    initSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId]);

  const selectSession = useCallback(
    (session: Session) => {
      setCurrentSessionId(session.id);
      setStartIncognito(false);
      navigate(`/agents/${agentId}/chat/${session.id}`);
    },
    [agentId, navigate]
  );

  const deleteSession = useCallback(
    async (id: string) => {
      await sessionsApi.delete({ id });

      if (currentSessionId === id) {
        setCurrentSessionId(null);
        navigate(`/agents/${agentId}/chat`);
      }

      setSessions((prev) => prev.filter((s) => s.id !== id));
    },
    [agentId, currentSessionId, navigate]
  );

  const renameSession = useCallback(async (id: string, title: string) => {
    await sessionsApi.update(id, { title: title || null });
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, title } : s))
    );
  }, []);

  const startNewChat = useCallback(
    (incognito = false) => {
      setCurrentSessionId(null);
      setStartIncognito(incognito);
      navigate(`/agents/${agentId}/chat`);
    },
    [agentId, navigate]
  );

  const handleNewSession = useCallback(
    (sessionId: string, isIncognito: boolean) => {
      setCurrentSessionId(sessionId);
      setStartIncognito(false);
      if (!isIncognito) {
        loadSessions();
      }
    },
    [loadSessions]
  );

  return {
    sessions,
    currentSessionId,
    loading,
    isIncognitoSession,
    startIncognito,
    loadSessions,
    selectSession,
    deleteSession,
    renameSession,
    startNewChat,
    setCurrentSessionId,
    setStartIncognito,
    handleNewSession,
  };
}
