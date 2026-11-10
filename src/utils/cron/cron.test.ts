import { describe, expect, it } from 'vitest';
import {
  buildCron,
  describeInterval,
  describeTrigger,
  intervalToMs,
  msToInterval,
  parseCron,
  type CronPreset,
} from '.';

const presets: [CronPreset, string][] = [
  [{ kind: 'minutes', every: 15 }, '*/15 * * * *'],
  [{ kind: 'hours', every: 6, minute: 30 }, '30 */6 * * *'],
  [{ kind: 'daily', hour: 9, minute: 5 }, '5 9 * * *'],
  [{ kind: 'weekly', days: [1, 3, 5], hour: 9, minute: 0 }, '0 9 * * 1,3,5'],
  [{ kind: 'monthly', day: 31, hour: 23, minute: 59 }, '59 23 31 * *'],
  [{ kind: 'yearly', month: 12, day: 24, hour: 10, minute: 0 }, '0 10 24 12 *'],
];

describe('cron presets', () => {
  it.each(presets)('round-trips %o', (preset, expression) => {
    expect(buildCron(preset)).toBe(expression);
    expect(parseCron(expression)).toEqual(preset);
  });

  it('normalizes weekly days (dedupe, sort, 7 = Sunday)', () => {
    expect(buildCron({ kind: 'weekly', days: [5, 1, 7, 1], hour: 8, minute: 0 })).toBe('0 8 * * 0,1,5');
    expect(parseCron('0 8 * * 7,1')).toEqual({ kind: 'weekly', days: [0, 1], hour: 8, minute: 0 });
  });

  it('treats "M * * * *" as every 1 hour', () => {
    expect(parseCron('15 * * * *')).toEqual({ kind: 'hours', every: 1, minute: 15 });
  });

  it.each([
    '*/7 * * * *', // step not offered
    '0 */5 * * *', // step not offered
    '0 9 * * 1-5', // ranges
    '0 9 1 * 1', // dom + dow
    '0 9 1 JAN *', // names
    '61 9 * * *', // out of range
    '0 9 * *', // 4 fields
    '0,30 9 * * *', // minute lists
  ])('returns null for non-preset %s', (expression) => {
    expect(parseCron(expression)).toBeNull();
  });
});

describe('intervals', () => {
  it.each([
    [90 * 60_000, { value: 90, unit: 'minutes' }],
    [2 * 3_600_000, { value: 2, unit: 'hours' }],
    [10 * 86_400_000, { value: 10, unit: 'days' }],
    [36 * 3_600_000, { value: 36, unit: 'hours' }],
  ] as const)('msToInterval(%d)', (ms, expected) => {
    expect(msToInterval(ms)).toEqual(expected);
    expect(intervalToMs(expected)).toBe(ms);
  });

  it('describes intervals', () => {
    expect(describeInterval(90 * 60_000)).toBe('Every 90 min');
    expect(describeInterval(86_400_000)).toBe('Every day');
  });
});

describe('describeTrigger', () => {
  it('describes cron presets with timezone', () => {
    expect(describeTrigger({ type: 'cron', expression: '0 9 * * 1,2,3,4,5' }, 'Europe/Berlin'))
      .toBe('Weekdays at 09:00 (Europe/Berlin)');
    expect(describeTrigger({ type: 'cron', expression: '*/10 * * * *' }, 'UTC')).toBe('Every 10 min');
    expect(describeTrigger({ type: 'cron', expression: '0 9 * * 1-5' }, 'UTC')).toBe('Cron: 0 9 * * 1-5 (UTC)');
  });
});
