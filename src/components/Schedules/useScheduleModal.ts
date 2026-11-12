import { useSearchParams } from 'react-router';

export const SCHEDULE_PARAM = 'schedule';
export const SCHEDULE_AGENT_PARAM = 'schedule-agent';
export const SCHEDULE_TAB_PARAM = 'schedule-tab';
export const SCHEDULE_WORKSPACE_PARAM = 'schedule-workspace';
const NEW_SCHEDULE = 'new';

export type ScheduleModalTab = 'settings' | 'history';

/**
 * Global schedule modal state in URL query parameters.
 * `?schedule=<id>` edits a schedule, `?schedule=new&schedule-agent=<id>` creates one for that agent.
 * Other query params (Runs filters, run details modal) are preserved.
 */
export function useScheduleModal() {
  const [searchParams, setSearchParams] = useSearchParams();

  const param = searchParams.get(SCHEDULE_PARAM);
  const isNew = param === NEW_SCHEDULE;
  const scheduleId = param && !isNew ? param : null;
  const agentId = searchParams.get(SCHEDULE_AGENT_PARAM);
  // Agent select scope for a new schedule: id = that workspace, 'null' = global agents, absent = all
  const workspaceParam = searchParams.get(SCHEDULE_WORKSPACE_PARAM);
  const workspaceId = workspaceParam === null ? undefined : workspaceParam === 'null' ? null : workspaceParam;
  const tab: ScheduleModalTab = searchParams.get(SCHEDULE_TAB_PARAM) === 'history' ? 'history' : 'settings';

  const update = (values: Record<string, string | null>) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const [key, value] of Object.entries(values)) {
        if (value === null) next.delete(key);
        else next.set(key, value);
      }
      return next;
    });
  };

  // `closeParams` - other URL-state modals to close at the same time (e.g. run details opened on top)
  const openSchedule = (id: string, openTab: ScheduleModalTab = 'settings', closeParams: string[] = []) =>
    update({
      ...Object.fromEntries(closeParams.map((key) => [key, null])),
      [SCHEDULE_PARAM]: id,
      [SCHEDULE_AGENT_PARAM]: null,
      [SCHEDULE_WORKSPACE_PARAM]: null,
      [SCHEDULE_TAB_PARAM]: openTab === 'history' ? 'history' : null,
    });

  const openNewSchedule = (options?: { agentId?: string; workspaceId?: string | null }) =>
    update({
      [SCHEDULE_PARAM]: NEW_SCHEDULE,
      [SCHEDULE_AGENT_PARAM]: options?.agentId ?? null,
      [SCHEDULE_WORKSPACE_PARAM]: options?.workspaceId === undefined ? null : options.workspaceId ?? 'null',
      [SCHEDULE_TAB_PARAM]: null,
    });

  const setTab = (value: ScheduleModalTab) =>
    update({ [SCHEDULE_TAB_PARAM]: value === 'history' ? 'history' : null });

  const closeSchedule = () =>
    update({ [SCHEDULE_PARAM]: null, [SCHEDULE_AGENT_PARAM]: null, [SCHEDULE_WORKSPACE_PARAM]: null, [SCHEDULE_TAB_PARAM]: null });

  return {
    /** Schedule being edited (null when creating or closed) */
    scheduleId,
    /** Creating a new schedule */
    isNew,
    /** Prefilled agent for a new schedule */
    agentId,
    /** Workspace scope of the agent select for a new schedule */
    workspaceId,
    isOpen: isNew || !!scheduleId,
    tab,
    setTab,
    openSchedule,
    openNewSchedule,
    closeSchedule,
  };
}
