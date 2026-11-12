import { api } from './client';
import type {
  AgentSchedule,
  ScheduleOverlapPolicy,
  ScheduleSessionMode,
  ScheduleTrigger,
} from '../types';

export interface ListSchedulesOptions {
  agentId?: string;
  workspaceId?: string | null; // string = specific workspace, null = global only, undefined = all
  enabled?: boolean;
  sortBy?: 'name' | 'nextRunAt' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
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
  list: async (options?: ListSchedulesOptions): Promise<AgentSchedule[]> => {
    const params = new URLSearchParams();
    if (options?.agentId) params.append('agentId', options.agentId);
    if (options?.workspaceId !== undefined) {
      params.append('workspaceId', options.workspaceId === null ? 'null' : options.workspaceId);
    }
    if (options?.enabled !== undefined) params.append('enabled', String(options.enabled));
    if (options?.sortBy) params.append('sortBy', options.sortBy);
    if (options?.sortOrder) params.append('sortOrder', options.sortOrder);
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
