import { Badge, Text } from '@mantine/core';
import type { RunTrigger } from '../../types';
import { triggerColors, triggerLabels } from '../../types';

// What started a run; old runs have no trigger
export function TriggerBadge({ trigger }: { trigger?: RunTrigger }) {
  if (!trigger) return <Text size="sm" c="dimmed">—</Text>;
  return (
    <Badge size="sm" variant="light" color={triggerColors[trigger.triggerType] ?? 'gray'}>
      {triggerLabels[trigger.triggerType] ?? trigger.triggerType}
    </Badge>
  );
}
