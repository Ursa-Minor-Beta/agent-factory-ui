import { useCallback, useEffect, useRef, useState } from 'react';
import { schedulesApi, type ListSchedulesOptions } from '../../api';
import type { AgentSchedule } from '../../types';
import { subscribeScheduleEvents } from './scheduleEvents';

// Schedule status changes on the server without user action (runs start/finish)
const POLL_INTERVAL_MS = 30_000;

/**
 * Loads schedules for the given filter and keeps them fresh:
 * polls while the tab is visible and applies modal saves/deletes optimistically.
 */
interface UseSchedulesOptions extends Pick<ListSchedulesOptions, 'agentId' | 'workspaceId'> {
  /** A schedule was created in this list's scope */
  onCreate?: () => void;
  /** A schedule of this list was deleted */
  onDelete?: () => void;
}

export function useSchedules({ agentId, workspaceId, onCreate, onDelete }: UseSchedulesOptions) {
  const [schedules, setSchedules] = useState<AgentSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const requestIdRef = useRef(0);
  // Refs - callbacks are usually inline and shouldn't resubscribe the events
  const callbacksRef = useRef({ onCreate, onDelete });
  callbacksRef.current = { onCreate, onDelete };
  const schedulesRef = useRef(schedules);
  schedulesRef.current = schedules;

  const load = useCallback(async (silent = false) => {
    const requestId = ++requestIdRef.current;
    if (!silent) setLoading(true);
    try {
      const data = await schedulesApi.list({ agentId, workspaceId, sortBy: 'name', sortOrder: 'asc' });
      // Ignore responses of a previous filter
      if (requestId !== requestIdRef.current) return;
      setSchedules(data);
      setError('');
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      if (!silent) setError(err instanceof Error ? err.message : 'Failed to load schedules');
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [agentId, workspaceId]);

  useEffect(() => {
    load();
    const timer = setInterval(() => {
      if (!document.hidden) load(true);
    }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [load]);

  const upsert = useCallback((schedule: AgentSchedule) => {
    setSchedules((prev) => {
      const exists = prev.some((s) => s.id === schedule.id);
      if (exists) return prev.map((s) => (s.id === schedule.id ? { ...s, ...schedule } : s));
      if (agentId && schedule.agentId !== agentId) return prev;
      if (workspaceId !== undefined && schedule.workspaceId !== workspaceId) return prev;
      return [...prev, schedule].sort((a, b) => a.name.localeCompare(b.name));
    });
  }, [agentId, workspaceId]);

  const remove = useCallback((id: string) => {
    setSchedules((prev) => prev.filter((s) => s.id !== id));
  }, []);

  useEffect(() => subscribeScheduleEvents({
    onSaved: upsert,
    onDeleted: (id) => {
      const inList = schedulesRef.current.some((s) => s.id === id);
      remove(id);
      if (inList) callbacksRef.current.onDelete?.();
    },
    onCreated: (schedule) => {
      if (agentId && schedule.agentId !== agentId) return;
      if (workspaceId !== undefined && schedule.workspaceId !== workspaceId) return;
      callbacksRef.current.onCreate?.();
    },
  }), [upsert, remove, agentId, workspaceId]);

  return { schedules, loading, error, setError, reload: load, upsert, remove };
}
