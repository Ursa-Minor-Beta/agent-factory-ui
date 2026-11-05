import { ActionIcon, Group, Loader, Paper, Stack, Text, type PaperProps } from '@mantine/core';
import { IconListDetails } from '@tabler/icons-react';
import { useRunDetailsModal } from '../RunDetailsModal';
import { ToolCallStep } from './RunSteps';
import type { RunStep } from './useAgentStream';

interface RunStatusProps extends PaperProps {
  statusText?: string;
  runId?: string | null;
  // Tool call steps are listed under the status
  steps?: RunStep[];
}

// Live status of a running agent answer: latest status, tool calls, run details - same look in every chat
export function RunStatus({ statusText, runId, steps, ...props }: RunStatusProps) {
  const { openRunDetails } = useRunDetailsModal();
  const toolSteps = steps?.filter((step) => step.tool) ?? [];

  return (
    <Paper
      py="xs"
      px="md"
      radius="lg"
      miw={180}
      maw="90%"
      w="fit-content"
      bg="light-dark(var(--mantine-color-gray-1), var(--mantine-color-dark-6))"
      {...props}
    >
      <Group gap="sm" wrap="nowrap" mih="1.5rem">
        <Loader type="dots" size="xs" />
        <Text size="xs" c="dimmed" truncate style={{ flex: 1 }}>
          {statusText || 'Thinking...'}
        </Text>
        {runId && (
          <ActionIcon size="xs" variant="subtle" title="View run details" onClick={() => openRunDetails(runId)}>
            <IconListDetails size={14} />
          </ActionIcon>
        )}
      </Group>
      {toolSteps.length > 0 && (
        <Stack gap={2} pt={4}>
          {toolSteps.map((step) => <ToolCallStep key={step.tool!.toolCallId} step={step} />)}
        </Stack>
      )}
    </Paper>
  );
}
