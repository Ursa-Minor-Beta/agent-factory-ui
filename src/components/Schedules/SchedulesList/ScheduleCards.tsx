import { Card, Group, Stack, Text } from '@mantine/core';
import type { AgentSchedule } from '../../../types';
import { describeTrigger } from '../../../utils/cron';
import { ScheduleLastRun, ScheduleNextRun, ScheduleStateBadge } from '../ScheduleBadges';
import { ScheduleRowActions, ScheduleToggle, type ScheduleRowHandlers } from './ScheduleRowActions';

interface ScheduleCardsProps {
  schedules: AgentSchedule[];
  showAgent: boolean;
  handlers: ScheduleRowHandlers;
}

// Card layout - mobile and narrow containers (agent editor panel)
export function ScheduleCards({ schedules, showAgent, handlers }: ScheduleCardsProps) {
  return (
    <Stack gap="xs">
      {schedules.map((schedule) => (
        <Card
          key={schedule.id}
          withBorder
          radius="lg"
          p="sm"
          style={{ cursor: 'pointer' }}
          onClick={() => handlers.onEdit(schedule)}
        >
          <Group justify="space-between" wrap="nowrap" gap="xs" mb={4}>
            <Text fw={500} size="sm" truncate>{schedule.name}</Text>
            <ScheduleToggle schedule={schedule} handlers={handlers} />
          </Group>
          {showAgent && <Text size="xs" c="dimmed" truncate>{schedule.agentName ?? schedule.agentId}</Text>}
          <Text size="xs" c="dimmed">{describeTrigger(schedule.trigger, schedule.timezone)}</Text>
          <Group gap="xs" mt={6} wrap="wrap">
            <ScheduleStateBadge schedule={schedule} />
            <Text size="xs" c="dimmed">Next:</Text>
            <ScheduleNextRun schedule={schedule} />
          </Group>
          <Group justify="space-between" mt={6} wrap="nowrap">
            <ScheduleLastRun schedule={schedule} />
            <ScheduleRowActions schedule={schedule} handlers={handlers} />
          </Group>
        </Card>
      ))}
    </Stack>
  );
}
