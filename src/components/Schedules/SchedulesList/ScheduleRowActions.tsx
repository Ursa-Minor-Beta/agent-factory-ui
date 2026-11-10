import { ActionIcon, Box, Group, Switch, Tooltip } from '@mantine/core';
import { IconPencil, IconPlayerPlay, IconTrash } from '@tabler/icons-react';
import type { AgentSchedule } from '../../../types';
import { canRunNow } from '../../../types';

// Row handlers shared by the table and card views
export interface ScheduleRowHandlers {
  onToggle: (schedule: AgentSchedule, enabled: boolean) => void;
  onRunNow: (schedule: AgentSchedule) => void;
  onEdit: (schedule: AgentSchedule) => void;
  onDelete: (schedule: AgentSchedule) => void;
}

interface ScheduleRowProps {
  schedule: AgentSchedule;
  handlers: ScheduleRowHandlers;
}

// Rows are clickable (open the schedule) - controls stop propagation
export function ScheduleToggle({ schedule, handlers }: ScheduleRowProps) {
  return (
    // Wrapper, not Switch onClick - that only reaches the hidden input, clicks on the track bubble to the row
    <Box onClick={(e) => e.stopPropagation()} w="fit-content">
      <Switch
        size="sm"
        checked={schedule.enabled}
        onChange={(e) => handlers.onToggle(schedule, e.currentTarget.checked)}
        aria-label="Enabled"
      />
    </Box>
  );
}

export function ScheduleRowActions({ schedule, handlers }: ScheduleRowProps) {
  // Run the handler without the click reaching the row (which opens the schedule)
  const action = (handler: (schedule: AgentSchedule) => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    handler(schedule);
  };

  return (
    // Also catches clicks on the disabled "Run now" button - it has no click handler of its own
    <Group gap={4} wrap="nowrap" justify="flex-end" onClick={(e) => e.stopPropagation()}>
      <Tooltip label={canRunNow(schedule) ? 'Run now' : 'Already running'}>
        <ActionIcon variant="subtle" disabled={!canRunNow(schedule)} onClick={action(handlers.onRunNow)}>
          <IconPlayerPlay size={18} />
        </ActionIcon>
      </Tooltip>
      <Tooltip label="Edit">
        <ActionIcon variant="subtle" onClick={action(handlers.onEdit)}>
          <IconPencil size={18} />
        </ActionIcon>
      </Tooltip>
      <Tooltip label="Delete">
        <ActionIcon variant="subtle" color="red" onClick={action(handlers.onDelete)}>
          <IconTrash size={18} />
        </ActionIcon>
      </Tooltip>
    </Group>
  );
}
