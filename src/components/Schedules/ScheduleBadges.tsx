import { Anchor, Badge, Group, Loader, Text, Tooltip } from '@mantine/core';
import {
  IconAlertTriangle,
  IconCircleCheck,
  IconCircleX,
  IconPlayerSkipForward,
  IconPlayerStop,
  type Icon,
} from '@tabler/icons-react';
import type { AgentSchedule, ScheduleLastStatus } from '../../types';
import { getScheduleState, scheduleLastStatusColors } from '../../types';
import dayjs, { DATE_TIME_FORMAT } from '../../utils/dayjs';
import { useRunDetailsModal } from '../RunDetailsModal';

// Running / stopped after failures / finished / paused; active idle schedule - only with `showActive`
export function ScheduleStateBadge({ schedule, showActive = false }: { schedule: AgentSchedule; showActive?: boolean }) {
  switch (getScheduleState(schedule)) {
    case 'running':
      return (
        <Badge size="sm" variant="light" color="blue" leftSection={<Loader size={10} color="blue" />}>
          Running
        </Badge>
      );
    case 'stoppedAfterFailures':
      return (
        <Tooltip label={schedule.lastError} multiline maw={320}>
          <Badge size="sm" variant="light" color="orange" leftSection={<IconAlertTriangle size={12} />}>
            Stopped after failures
          </Badge>
        </Tooltip>
      );
    case 'finished':
      return <Badge size="sm" variant="light" color="gray">Finished</Badge>;
    case 'paused':
      return <Badge size="sm" variant="outline" color="gray">Paused</Badge>;
    default:
      return showActive ? <Badge size="sm" variant="light" color="green">Active</Badge> : null;
  }
}

export function DateTimeWithTooltip({ value, relative = true }: { value: string; relative?: boolean }) {
  const date = dayjs(value);
  return (
    <Tooltip label={date.format(DATE_TIME_FORMAT)} openDelay={300}>
      <Text size="sm" c="dimmed" component="span">
        {relative ? date.fromNow() : date.format(DATE_TIME_FORMAT)}
      </Text>
    </Tooltip>
  );
}

export function ScheduleNextRun({ schedule }: { schedule: AgentSchedule }) {
  if (!schedule.nextRunAt || !schedule.enabled) return <Text size="sm" c="dimmed">—</Text>;
  return <DateTimeWithTooltip value={schedule.nextRunAt} />;
}

const lastStatusIcons: Record<ScheduleLastStatus, Icon> = {
  completed: IconCircleCheck,
  failed: IconCircleX,
  cancelled: IconPlayerStop,
  skipped: IconPlayerSkipForward,
};

// Status icon + time; opens the run details of the last run
export function ScheduleLastRun({ schedule }: { schedule: AgentSchedule }) {
  const { openRunDetails } = useRunDetailsModal();
  if (!schedule.lastRunAt || !schedule.lastStatus) return <Text size="sm" c="dimmed">—</Text>;

  const StatusIcon = lastStatusIcons[schedule.lastStatus];
  // Failed runs show the error, others the status name
  const tooltip = schedule.lastStatus === 'failed' && schedule.lastError ? schedule.lastError : schedule.lastStatus;

  return (
    <Group gap={6} wrap="nowrap">
      <Tooltip label={tooltip} multiline maw={320}>
        <StatusIcon
          size={18}
          aria-label={schedule.lastStatus}
          style={{ color: `var(--mantine-color-${scheduleLastStatusColors[schedule.lastStatus]}-6)`, flexShrink: 0 }}
        />
      </Tooltip>
      {schedule.lastRunId ? (
        <Anchor
          size="sm"
          c="dimmed"
          onClick={(e) => {
            e.stopPropagation();
            openRunDetails(schedule.lastRunId!);
          }}
        >
          {dayjs(schedule.lastRunAt).fromNow()}
        </Anchor>
      ) : (
        <DateTimeWithTooltip value={schedule.lastRunAt} />
      )}
    </Group>
  );
}
