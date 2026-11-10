// Friendly cron builder presets <-> cron expression.
// build() and parse() must round-trip: parse(build(p)) deep-equals p.

export const MINUTE_STEPS = [5, 10, 15, 20, 30] as const;
export const HOUR_STEPS = [1, 2, 3, 4, 6, 12] as const;

export type MinuteStep = (typeof MINUTE_STEPS)[number];
export type HourStep = (typeof HOUR_STEPS)[number];

export type CronPreset =
  | { kind: 'minutes'; every: MinuteStep }
  | { kind: 'hours'; every: HourStep; minute: number }
  | { kind: 'daily'; hour: number; minute: number }
  | { kind: 'weekly'; days: number[]; hour: number; minute: number } // 0 = Sunday
  | { kind: 'monthly'; day: number; hour: number; minute: number }
  | { kind: 'yearly'; month: number; day: number; hour: number; minute: number }; // month 1-12

export type CronPresetKind = CronPreset['kind'];

export function buildCron(preset: CronPreset): string {
  switch (preset.kind) {
    case 'minutes':
      return `*/${preset.every} * * * *`;
    case 'hours':
      return `${preset.minute} */${preset.every} * * *`;
    case 'daily':
      return `${preset.minute} ${preset.hour} * * *`;
    case 'weekly':
      return `${preset.minute} ${preset.hour} * * ${normalizeDays(preset.days).join(',')}`;
    case 'monthly':
      return `${preset.minute} ${preset.hour} ${preset.day} * *`;
    case 'yearly':
      return `${preset.minute} ${preset.hour} ${preset.day} ${preset.month} *`;
  }
}

// Returns null when the expression doesn't match a preset - the form then opens Advanced
export function parseCron(expression: string): CronPreset | null {
  const fields = expression.trim().split(/\s+/);
  if (fields.length !== 5) return null;
  const [min, hour, dom, mon, dow] = fields;

  const minuteStep = matchStep(min);
  if (minuteStep !== null && hour === '*' && dom === '*' && mon === '*' && dow === '*') {
    return isOneOf(MINUTE_STEPS, minuteStep) ? { kind: 'minutes', every: minuteStep } : null;
  }

  const minute = parseIntInRange(min, 0, 59);
  if (minute === null) return null;

  const hourStep = hour === '*' ? 1 : matchStep(hour);
  if (hourStep !== null && dom === '*' && mon === '*' && dow === '*') {
    return isOneOf(HOUR_STEPS, hourStep) ? { kind: 'hours', every: hourStep, minute } : null;
  }

  const h = parseIntInRange(hour, 0, 23);
  if (h === null) return null;

  if (dom === '*' && mon === '*' && dow === '*') {
    return { kind: 'daily', hour: h, minute };
  }

  if (dom === '*' && mon === '*') {
    const days = parseDays(dow);
    return days ? { kind: 'weekly', days, hour: h, minute } : null;
  }

  const day = parseIntInRange(dom, 1, 31);
  if (day === null || dow !== '*') return null;

  if (mon === '*') return { kind: 'monthly', day, hour: h, minute };

  const month = parseIntInRange(mon, 1, 12);
  return month === null ? null : { kind: 'yearly', month, day, hour: h, minute };
}

function normalizeDays(days: number[]): number[] {
  return [...new Set(days.map((d) => d % 7))].sort((a, b) => a - b);
}

function parseDays(field: string): number[] | null {
  const parts = field.split(',');
  const days: number[] = [];
  for (const part of parts) {
    const d = parseIntInRange(part, 0, 7);
    if (d === null) return null;
    days.push(d);
  }
  return normalizeDays(days);
}

function matchStep(field: string): number | null {
  const m = /^\*\/(\d+)$/.exec(field);
  return m ? Number(m[1]) : null;
}

function parseIntInRange(field: string, min: number, max: number): number | null {
  if (!/^\d+$/.test(field)) return null;
  const n = Number(field);
  return n >= min && n <= max ? n : null;
}

function isOneOf<T extends number>(values: readonly T[], n: number): n is T {
  return (values as readonly number[]).includes(n);
}
