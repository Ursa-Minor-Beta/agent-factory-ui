import { useEffect, useState } from 'react';
import { Alert, Button, Center, Group, Modal, Loader, Tabs, Text, Tooltip } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconAlertCircle, IconHistory, IconPlayerPlay, IconSettings } from '@tabler/icons-react';
import { schedulesApi } from '../../../api';
import type { AgentSchedule } from '../../../types';
import { canRunNow } from '../../../types';
import { ScheduleStateBadge } from '../ScheduleBadges';
import { emitScheduleCreated, emitScheduleSaved, subscribeScheduleEvents } from '../scheduleEvents';
import { useScheduleActions } from '../useScheduleActions';
import { useScheduleModal, type ScheduleModalTab } from '../useScheduleModal';
import { ScheduleForm } from './ScheduleForm';
import { ScheduleHistory } from './ScheduleHistory';

/**
 * Global create/edit modal for schedules - placed once in Layout, state lives in the URL.
 * Open it from anywhere with `useScheduleModal().openSchedule(id)` / `openNewSchedule({ agentId })`.
 */
export function ScheduleModal() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { scheduleId, isNew, agentId, workspaceId, isOpen, tab, setTab, closeSchedule } = useScheduleModal();
  const actions = useScheduleActions();
  const [schedule, setSchedule] = useState<AgentSchedule | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // History is fetched on first visit and stays mounted - switching tabs doesn't refetch
  const [historyVisited, setHistoryVisited] = useState(false);
  if (tab === 'history' && !historyVisited) setHistoryVisited(true);

  useEffect(() => {
    setSchedule(null);
    setHistoryVisited(false);
    setError('');
    if (!scheduleId) return;
    let cancelled = false;
    setLoading(true);
    schedulesApi
      .getById(scheduleId)
      .then((data) => !cancelled && setSchedule(data))
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : 'Failed to load schedule'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [scheduleId]);

  // Keep the header in sync with list actions (run now, delete)
  useEffect(() => subscribeScheduleEvents({
    onSaved: (saved) => setSchedule((prev) => (prev?.id === saved.id ? { ...prev, ...saved } : prev)),
    onDeleted: (id) => id === scheduleId && closeSchedule(),
  }), [scheduleId]);

  const handleSaved = (saved: AgentSchedule) => {
    emitScheduleSaved(saved);
    if (isNew) emitScheduleCreated(saved);
    notifications.show({ color: 'green', message: isNew ? `Schedule "${saved.name}" created` : 'Schedule saved' });
    closeSchedule();
  };

  const handleUpdated = (updated: AgentSchedule) => {
    setSchedule(updated);
    emitScheduleSaved(updated);
  };

  const title = isNew ? (
    <Text fw={600}>New schedule</Text>
  ) : (
    <Group gap="sm" wrap="nowrap">
      <Text fw={600} truncate>{schedule?.name ?? 'Schedule'}</Text>
      {schedule && <ScheduleStateBadge schedule={schedule} />}
    </Group>
  );

  let content;
  if (isNew) {
    content = (
      <ScheduleForm schedule={null} initialAgentId={agentId} workspaceId={workspaceId} onSaved={handleSaved} onUpdated={handleUpdated} onCancel={closeSchedule} />
    );
  } else if (loading) {
    content = <Center py="xl"><Loader /></Center>;
  } else if (error || !schedule) {
    content = (
      <Alert color="red" icon={<IconAlertCircle size={16} />}>{error || 'Schedule not found'}</Alert>
    );
  } else {
    content = (
      <Tabs value={tab} onChange={(v) => setTab((v as ScheduleModalTab) ?? 'settings')}
        // display-none, not the default 'activity': Activity re-runs effects on show, refetching History
        keepMountedMode="display-none"
      >
        <Group justify="space-between" mb="md" wrap="nowrap">
          <Tabs.List>
            <Tabs.Tab value="settings" leftSection={<IconSettings size={16} />}>Settings</Tabs.Tab>
            <Tabs.Tab value="history" leftSection={<IconHistory size={16} />}>History</Tabs.Tab>
          </Tabs.List>
          <Tooltip label="Already running" disabled={canRunNow(schedule)}>
            <Button
              size="xs"
              variant="light"
              leftSection={<IconPlayerPlay size={14} />}
              disabled={!canRunNow(schedule)}
              onClick={() => actions.runNow(schedule)}
            >
              Run now
            </Button>
          </Tooltip>
        </Group>
        <Tabs.Panel value="settings">
          <ScheduleForm schedule={schedule} onSaved={handleSaved} onUpdated={handleUpdated} onCancel={closeSchedule} />
        </Tabs.Panel>
        <Tabs.Panel value="history">
          {historyVisited && <ScheduleHistory scheduleId={schedule.id} />}
        </Tabs.Panel>
      </Tabs>
    );
  }

  return (
    <>
      <Modal
        opened={isOpen}
        onClose={closeSchedule}
        size="xl"
        centered
        fullScreen={isMobile}
        title={title}
        // Fixed height - switching Settings/History (or filling the form) doesn't resize and re-center the modal
        styles={{ title: { minWidth: 0, flex: 1 }, content: isMobile ? undefined : { height: '90dvh' } }}
      >
        {isOpen && content}
      </Modal>
      {actions.modals}
    </>
  );
}
