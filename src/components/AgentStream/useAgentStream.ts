import { useCallback, useEffect, useRef, useState } from 'react';
import { sessionsApi, ApiError } from '../../api';
import type { ChatInput, ChatStreamCallbacks } from '../../api/sessions';

// One node status of the run; depth 0 = node of the running agent, 1+ = node inside a (nested) sub-agent
export interface RunStep {
  nodeId: string;
  label: string;
  depth: number;
  status: string;
  statusText?: string;
}

export interface AgentStreamResult {
  runId?: string;
  response?: string;
  cancelled?: boolean; // Run cancelled on the server
  aborted?: boolean; // Stream aborted on the client
  error?: string;
}

/**
 * Streams an agent run (sessionsApi.chatStream) and tracks its state: running, runId, node steps,
 * latest status text, error. Per-run handlers receive the raw stream events on top of that.
 * Starting a new run aborts the previous one; the stream is aborted on unmount.
 */
export function useAgentStream() {
  const [running, setRunning] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  // runId, steps and error stay after the run ends - reset on the next start
  const [runId, setRunId] = useState<string | null>(null);
  const [steps, setSteps] = useState<RunStep[]>([]);
  const [statusText, setStatusText] = useState<string>();
  const [error, setError] = useState('');
  const [errorRunId, setErrorRunId] = useState<string>();

  const abortRef = useRef<AbortController | null>(null);
  // Agent + run id of the ongoing run, for server-side cancel
  const runRef = useRef<{ agentId: string; runId: string | null } | null>(null);

  const start = useCallback(
    async (agentId: string, data: ChatInput, handlers: ChatStreamCallbacks = {}): Promise<AgentStreamResult> => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const run = { agentId, runId: null as string | null };
      runRef.current = run;
      // Events of a replaced run must not touch the state of the newer one
      const isCurrent = () => abortRef.current === controller;

      setRunning(true);
      setCancelling(false);
      setRunId(null);
      setSteps([]);
      setStatusText('Sending...');
      setError('');
      setErrorRunId(undefined);

      const result: AgentStreamResult = {};
      const fail = (message: string, failedRunId?: string) => {
        result.error = message;
        if (!isCurrent()) return;
        setError(message);
        setErrorRunId(failedRunId);
      };
      const addStep = (step: RunStep) => {
        if (!isCurrent()) return;
        setSteps((prev) => [...prev, step]);
        if (step.statusText) setStatusText(step.statusText);
      };

      try {
        await sessionsApi.chatStream(
          agentId,
          data,
          {
            ...handlers,
            onInit: (event) => {
              run.runId = event.runId;
              result.runId = event.runId;
              if (isCurrent()) setRunId(event.runId);
              handlers.onInit?.(event);
            },
            onStatus: (event) => {
              addStep({ nodeId: event.nodeId, label: event.nodeId, depth: 0, status: event.status, statusText: event.statusText });
              handlers.onStatus?.(event);
            },
            onSubagentStatus: (event) => {
              // Path "parentNode / SUB: node / SUBSUB: node" - last segment is the node, segment count gives nesting
              const segments = event.path.split(' / ');
              addStep({
                nodeId: event.nodeId,
                label: segments[segments.length - 1] || `${event.agentName}: ${event.nodeId}`,
                depth: Math.max(1, segments.length - 1),
                status: event.status,
                statusText: event.statusText,
              });
              handlers.onSubagentStatus?.(event);
            },
            onDone: (event) => {
              result.response = event.response;
              result.cancelled = event.cancelled;
              handlers.onDone?.(event);
            },
            onError: (event) => {
              fail(event.message, event.runId);
              handlers.onError?.(event);
            },
          },
          controller.signal
        );
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          result.aborted = true;
        } else {
          fail(err instanceof Error ? err.message : 'Failed to send message', err instanceof ApiError ? err.runId : undefined);
        }
      } finally {
        if (isCurrent()) {
          abortRef.current = null;
          runRef.current = null;
          setRunning(false);
          setCancelling(false);
          setStatusText(undefined);
        }
      }
      return result;
    },
    []
  );

  // Cancel the run on the server, then drop the stream
  const cancel = useCallback(async () => {
    const run = runRef.current;
    if (!run) return;
    setCancelling(true);
    if (run.runId) {
      try {
        await sessionsApi.cancelChat(run.agentId, run.runId);
      } catch {
        // Ignore cancel errors - aborting the stream ends it anyway
      }
    }
    if (runRef.current === run) abortRef.current?.abort();
  }, []);

  // Drop the stream only
  const abort = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const clearError = useCallback(() => {
    setError('');
    setErrorRunId(undefined);
  }, []);

  useEffect(() => () => abortRef.current?.abort(), []);

  return { running, cancelling, runId, steps, statusText, error, errorRunId, start, cancel, abort, clearError };
}
