import { Badge, Text } from '@mantine/core';
import type { RunTrigger, RunTriggerType } from '../../types';
import { triggerLabels } from '../../types';

const triggerColors: Record<RunTriggerType, string> = {
  chat: 'cyan',
  api: 'grape',
  schedule: 'teal',
  agent_node: 'gray',
  tool_call: 'gray',
};

// What started a run; old runs have no trigger
export function TriggerBadge({ trigger }: { trigger?: RunTrigger }) {
  if (!trigger) return <Text size="sm" c="dimmed">—</Text>;
  return (
    <Badge size="sm" variant="light" color={triggerColors[trigger.triggerType] ?? 'gray'}>
      {triggerLabels[trigger.triggerType] ?? trigger.triggerType}
    </Badge>
  );
}
