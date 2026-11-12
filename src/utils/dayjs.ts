import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import relativeTime from 'dayjs/plugin/relativeTime';

// dayjs with the plugins schedules need (timezone display, relative times)
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(relativeTime);

export const browserTimezone = (): string => Intl.DateTimeFormat().resolvedOptions().timeZone;

export const DATE_TIME_FORMAT = 'D MMM YYYY HH:mm';

export default dayjs;
