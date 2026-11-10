import dayjs, { DATE_TIME_FORMAT } from '../dayjs';
import type { ScheduleTrigger } from '../../types';
import { msToInterval } from './interval';
import { parseCron, type CronPreset } from './presets';

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function describeDays(days: number[]): string {
  const key = days.join(',');
  if (key === '1,2,3,4,5') return 'Weekdays';
  if (key === '0,6') return 'Weekends';
  if (days.length === 7) return 'Every day';
  return days.map((d) => WEEKDAY_NAMES[d]).join(', ');
}

export function describeCronPreset(preset: CronPreset): string {
  switch (preset.kind) {
    case 'minutes':
      return `Every ${preset.every} min`;
    case 'hours':
      return preset.every === 1
        ? `Hourly at :${String(preset.minute).padStart(2, '0')}`
        : `Every ${preset.every} hours at :${String(preset.minute).padStart(2, '0')}`;
    case 'daily':
      return `Daily at ${formatTime(preset.hour, preset.minute)}`;
    case 'weekly':
      return `${describeDays(preset.days)} at ${formatTime(preset.hour, preset.minute)}`;
    case 'monthly':
      return `Monthly on day ${preset.day} at ${formatTime(preset.hour, preset.minute)}`;
    case 'yearly':
      return `Yearly on ${preset.day} ${MONTH_NAMES[preset.month - 1]} at ${formatTime(preset.hour, preset.minute)}`;
  }
}

export function describeInterval(everyMs: number): string {
  const { value, unit } = msToInterval(everyMs);
  if (unit === 'minutes') return `Every ${value} min`;
  if (unit === 'hours') return value === 1 ? 'Every hour' : `Every ${value} hours`;
  return value === 1 ? 'Every day' : `Every ${value} days`;
}

// Human-readable summary for the schedules list, e.g. "Weekdays at 09:00 (Europe/Berlin)"
export function describeTrigger(trigger: ScheduleTrigger, timezone: string): string {
  switch (trigger.type) {
    case 'cron': {
      const preset = parseCron(trigger.expression);
      // Minute steps don't depend on the timezone
      if (preset?.kind === 'minutes') return describeCronPreset(preset);
      const text = preset ? describeCronPreset(preset) : `Cron: ${trigger.expression}`;
      return `${text} (${timezone})`;
    }
    case 'once':
      return `Once on ${dayjs(trigger.at).format(DATE_TIME_FORMAT)}`;
    case 'interval':
      return describeInterval(trigger.everyMs);
  }
}
