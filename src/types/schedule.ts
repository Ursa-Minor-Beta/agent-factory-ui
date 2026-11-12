export type ScheduleTrigger =
  | { type: 'cron'; expression: string; startAt?: string; endAt?: string; maxRuns?: number }
  | { type: 'once'; at: string }
  | { type: 'interval'; everyMs: number; anchorAt?: string; endAt?: string; maxRuns?: number };

export type ScheduleTriggerType = ScheduleTrigger['type'];
export type ScheduleSessionMode = 'session' | 'incognito';
export type ScheduleOverlapPolicy = 'skip' | 'allow';
export type ScheduleLastStatus = 'completed' | 'failed' | 'cancelled' | 'skipped';

export interface AgentSchedule {
  id: string;
  agentId: string;
  agentName?: string;
  workspaceId: string | null;
  workspaceName?: string;
  name: string;
  description?: string;
  enabled: boolean;
  trigger: ScheduleTrigger;
  timezone: string;
  input: Record<string, unknown>;
  sessionMode: ScheduleSessionMode;
  sessionId: string | null;
  overlapPolicy: ScheduleOverlapPolicy;
  stopAfterFailures: number;
  nextRunAt: string | null;
  lastRunAt?: string;
  lastRunId?: string;
  lastStatus?: ScheduleLastStatus;
  lastError?: string | null;
  runCount: number;
  consecutiveFailures: number;
  running: boolean;
  createdAt: string;
  updatedAt: string;
}

// Derived display state - single place for the list badge, toggle and "Run now" logic
export type ScheduleState = 'running' | 'stoppedAfterFailures' | 'finished' | 'paused' | 'active';

const STOPPED_AFTER_FAILURES_RE = /disabled after \d+ consecutive failures$/;

export function getScheduleState(s: AgentSchedule): ScheduleState {
  if (s.running) return 'running';
  if (s.enabled) return 'active';
  if (s.lastError && STOPPED_AFTER_FAILURES_RE.test(s.lastError)) return 'stoppedAfterFailures';
  if (s.nextRunAt === null && s.runCount > 0) return 'finished';
  return 'paused';
}

export function canRunNow(s: AgentSchedule): boolean {
  return !(s.running && s.overlapPolicy === 'skip');
}

export const scheduleLastStatusColors: Record<ScheduleLastStatus, string> = {
  completed: 'green',
  failed: 'red',
  cancelled: 'gray',
  skipped: 'orange',
};
