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
import { SchedulesTable, type ScheduleColumn } from './SchedulesTable';

interface SchedulesListProps {
  /** string = workspace, null = global only, undefined = all */
  workspaceId?: string | null;
  agentId?: string;
  description?: string;
  /** Table columns to leave out; all are shown by default */
  excludeColumns?: ScheduleColumn[];
  /** Card layout for narrow containers (agent editor panel); mobile always uses cards */
  compact?: boolean;
  /** Extra controls next to the "New schedule" button */
  toolbar?: ReactNode;
  onCreate?: () => void;
  onDelete?: () => void;
}

// Owns the row actions; the table loads through DataTable, the card view through useSchedules
export function SchedulesList({
  workspaceId,
  agentId,
  description,
  excludeColumns,
  compact = false,
  toolbar,
  onCreate,
  onDelete,
}: SchedulesListProps) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { openSchedule, openNewSchedule } = useScheduleModal();
  const actions = useScheduleActions();
  const handleNew = () => openNewSchedule({ agentId, workspaceId });
  const showCards = compact || isMobile;

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
        {!showCards && (
          <Button leftSection={<IconPlus size={16} />} onClick={handleNew}>
            New schedule
          </Button>
        )}
      </Group>

      {showCards ? (
        <ScheduleCardsView
          workspaceId={workspaceId}
          agentId={agentId}
          compact={compact}
          toolbar={toolbar}
          handlers={handlers}
          onNew={handleNew}
          onCreate={onCreate}
          onDelete={onDelete}
        />
      ) : (
        <>
          {toolbar && <Group mb="md">{toolbar}</Group>}
          <SchedulesTable
            workspaceId={workspaceId}
            agentId={agentId}
            excludeColumns={excludeColumns}
            handlers={handlers}
            onCreate={onCreate}
            onDelete={onDelete}
          />
        </>
      )}

      {actions.modals}
    </Box>
  );
}

interface ScheduleCardsViewProps {
  workspaceId?: string | null;
  agentId?: string;
  compact: boolean;
  toolbar?: ReactNode;
  handlers: ScheduleRowHandlers;
  onNew: () => void;
  onCreate?: () => void;
  onDelete?: () => void;
}

// Narrow layout (agent editor panel, mobile)
function ScheduleCardsView({
  workspaceId,
  agentId,
  compact,
  toolbar,
  handlers,
  onNew,
  onCreate,
  onDelete,
}: ScheduleCardsViewProps) {
  const { schedules, loading, error, setError } = useSchedules({ agentId, workspaceId, onCreate, onDelete });

  return (
    <>
      <Group gap="sm" mb="md" justify="space-between">
        {toolbar}
        {schedules.length > 0 && (
          <Button leftSection={<IconPlus size={16} />} onClick={onNew} size={compact ? 'xs' : 'sm'}>
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
        <SchedulesEmpty compact={compact} onNew={onNew} />
      ) : (
        <ScheduleCards schedules={schedules} showAgent={!agentId} handlers={handlers} />
      )}
    </>
  );
}
