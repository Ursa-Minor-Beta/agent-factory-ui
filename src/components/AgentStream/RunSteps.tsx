import { ScrollArea, Stack, Text } from '@mantine/core';
import type { RunStep } from './useAgentStream';

// Log of node statuses of a run, sub-agent nodes indented by depth
export function RunSteps({ steps, maxHeight = 80 }: { steps: RunStep[]; maxHeight?: number }) {
  if (!steps.length) return null;
  return (
    <ScrollArea.Autosize
      mah={maxHeight}
      offsetScrollbars
      scrollbars="y"
      styles={{ content: { display: 'block', minWidth: 0 } }}
      mb="xs"
      ps="xs"
      style={{ border: '1px solid var(--mantine-color-default-border)', borderRadius: 'var(--mantine-radius-sm)' }}
    >
      <Stack gap={2}>
        {steps.map((step, i) => (
          <Text key={i} size="xs" c="dimmed" pl={step.depth * 12} truncate>
            {step.depth > 0 && '↳ '}{step.label}: {step.statusText || step.status}
          </Text>
        ))}
      </Stack>
    </ScrollArea.Autosize>
  );
}
