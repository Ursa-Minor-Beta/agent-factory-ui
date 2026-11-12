export type IntervalUnit = 'minutes' | 'hours' | 'days';

export const INTERVAL_UNIT_MS: Record<IntervalUnit, number> = {
  minutes: 60_000,
  hours: 3_600_000,
  days: 86_400_000,
};

export const MIN_INTERVAL_MS = INTERVAL_UNIT_MS.minutes;

export interface IntervalValue {
  value: number;
  unit: IntervalUnit;
}

export function intervalToMs({ value, unit }: IntervalValue): number {
  return value * INTERVAL_UNIT_MS[unit];
}

// Picks the largest unit that divides evenly: 90 min stays minutes, 10 days stays days
export function msToInterval(ms: number): IntervalValue {
  for (const unit of ['days', 'hours'] as const) {
    if (ms % INTERVAL_UNIT_MS[unit] === 0) return { value: ms / INTERVAL_UNIT_MS[unit], unit };
  }
  return { value: Math.max(1, Math.round(ms / INTERVAL_UNIT_MS.minutes)), unit: 'minutes' };
}
