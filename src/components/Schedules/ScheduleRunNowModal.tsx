import { Button, Group, Modal, Stack, Text } from '@mantine/core';
import { IconPlayerPlay } from '@tabler/icons-react';
import type { AgentSchedule } from '../../types';

interface ScheduleRunNowModalProps {
  schedule: AgentSchedule | null;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}

export function ScheduleRunNowModal({ schedule, onClose, onConfirm, loading }: ScheduleRunNowModalProps) {
  return (
    <Modal opened={!!schedule} onClose={onClose} title="Run now" size="sm" centered>
      <Stack>
        <Text size="sm">
          Run <b>{schedule?.name}</b> now with its saved input? The regular schedule is not affected.
        </Text>
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>Cancel</Button>
          <Button leftSection={<IconPlayerPlay size={16} />} onClick={onConfirm} loading={loading}>
            Run now
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
