import { useCallback, useEffect, useRef, useState } from 'react';
import { sessionsApi, ApiError } from '../../api';
import type { ChatClientToolCallEvent, ChatInput, ChatStreamCallbacks } from '../../api/sessions';
import type { MessageToolCall } from '../../types';
import { toolLabel } from './ToolCalls';

// One node status or tool call of the run; depth 0 = running agent, 1+ = inside a (nested) sub-agent
export interface RunStep {
  nodeId: string;
  label: string;
  depth: number;
  status: string;
  statusText?: string;
  // Tool call steps only - one step per call, updated in place when it finishes
  tool?: {
    toolCallId: string;
    name: string;
    toolType: 'builtin' | 'agent' | 'client';
    label?: string; // UI tools: summary of what was done
    error?: string | string[];
    durationMs?: number;
  };
}

// Outcome of a UI tool executed by the page
export interface ClientToolOutcome {
  ok: boolean;
  label?: string;
  errors?: string[];
}

export interface AgentStreamHandlers extends Omit<ChatStreamCallbacks, 'onClientToolCall'> {
  // Executes the UI tool (and posts its result); the outcome is shown as a tool step
  onClientToolCall?: (event: ChatClientToolCallEvent) => Promise<ClientToolOutcome>;
}

// Path "parentNode / SUB: node / SUBSUB: node" - segment count gives nesting
const pathDepth = (path: string) => path.split(' / ').length - 1;

export interface AgentStreamResult {
  runId?: string;
  response?: string;
  cancelled?: boolean; // Run cancelled on the server
  aborted?: boolean; // Stream aborted on the client
  error?: string;
  toolCalls?: MessageToolCall[]; // Finished top-level tool calls (server + UI), in call order
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
    async (agentId: string, data: ChatInput, handlers: AgentStreamHandlers = {}): Promise<AgentStreamResult> => {
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
      // Top-level tool calls by toolCallId, insertion order = call order
      const toolCalls = new Map<string, Omit<MessageToolCall, 'id' | 'status'> & { status?: MessageToolCall['status'] }>();
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
      const startTool = (toolCallId: string, name: string, toolType: NonNullable<RunStep['tool']>['toolType'], nodeId: string, depth: number) => {
        if (depth === 0) toolCalls.set(toolCallId, { name });
        // No statusText: the tool list shows its progress, the status line stays on the node status
        addStep({
          nodeId,
          label: toolLabel(name),
          depth,
          status: 'running',
          tool: { toolCallId, name, toolType },
        });
      };
      // Parallel calls finish in any order - match by toolCallId
      const finishTool = (toolCallId: string, status: MessageToolCall['status'], patch: Partial<NonNullable<RunStep['tool']>>) => {
        const call = toolCalls.get(toolCallId);
        if (call) Object.assign(call, { status, label: patch.label, error: patch.error });
        if (!isCurrent()) return;
        setSteps((prev) => prev.map((step) =>
          step.tool?.toolCallId === toolCallId ? { ...step, status, tool: { ...step.tool, ...patch } } : step
        ));
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
            onToolCall: (event) => {
              if (event.status === 'started') startTool(event.toolCallId, event.name, event.toolType, event.nodeId, pathDepth(event.path));
              else finishTool(event.toolCallId, event.status, { error: event.error, durationMs: event.durationMs });
              handlers.onToolCall?.(event);
            },
            onClientToolCall: async (event) => {
              if (!handlers.onClientToolCall) return;
              startTool(event.toolCallId, event.name, 'client', '', 0);
              const startedAt = Date.now();
              const outcome = await handlers.onClientToolCall(event);
              finishTool(event.toolCallId, outcome.ok ? 'completed' : 'failed', {
                label: outcome.label,
                error: outcome.errors,
                durationMs: Date.now() - startedAt,
              });
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
        const finished = [...toolCalls].flatMap(([id, { status, ...call }]) => (status ? [{ id, status, ...call }] : []));
        if (finished.length) result.toolCalls = finished;
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
