import { useState } from 'react';
import { Anchor, Code, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useNavigate } from 'react-router';
import { ApiError, schedulesApi } from '../../api';
import type { AgentSchedule } from '../../types';
import { routes } from '../../config/routes';
import { DeleteConfirmModal } from '../DeleteConfirmModal';
import { ScheduleRunNowModal } from './ScheduleRunNowModal';
import { emitScheduleDeleted, emitScheduleSaved } from './scheduleEvents';
import { useScheduleModal } from './useScheduleModal';

/**
 * Row actions shared by schedule lists and the modal: toggle, run now (with confirm), delete (with confirm).
 * Render `modals` once next to the list.
 */
export function useScheduleActions() {
  const navigate = useNavigate();
  const { openSchedule } = useScheduleModal();
  const [runTarget, setRunTarget] = useState<AgentSchedule | null>(null);
  const [running, setRunning] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AgentSchedule | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const toggleEnabled = async (schedule: AgentSchedule, enabled: boolean) => {
    // Optimistic - lists update right away, reverted on error
    emitScheduleSaved({ ...schedule, enabled });
    try {
      emitScheduleSaved(await schedulesApi.update(schedule.id, { enabled }));
    } catch (err) {
      emitScheduleSaved(schedule);
      const message = err instanceof Error ? err.message : 'Failed to update schedule';
      // Re-enabling a finished Once schedule fails - its date is in the past
      if (enabled && schedule.trigger.type === 'once') {
        notifications.show({ color: 'orange', title: 'Pick a new date', message });
        openSchedule(schedule.id);
      } else {
        notifications.show({ color: 'red', title: 'Failed to update schedule', message });
      }
    }
  };

  const confirmRunNow = async () => {
    if (!runTarget) return;
    const schedule = runTarget;
    setRunning(true);
    try {
      await schedulesApi.runNow(schedule.id);
      emitScheduleSaved({ ...schedule, running: true });
      const runsUrl = routes.runs({ scheduleId: schedule.id });
      notifications.show({
        color: 'green',
        title: 'Run started',
        message: (
          <Text size="sm">
            <Anchor
              href={runsUrl}
              size="sm"
              onClick={(e) => {
                e.preventDefault();
                navigate(runsUrl);
              }}
            >
              View runs of this schedule
            </Anchor>
          </Text>
        ),
      });
    } catch (err) {
      const conflict = err instanceof ApiError && err.status === 409;
      notifications.show({
        color: conflict ? 'orange' : 'red',
        title: conflict ? 'Already running' : 'Failed to start run',
        message: conflict ? 'Wait for the current run to finish.' : (err instanceof Error ? err.message : ''),
      });
      if (conflict) emitScheduleSaved({ ...schedule, running: true });
    } finally {
      setRunning(false);
      setRunTarget(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await schedulesApi.delete(deleteTarget.id);
      emitScheduleDeleted(deleteTarget.id);
      setDeleteTarget(null);
      setDeleteError('');
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete schedule');
    } finally {
      setDeleting(false);
    }
  };

  const closeDelete = () => {
    setDeleteTarget(null);
    setDeleteError('');
  };

  const modals = (
    <>
      <ScheduleRunNowModal
        schedule={runTarget}
        onClose={() => setRunTarget(null)}
        onConfirm={confirmRunNow}
        loading={running}
      />
      <DeleteConfirmModal
        opened={!!deleteTarget}
        onClose={closeDelete}
        onDelete={confirmDelete}
        deleting={deleting}
        title="Delete Schedule"
        entityName={<Code>{deleteTarget?.name}</Code>}
        error={deleteError}
      />
    </>
  );

  return {
    toggleEnabled,
    runNow: setRunTarget,
    remove: setDeleteTarget,
    modals,
  };
}
