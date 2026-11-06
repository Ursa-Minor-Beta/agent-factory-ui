import { useCallback, useEffect, useRef, useState } from 'react';
import { runsApi, sessionsApi } from '../../api';
import type { Run } from '../../types';

const POLL_INTERVAL_MS = 1_000;

/**
 * Loads a run with its child runs, polls while it runs, cancels it.
 * Responses of a previous run id (or after close) are ignored.
 */
export function useRunDetails(runId: string | null, enabled: boolean) {
  const [run, setRun] = useState<Run | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  // Incremented per request - only the latest one may update the state
  const requestRef = useRef(0);

  // showError: initial load shows the error, refreshes keep the existing data
  const load = useCallback(async (showError: boolean) => {
    if (!runId) return;
    const request = ++requestRef.current;
    setLoading(true);
    try {
      const data = await runsApi.getById(runId, true);
      if (request !== requestRef.current) return;
      setRun(data);
      setError(null);
    } catch (err) {
      if (request === requestRef.current && showError) {
        setError(err instanceof Error ? err.message : 'Failed to load run details');
      }
    } finally {
      if (request === requestRef.current) setLoading(false);
    }
  }, [runId]);

  useEffect(() => {
    if (!enabled || !runId) {
      requestRef.current++;
      setRun(null);
      setError(null);
      setLoading(false);
      return;
    }
    load(true);
  }, [enabled, runId, load]);

  // Poll while running
  useEffect(() => {
    if (!enabled || loading || run?.status !== 'running') return;
    const timeout = setTimeout(() => load(false), POLL_INTERVAL_MS);
    return () => clearTimeout(timeout);
  }, [enabled, loading, run, load]);

  const refresh = useCallback(() => load(false), [load]);

  const cancel = useCallback(async () => {
    if (!runId || !run?.agentId || cancelling) return;
    setCancelling(true);
    try {
      await sessionsApi.cancelChat(run.agentId, runId);
      await load(false);
    } catch {
      // Ignore cancel errors
    } finally {
      setCancelling(false);
    }
  }, [runId, run?.agentId, cancelling, load]);

  return { run, loading, error, cancelling, refresh, cancel };
}
