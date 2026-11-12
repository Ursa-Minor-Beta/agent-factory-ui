import { useEffect, useState } from 'react';
import { Anchor, Stack, Text } from '@mantine/core';
import { schedulesApi } from '../../api';
import { useScheduleModal } from '../Schedules';
import dayjs, { DATE_TIME_FORMAT } from '../../utils/dayjs';
import { RUN_PARAM, TRAIL_PARAM } from './useRunDetailsModal';

interface ScheduleTriggerInfoProps {
  scheduleId: string;
  scheduledFor: string;
}

// Schedule name (opens the schedule) + when the run was due
export function ScheduleTriggerInfo({ scheduleId, scheduledFor }: ScheduleTriggerInfoProps) {
  const { openSchedule } = useScheduleModal();
  const [name, setName] = useState<string | null>(null);
  const [deleted, setDeleted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    schedulesApi
      .getById(scheduleId)
      .then((s) => !cancelled && setName(s.name))
      .catch(() => !cancelled && setDeleted(true));
    return () => {
      cancelled = true;
    };
  }, [scheduleId]);

  return (
    <Stack gap={0} mt={4}>
      {deleted ? (
        <Text size="sm" c="dimmed">Deleted schedule</Text>
      ) : (
        <Anchor size="sm" onClick={() => openSchedule(scheduleId, 'settings', [RUN_PARAM, TRAIL_PARAM])}>
          {name ?? 'Schedule'}
        </Anchor>
      )}
      <Text size="xs" c="dimmed">Due at {dayjs(scheduledFor).format(DATE_TIME_FORMAT)}</Text>
    </Stack>
  );
}
