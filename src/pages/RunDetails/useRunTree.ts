import { useCallback, useEffect, useRef, useState } from 'react';
import { runsApi, sessionsApi } from '../../api';
import type { Run } from '../../types';

const POLL_INTERVAL_MS = 1_000;

/** Fetch a run, then each of its child runs by id, recursively */
async function fetchRunTree(id: string, visited: Set<string>): Promise<Run> {
  visited.add(id);
  const run = await runsApi.getById(id, true);
  const children = (run.childRuns ?? []).filter((child) => !visited.has(child.id));
  children.forEach((child) => visited.add(child.id));
  const childRuns = await Promise.all(children.map((child) => fetchRunTree(child.id, visited)));
  return { ...run, childRuns };
}

const isActive = (run: Run): boolean =>
  run.status === 'pending' || run.status === 'running' || run.status === 'cancelling' ||
  !!run.childRuns?.some(isActive);

/**
 * Loads the whole run tree (all child runs at any depth), polls while any run is active, cancels it.
 * Responses of a previous run id are ignored.
 */
export function useRunTree(runId: string | null) {
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
      const data = await fetchRunTree(runId, new Set());
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
    setRun(null);
    setError(null);
    load(true);
    return () => {
      requestRef.current++;
    };
  }, [load]);

  // Poll while the run or any child run is active
  useEffect(() => {
    if (loading || !run || !isActive(run)) return;
    const timeout = setTimeout(() => load(false), POLL_INTERVAL_MS);
    return () => clearTimeout(timeout);
  }, [loading, run, load]);

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
