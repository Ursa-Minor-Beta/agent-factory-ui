import { Button, Card, Stack, Text } from '@mantine/core';
import { IconCalendarTime, IconPlus } from '@tabler/icons-react';

interface SchedulesEmptyProps {
  compact?: boolean;
  onNew: () => void;
}

export function SchedulesEmpty({ compact, onNew }: SchedulesEmptyProps) {
  return (
    <Card withBorder radius="lg" p={compact ? 'md' : 'xl'}>
      <Stack align="center" gap="sm">
        <IconCalendarTime size={36} stroke={1.5} style={{ color: 'var(--mantine-color-dimmed)' }} />
        <Text fw={500}>No schedules yet</Text>
        <Text size="sm" c="dimmed" ta="center" maw={420}>
          Schedules run agents automatically: on a repeating calendar, once at a set time, or every N minutes.
        </Text>
        <Button leftSection={<IconPlus size={16} />} onClick={onNew} size={compact ? 'xs' : 'sm'}>
          New schedule
        </Button>
      </Stack>
    </Card>
  );
}
