import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChatStatusEvent } from '../../../api/sessions';
import type { NodeStatus } from '../../../types';

export function useRunReplay() {
  // Node statuses of the last run from the Run tab (null = no run yet, missing node = pending)
  const [runStatuses, setRunStatuses] = useState<Record<string, NodeStatus> | null>(null);

  // Runs can be very fast - replay status events sequentially, keeping every executed node
  // in "running" for at least minRunningMs (Run tab speed). playheadRef = earliest time the next event may show.
  const playheadRef = useRef(0);
  const startedRef = useRef<Set<string>>(new Set());
  // Running time per node at the speed it was scheduled with - drives edge photon timing
  const runningMsRef = useRef<Record<string, number>>({});
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const setNodeRunStatus = useCallback((nodeId: string, status: NodeStatus) => {
    setRunStatuses((prev) => ({ ...prev, [nodeId]: status }));
  }, []);

  const scheduleAt = useCallback((time: number, fn: () => void) => {
    const delay = time - Date.now();
    if (delay <= 0) {
      fn();
      return;
    }
    timersRef.current.push(setTimeout(fn, delay));
  }, []);

  // Reset replay; {} = new run (all pending), null = no run statuses shown
  const resetRunStatuses = useCallback((statuses: Record<string, NodeStatus> | null) => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    playheadRef.current = 0;
    startedRef.current = new Set();
    runningMsRef.current = {};
    setRunStatuses(statuses);
  }, []);

  const handleRunStart = useCallback(() => resetRunStatuses({}), [resetRunStatuses]);
  const handleRunClear = useCallback(() => resetRunStatuses(null), [resetRunStatuses]);

  const handleNodeStatus = useCallback((nodeId: string, status: ChatStatusEvent['status'], minRunningMs: number) => {
    let at = Math.max(Date.now(), playheadRef.current);
    if (status === 'skipped') {
      scheduleAt(at, () => setNodeRunStatus(nodeId, 'skipped'));
      playheadRef.current = at;
      return;
    }
    // Finished without a 'started' event - show it running first
    if (status === 'started' || !startedRef.current.has(nodeId)) {
      startedRef.current.add(nodeId);
      runningMsRef.current[nodeId] = minRunningMs;
      scheduleAt(at, () => setNodeRunStatus(nodeId, 'running'));
      at += minRunningMs;
    }
    if (status !== 'started') {
      scheduleAt(at, () => setNodeRunStatus(nodeId, status));
    }
    playheadRef.current = at;
  }, [setNodeRunStatus, scheduleAt]);

  // Run finished, failed or was stopped - after replay ends, nodes still running didn't complete.
  // Final statuses stay visible until the next run or animation is turned off.
  const handleRunEnd = useCallback(() => {
    const replayEnd = Math.max(Date.now(), playheadRef.current);
    scheduleAt(replayEnd, () => {
      setRunStatuses((prev) => prev && Object.fromEntries(
        Object.entries(prev).map(([nodeId, status]) => [nodeId, status === 'running' ? 'skipped' : status])
      ));
    });
  }, [scheduleAt]);

  // Clear pending status timers on unmount
  useEffect(() => () => timersRef.current.forEach(clearTimeout), []);

  return { runStatuses, runningMsRef, handleRunStart, handleRunClear, handleNodeStatus, handleRunEnd };
}
