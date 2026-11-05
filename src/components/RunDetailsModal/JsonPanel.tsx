import { Group, Paper, ScrollArea, Text, type PaperProps } from '@mantine/core';
import { CopyIconButton, toJson } from './CopyIconButton';
import { DataWithFileRefs } from './utils';

interface JsonPanelProps extends PaperProps {
  label: string;
  data: unknown;
  maxHeight?: number;
}

// Labeled data block with copy - node / child run input, output, state
export function JsonPanel({ label, data, maxHeight = 200, ...props }: JsonPanelProps) {
  return (
    <Paper p="xs" radius="sm" withBorder {...props}>
      <Group justify="space-between" mb={4}>
        <Text size="xs" c="dimmed" fw={500}>{label}</Text>
        <CopyIconButton value={toJson(data)} />
      </Group>
      <ScrollArea.Autosize mah={maxHeight}>
        <DataWithFileRefs data={data} />
      </ScrollArea.Autosize>
    </Paper>
  );
}
