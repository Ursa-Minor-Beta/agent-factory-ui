import { ScrollArea, Stack, Text } from '@mantine/core';
import { ToolCallRow } from './ToolCalls';
import type { RunStep } from './useAgentStream';

// Live tool call step
export function ToolCallStep({ step }: { step: RunStep }) {
  const { name, label, toolType, durationMs, error } = step.tool!;
  return (
    <ToolCallRow
      name={name}
      label={step.status === 'running' ? undefined : label}
      status={step.status === 'completed' || step.status === 'failed' ? step.status : 'running'}
      toolType={toolType}
      depth={step.depth}
      durationMs={durationMs}
      error={error}
    />
  );
}

// Log of node statuses and tool calls of a run, sub-agent steps indented by depth
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
        {steps.map((step, i) =>
          step.tool ? (
            <ToolCallStep key={step.tool.toolCallId} step={step} />
          ) : (
            <Text key={i} size="xs" c="dimmed" pl={step.depth * 12} truncate>
              {step.depth > 0 && '↳ '}{step.label}: {step.statusText || step.status}
            </Text>
          )
        )}
      </Stack>
    </ScrollArea.Autosize>
  );
}
