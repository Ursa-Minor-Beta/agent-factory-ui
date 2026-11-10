import { ActionIcon, Box, Group, Loader, Paper, Text, type PaperProps } from '@mantine/core';
import { IconListDetails } from '@tabler/icons-react';
import { useRunDetailsModal } from '../RunDetailsModal';
import { ToolCallTimeline } from './ToolCalls';
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
      w={toolSteps.length ? '100%' : 'fit-content'}
      bg="light-dark(var(--mantine-color-gray-1), var(--mantine-color-dark-6))"
      {...props}
    >
      {toolSteps.length > 0 && (
        <Box py={8}>
          <ToolCallTimeline
            live
            calls={toolSteps.map(({ tool, status, depth }) => ({
              ...tool!,
              id: tool!.toolCallId,
              status: status === 'completed' || status === 'failed' ? status : 'running',
              depth,
            }))}
          />
        </Box>
      )}
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
    </Paper>
  );
}
