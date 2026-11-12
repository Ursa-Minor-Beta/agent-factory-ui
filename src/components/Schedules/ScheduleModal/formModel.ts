import type { CreateScheduleInput, UpdateScheduleInput } from '../../../api';
import type {
  AgentSchedule,
  InputSchema,
  ScheduleSessionMode,
  ScheduleTrigger,
  ScheduleTriggerType,
} from '../../../types';
import {
  buildCron,
  intervalToMs,
  msToInterval,
  parseCron,
  type CronPreset,
  type CronPresetKind,
  type HourStep,
  type IntervalUnit,
  type MinuteStep,
  type SecondStep,
} from '../../../utils/cron';
import dayjs, { browserTimezone } from '../../../utils/dayjs';
import { buildAgentInput } from '../../../pages/Chat/models/agentInput';

// Mantine date pickers work with local 'YYYY-MM-DD HH:mm:ss' strings
const PICKER_FORMAT = 'YYYY-MM-DD HH:mm:ss';

export const DEFAULT_STOP_AFTER_FAILURES = 5;

export interface ScheduleFormValues {
  agentId: string;
  name: string;
  description: string;
  enabled: boolean;

  triggerType: ScheduleTriggerType;

  // Repeat (cron)
  cronAdvanced: boolean;
  cronExpression: string;
  cronKind: CronPresetKind;
  secondStep: SecondStep;
  minuteStep: MinuteStep;
  hourStep: HourStep;
  time: string; // 'HH:mm' - daily/weekly/monthly/yearly; minute part only for 'hours'
  weekDays: string[]; // '0'..'6'
  monthDay: number;
  month: string; // '1'..'12'

  // Once
  at: string | null;

  // Interval
  intervalValue: number;
  intervalUnit: IntervalUnit;
  anchorAt: string | null;

  // Repeat + Interval limits
  startAt: string | null;
  endAt: string | null;
  maxRuns: number | '';

  timezone: string;

  inputValues: Record<string, string>; // schema form
  inputJson: Record<string, unknown>; // no schema - JSON editor

  sessionMode: ScheduleSessionMode;
  continueSession: boolean;
  sessionId: string | null;

  skipOverlap: boolean;
  stopAfterFailures: number;
}

const toPicker = (iso?: string | null) => (iso ? dayjs(iso).format(PICKER_FORMAT) : null);
const fromPicker = (value: string | null) => (value ? dayjs(value).toISOString() : undefined);

