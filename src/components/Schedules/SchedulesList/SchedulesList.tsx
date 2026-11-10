import type { ReactNode } from 'react';
import { Alert, Box, Button, Center, Group, Loader, Text } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { IconAlertCircle, IconPlus } from '@tabler/icons-react';
import { useScheduleActions } from '../useScheduleActions';
import { useScheduleModal } from '../useScheduleModal';
import { useSchedules } from '../useSchedules';
import type { ScheduleRowHandlers } from './ScheduleRowActions';
import { SchedulesEmpty } from './SchedulesEmpty';
import { ScheduleCards } from './ScheduleCards';
import { DEFAULT_COLUMNS, SchedulesTable, type ScheduleColumn } from './SchedulesTable';

interface SchedulesListProps {
  /** string = workspace, null = global only, undefined = all */
  workspaceId?: string | null;
  agentId?: string;
  description?: string;
  columns?: ScheduleColumn[];
  /** Card layout for narrow containers (agent editor panel); mobile always uses cards */
  compact?: boolean;
  /** Extra controls next to the "New schedule" button (e.g. a workspace filter) */
  toolbar?: ReactNode;
  onCreate?: () => void;
  onDelete?: () => void;
}

// Loads schedules and owns the row actions; the views below are presentational
export function SchedulesList({
  workspaceId,
  agentId,
  description,
  columns = DEFAULT_COLUMNS,
  compact = false,
  toolbar,
  onCreate,
  onDelete,
}: SchedulesListProps) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { schedules, loading, error, setError } = useSchedules({ agentId, workspaceId, onCreate, onDelete });
  const { openSchedule, openNewSchedule } = useScheduleModal();
  const actions = useScheduleActions();
  const handleNew = () => openNewSchedule({ agentId, workspaceId });

  const handlers: ScheduleRowHandlers = {
    onToggle: actions.toggleEnabled,
    onRunNow: actions.runNow,
    onEdit: (schedule) => openSchedule(schedule.id),
    onDelete: actions.remove,
  };

  return (
    <Box>
      <Group mb="md" justify="space-between" gap="sm">
        {description ? <Text c="dimmed" size="sm">{description}</Text> : <Box />}
      </Group>
      <Group gap="sm" mb="md" justify="space-between" >
        {toolbar}
        {schedules.length > 0 && (
          <Button leftSection={<IconPlus size={16} />} onClick={handleNew} size={compact ? 'xs' : 'sm'}>
            New schedule
          </Button>
        )}
      </Group>

      {error && (
        <Alert icon={<IconAlertCircle size={16} />} color="red" mb="md" withCloseButton onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Center py="xl"><Loader /></Center>
      ) : schedules.length === 0 ? (
        <SchedulesEmpty compact={compact} onNew={handleNew} />
      ) : compact || isMobile ? (
        <ScheduleCards schedules={schedules} showAgent={!agentId} handlers={handlers} />
      ) : (
        <SchedulesTable schedules={schedules} columns={columns} handlers={handlers} />
      )}

      {actions.modals}

    </Box>
  );
}
