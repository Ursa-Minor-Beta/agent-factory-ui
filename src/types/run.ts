export type NodeStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
export type RunStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelling' | 'cancelled';

export interface NodeState {
  status: NodeStatus;
  input?: unknown;
  output?: unknown;
  state?: unknown;
  error?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
}

export interface Run {
  id: string;
  agentId: string;
  userId: string;
  input: Record<string, unknown>;
  output?: Record<string, unknown> | null;
  status: RunStatus;
  nodeStates: Record<string, NodeState>;
  error?: string | null;
  startedAt: string;
  completedAt?: string | null;
  parentRunId?: string;
  triggeredBy?: { triggerType: 'agent_node' | 'tool_call'; nodeId: string; toolName?: string };
  childRuns?: Run[]; // Only when includeChildren=true
}

// Summary returned by list endpoints (without input/output/nodeStates)
export interface RunSummary {
  id: string;
  agentId: string;
  userId: string;
  status: RunStatus;
  error: string | null;
  startedAt: string;
  completedAt: string | null;
  parentRunId?: string;
  triggeredBy?: { triggerType: 'agent_node' | 'tool_call'; nodeId: string; toolName?: string };
  childRunIds?: string[]; // Only when includeChildren=true
}

export interface RunDetailsModalProps {
  runId: string | null;
  opened: boolean;
  onClose: () => void;
}

export const statusColors: Record<RunStatus, string> = {
  pending: 'gray',
  running: 'blue',
  completed: 'green',
  failed: 'red',
  cancelling: 'orange',
  cancelled: 'gray',
};

export const nodeStatusColors: Record<NodeStatus, string> = {
  pending: 'gray',
  running: 'blue',
  completed: 'green',
  failed: 'red',
  skipped: 'orange',
};

export function formatDuration(startedAt: string, completedAt?: string | null): string {
  const start = new Date(startedAt).getTime();
  const end = completedAt ? new Date(completedAt).getTime() : Date.now();
  const duration = end - start;

  if (duration < 1000) return `${duration}ms`;
  if (duration < 60000) return `${(duration / 1000).toFixed(1)}s`;
  return `${(duration / 60000).toFixed(1)}m`;
}

// Resolve nodeRef references in run output
// Format: "nodeRef:<nodeId>:<handle>"
export function resolveRunOutput(run: Run): Record<string, unknown> {
  if (!run.output) return {};

  const resolved: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(run.output)) {
    if (typeof value === 'string' && value.startsWith('nodeRef:')) {
      // Parse: "nodeRef:<nodeId>:<handle>"
      const [, nodeId, handle] = value.split(':');
      const nodeOutput = run.nodeStates[nodeId]?.output as Record<string, unknown> | undefined;
      resolved[key] = nodeOutput?.[handle];
    } else {
      resolved[key] = value;
    }
  }
  return resolved;
}