const parseTime = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return { hour: h || 0, minute: m || 0 };
};
const formatTime = (hour: number, minute: number) =>
  `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

export function defaultFormValues(agentId = ''): ScheduleFormValues {
  return {
    agentId,
    name: '',
    description: '',
    enabled: true,
    triggerType: 'cron',
    cronAdvanced: false,
    cronExpression: '0 9 * * *',
    cronKind: 'daily',
    secondStep: 30,
    minuteStep: 15,
    hourStep: 1,
    time: '09:00',
    weekDays: ['1', '2', '3', '4', '5'],
    monthDay: 1,
    month: '1',
    at: null,
    intervalValue: 1,
    intervalUnit: 'hours',
    anchorAt: null,
    startAt: null,
    endAt: null,
    maxRuns: '',
    timezone: browserTimezone(),
    inputValues: {},
    inputJson: {},
    sessionMode: 'incognito',
    continueSession: false,
    sessionId: null,
    skipOverlap: true,
    stopAfterFailures: DEFAULT_STOP_AFTER_FAILURES,
  };
}

function applyPreset(values: ScheduleFormValues, preset: CronPreset) {
  values.cronKind = preset.kind;
  switch (preset.kind) {
    case 'seconds':
      values.secondStep = preset.every;
      break;
    case 'minutes':
      values.minuteStep = preset.every;
      break;
    case 'hours':
      values.hourStep = preset.every;
      values.time = formatTime(0, preset.minute);
      break;
    default:
      values.time = formatTime(preset.hour, preset.minute);
      if (preset.kind === 'weekly') values.weekDays = preset.days.map(String);
      if (preset.kind === 'monthly' || preset.kind === 'yearly') values.monthDay = preset.day;
      if (preset.kind === 'yearly') values.month = String(preset.month);
  }
}

export function toFormValues(schedule: AgentSchedule, schema: InputSchema): ScheduleFormValues {
  const values = defaultFormValues(schedule.agentId);
  Object.assign(values, {
    name: schedule.name,
    description: schedule.description ?? '',
    enabled: schedule.enabled,
    triggerType: schedule.trigger.type,
    timezone: schedule.timezone,
    sessionMode: schedule.sessionMode,
    continueSession: !!schedule.sessionId,
    sessionId: schedule.sessionId,
    skipOverlap: schedule.overlapPolicy === 'skip',
    stopAfterFailures: schedule.stopAfterFailures,
  });

  const { trigger } = schedule;
  if (trigger.type === 'cron') {
    values.cronExpression = trigger.expression;
    const preset = parseCron(trigger.expression);
    if (preset) applyPreset(values, preset);
    else values.cronAdvanced = true;
  }
  if (trigger.type === 'once') values.at = toPicker(trigger.at);
  if (trigger.type === 'interval') {
    const { value, unit } = msToInterval(trigger.everyMs);
    values.intervalValue = value;
    values.intervalUnit = unit;
    values.anchorAt = toPicker(trigger.anchorAt);
  }
  if (trigger.type !== 'once') {
    values.startAt = trigger.type === 'cron' ? toPicker(trigger.startAt) : null;
    values.endAt = toPicker(trigger.endAt);
    values.maxRuns = trigger.maxRuns ?? '';
  }

  if (Object.keys(schema).length > 0) {
    values.inputValues = Object.fromEntries(
      Object.entries(schedule.input ?? {}).map(([k, v]) => [k, typeof v === 'string' ? v : JSON.stringify(v)])
    );
  } else {
    values.inputJson = schedule.input ?? {};
  }
  return values;
}

export function buildCronExpression(values: ScheduleFormValues): string {
  if (values.cronAdvanced) return values.cronExpression.trim();
  const { hour, minute } = parseTime(values.time);
  switch (values.cronKind) {
    case 'seconds':
      return buildCron({ kind: 'seconds', every: values.secondStep });
    case 'minutes':
      return buildCron({ kind: 'minutes', every: values.minuteStep });
    case 'hours':
      return buildCron({ kind: 'hours', every: values.hourStep, minute });
    case 'daily':
      return buildCron({ kind: 'daily', hour, minute });
    case 'weekly':
      return buildCron({ kind: 'weekly', days: values.weekDays.map(Number), hour, minute });
    case 'monthly':
      return buildCron({ kind: 'monthly', day: values.monthDay, hour, minute });
    case 'yearly':
      return buildCron({ kind: 'yearly', month: Number(values.month), day: values.monthDay, hour, minute });
  }
}

// Null while the "When" block is incomplete - nothing to preview or save yet
export function buildTrigger(values: ScheduleFormValues): ScheduleTrigger | null {
  const limits = {
    endAt: fromPicker(values.endAt),
    maxRuns: values.maxRuns === '' ? undefined : values.maxRuns,
  };
  switch (values.triggerType) {
    case 'cron': {
      if (!values.cronAdvanced && values.cronKind === 'weekly' && values.weekDays.length === 0) return null;
      const expression = buildCronExpression(values);
      if (!expression) return null;
      return { type: 'cron', expression, startAt: fromPicker(values.startAt), ...limits };
    }
    case 'once':
      return values.at ? { type: 'once', at: dayjs(values.at).toISOString() } : null;
    case 'interval':
      if (!values.intervalValue) return null;
      return {
        type: 'interval',
        everyMs: intervalToMs({ value: values.intervalValue, unit: values.intervalUnit }),
        anchorAt: fromPicker(values.anchorAt),
        ...limits,
      };
  }
}

// Once and Interval use absolute times - the browser timezone is sent
export const effectiveTimezone = (values: ScheduleFormValues) =>
  values.triggerType === 'cron' ? values.timezone : browserTimezone();

export function toCreatePayload(values: ScheduleFormValues, schema: InputSchema): CreateScheduleInput | null {
  const trigger = buildTrigger(values);
  if (!trigger) return null;
  const hasSchema = Object.keys(schema).length > 0;
  return {
    agentId: values.agentId,
    name: values.name.trim(),
    description: values.description.trim() || undefined,
    enabled: values.enabled,
    trigger: stripUndefined(trigger),
    timezone: effectiveTimezone(values),
    input: hasSchema ? buildAgentInput(schema, values.inputValues) : values.inputJson,
    sessionMode: values.sessionMode,
    sessionId: values.sessionMode === 'session' && values.continueSession ? values.sessionId : null,
    overlapPolicy: values.skipOverlap ? 'skip' : 'allow',
    stopAfterFailures: values.stopAfterFailures,
  };
}

/**
 * PATCH body with only the changed fields.
 * Matters for `trigger`: sending it resets runCount on the server.
 */
export function toUpdatePayload(
  original: AgentSchedule,
  values: ScheduleFormValues,
  schema: InputSchema
): UpdateScheduleInput | null {
  const full = toCreatePayload(values, schema);
  if (!full) return null;
  const { agentId: _agentId, ...rest } = full;
  const current: Record<string, unknown> = {
    name: original.name,
    description: original.description || undefined,
    enabled: original.enabled,
    trigger: stripUndefined(original.trigger),
    timezone: original.timezone,
    input: original.input ?? {},
    sessionMode: original.sessionMode,
    sessionId: original.sessionId,
    overlapPolicy: original.overlapPolicy,
    stopAfterFailures: original.stopAfterFailures,
  };
  const patch: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(rest)) {
    if (!sameValue(value, current[key])) patch[key] = key === 'description' && value === undefined ? '' : value;
  }
  return patch as UpdateScheduleInput;
}

export function isTriggerChanged(original: AgentSchedule, values: ScheduleFormValues): boolean {
  const trigger = buildTrigger(values);
  return !!trigger && !sameValue(stripUndefined(trigger), stripUndefined(original.trigger));
}

function stripUndefined<T extends object>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T;
}

// Order-insensitive deep equality for JSON-like values; ISO dates compared by instant
function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a === 'string' && typeof b === 'string') {
    const isoRe = /^\d{4}-\d{2}-\d{2}T/;
    return isoRe.test(a) && isoRe.test(b) && dayjs(a).valueOf() === dayjs(b).valueOf();
  }
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const aKeys = Object.keys(a as object).filter((k) => (a as Record<string, unknown>)[k] !== undefined);
  const bKeys = Object.keys(b as object).filter((k) => (b as Record<string, unknown>)[k] !== undefined);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((k) => sameValue((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
}

// Server validation messages -> the form field or block they belong to
export type ScheduleErrorTarget = 'name' | 'when' | 'at' | 'input' | 'session' | 'form';

export function getErrorTarget(message: string): ScheduleErrorTarget {
  const m = message.toLowerCase();
  if (m.includes('"at"')) return 'at';
  if (m.includes('"name"')) return 'name';
  if (/cron|expression|out of range|trigger|everyms|interval|startat|endat|maxruns|anchorat|timezone|no upcoming/.test(m)) return 'when';
  if (m.includes('input')) return 'input';
  if (m.includes('session')) return 'session';
  return 'form';
}
