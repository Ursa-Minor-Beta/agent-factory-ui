import { api } from './client';
import type {
  AgentSchedule,
  ScheduleLastStatus,
  ScheduleOverlapPolicy,
  ScheduleSessionMode,
  ScheduleTrigger,
  ScheduleTriggerType,
} from '../types';

export interface ListSchedulesOptions {
  agentId?: string;
  workspaceId?: string | null; // string = specific workspace, null = global only, undefined = all
  enabled?: boolean;
  name?: string; // Contains, case-insensitive
  description?: string; // Contains, case-insensitive
  triggerType?: ScheduleTriggerType;
  lastStatus?: ScheduleLastStatus;
  sessionMode?: ScheduleSessionMode;
  nextRunAfter?: string;
  nextRunBefore?: string;
  createdAfter?: string;
  createdBefore?: string;
  updatedAfter?: string;
  updatedBefore?: string;
  sortBy?: 'name' | 'nextRunAt' | 'lastRunAt' | 'runCount' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
  skip?: number;
  limit?: number; // backend max 100; omit to return all
}

export interface CreateScheduleInput {
  agentId: string;
  name: string;
  trigger: ScheduleTrigger;
  description?: string;
  enabled?: boolean;
  timezone?: string;
  input?: Record<string, unknown>;
  sessionMode?: ScheduleSessionMode;
  sessionId?: string | null;
  overlapPolicy?: ScheduleOverlapPolicy;
  stopAfterFailures?: number;
}

// agentId can't be changed after creation
export type UpdateScheduleInput = Partial<Omit<CreateScheduleInput, 'agentId'>>;

export interface PreviewScheduleInput {
  trigger: ScheduleTrigger;
  timezone: string;
  count?: number; // max 20
}

export interface PreviewScheduleResponse {
  nextRuns: string[];
}

export const schedulesApi = {
  list: async (options: ListSchedulesOptions = {}): Promise<AgentSchedule[]> => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(options)) {
      if (value === undefined || value === '') continue;
      // workspaceId: null = global only
      params.append(key, value === null ? 'null' : String(value));
    }
    const query = params.toString();
    return api.get<AgentSchedule[]>(`/api/schedules${query ? `?${query}` : ''}`);
  },

  getById: (id: string) =>
    api.get<AgentSchedule>(`/api/schedules/${id}`),

  create: (data: CreateScheduleInput) =>
    api.post<AgentSchedule>('/api/schedules', data),

  update: (id: string, data: UpdateScheduleInput) =>
    api.patch<AgentSchedule>(`/api/schedules/${id}`, data),

  delete: (id: string) =>
    api.delete<void>(`/api/schedules/${id}`),

  // 409 if a run is already in progress and overlapPolicy is 'skip'
  runNow: (id: string) =>
    api.post<unknown>(`/api/schedules/${id}/run`),

  preview: (data: PreviewScheduleInput) =>
    api.post<PreviewScheduleResponse>('/api/schedules/preview', data),
};
