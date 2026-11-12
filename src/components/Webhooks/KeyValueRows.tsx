import { ActionIcon, Button, Group, Stack, Text, TextInput } from '@mantine/core';
import { IconPlus, IconTrash } from '@tabler/icons-react';

export type KeyValueRow = { key: string; value: string };

export const rowsToRecord = (rows: KeyValueRow[]) =>
  Object.fromEntries(rows.filter((r) => r.key.trim()).map((r) => [r.key.trim(), r.value]));

interface KeyValueRowsProps {
  label: string;
  rows: KeyValueRow[];
  onChange: (rows: KeyValueRow[]) => void;
}

export function KeyValueRows({ label, rows, onChange }: KeyValueRowsProps) {
  const update = (index: number, patch: Partial<KeyValueRow>) =>
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  return (
    <Stack gap={4}>
      <Group justify="space-between">
        <Text size="xs" c="dimmed" tt="uppercase" fw={500}>{label}</Text>
        <Button size="compact-xs" variant="subtle" leftSection={<IconPlus size={12} />} onClick={() => onChange([...rows, { key: '', value: '' }])}>
          Add
        </Button>
      </Group>
      {rows.map((row, i) => (
        <Group key={i} gap={4} wrap="nowrap">
          <TextInput size="xs" placeholder="Key" value={row.key} onChange={(e) => update(i, { key: e.currentTarget.value })} style={{ flex: 1 }} />
          <TextInput size="xs" placeholder="Value" value={row.value} onChange={(e) => update(i, { value: e.currentTarget.value })} style={{ flex: 2 }} />
          <ActionIcon variant="subtle" color="red" size="sm" onClick={() => onChange(rows.filter((_, j) => j !== i))} aria-label="Remove">
            <IconTrash size={14} />
          </ActionIcon>
        </Group>
      ))}
    </Stack>
  );
}
