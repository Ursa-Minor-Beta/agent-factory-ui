import type { AgentSchedule } from '../../types';

// The modal and the lists are mounted in different places - they sync through window events,
// like 'workspace-created' does for workspaces
const SAVED = 'schedule-saved';
const DELETED = 'schedule-deleted';
const CREATED = 'schedule-created';

export function emitScheduleSaved(schedule: AgentSchedule) {
  window.dispatchEvent(new CustomEvent(SAVED, { detail: schedule }));
}

// Fired after 'schedule-saved' for a new schedule - lets pages refresh counts (workspace info)
export function emitScheduleCreated(schedule: AgentSchedule) {
  window.dispatchEvent(new CustomEvent(CREATED, { detail: schedule }));
}

export function emitScheduleDeleted(id: string) {
  window.dispatchEvent(new CustomEvent(DELETED, { detail: id }));
}

export function subscribeScheduleEvents(handlers: {
  onSaved: (schedule: AgentSchedule) => void;
  onDeleted: (id: string) => void;
  onCreated?: (schedule: AgentSchedule) => void;
}) {
  const saved = (e: Event) => handlers.onSaved((e as CustomEvent<AgentSchedule>).detail);
  const deleted = (e: Event) => handlers.onDeleted((e as CustomEvent<string>).detail);
  const created = (e: Event) => handlers.onCreated?.((e as CustomEvent<AgentSchedule>).detail);
  window.addEventListener(SAVED, saved);
  window.addEventListener(DELETED, deleted);
  window.addEventListener(CREATED, created);
  return () => {
    window.removeEventListener(SAVED, saved);
    window.removeEventListener(DELETED, deleted);
    window.removeEventListener(CREATED, created);
  };
}
