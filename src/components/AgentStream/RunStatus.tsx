import { ActionIcon, Box, Button, Collapse, Group, Loader, Paper, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconChevronDown, IconChevronUp, IconListDetails } from '@tabler/icons-react';
import { useRunDetailsModal } from '../RunDetailsModal';
import { RunSteps } from './RunSteps';
import type { RunStep } from './useAgentStream';
import classes from './RunStatus.module.css';

interface RunStatusProps {
  statusText?: string;
  runId?: string | null;
  // Inline variant: expandable log of node statuses
  steps?: RunStep[];
  // bubble = chat answer placeholder (run details on hover), inline = compact line for panels
  variant?: 'bubble' | 'inline';
}

// Live status of a running agent answer
export function RunStatus({ statusText, runId, steps, variant = 'inline' }: RunStatusProps) {
  const { openRunDetails } = useRunDetailsModal();
  const [stepsOpen, { toggle: toggleSteps }] = useDisclosure(false);

  if (variant === 'bubble') {
    return (
      <Box style={{ display: 'flex', justifyContent: 'flex-start' }} ms="xs" px="sm" pb="xs">
        <Paper py="xs" px="md" radius="lg" className={classes.bubble}>
          <Group gap="sm" align="center" h="2rem" wrap="nowrap">
            <Loader type="dots" size="xs" className={classes.status} />
            {statusText && (
              <Text size="xs" c="dimmed" className={classes.status}>
                {statusText}
              </Text>
            )}
            {runId && (
              <Button
                size="xs"
                className={classes.runDetails}
                leftSection={<IconListDetails size={12} />}
                style={{ width: '100%' }}
                onClick={() => openRunDetails(runId)}
              >
                Run Details
              </Button>
            )}
          </Group>
        </Paper>
      </Box>
    );
  }

  const hasSteps = !!steps?.length;
  return (
    <Box pb="xs">
      <Group gap={6} wrap="nowrap">
        <Loader size={12} />
        <Text size="xs" c="dimmed" truncate style={{ flex: 1 }}>
          {statusText || 'Thinking...'}
        </Text>
        {hasSteps && (
          <ActionIcon size="xs" variant="subtle" title={stepsOpen ? 'Hide steps' : 'Show steps'} onClick={toggleSteps}>
            {stepsOpen ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
          </ActionIcon>
        )}
        {runId && (
          <ActionIcon size="xs" variant="subtle" title="View run details" onClick={() => openRunDetails(runId)}>
            <IconListDetails size={14} />
          </ActionIcon>
        )}
      </Group>
      {hasSteps && (
        <Collapse expanded={stepsOpen} pt={4}>
          <RunSteps steps={steps} />
        </Collapse>
      )}
    </Box>
  );
}
