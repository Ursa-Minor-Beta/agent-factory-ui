import { Anchor, Box, Group, Text } from '@mantine/core';
import { IconCheck, IconClock, IconPlayerPlay, IconX } from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import type { Run } from '../../types';
import { formatDuration } from '../../types';
import { buildRunDetailsSearch } from './useRunDetailsModal';

type Trail = Parameters<typeof buildRunDetailsSearch>[1];

const statusIcon = (status: Run['status']) =>
  status === 'completed' ? <IconCheck size={12} color="var(--mantine-color-green-6)" /> :
  status === 'failed' ? <IconX size={12} color="var(--mantine-color-red-6)" /> :
  status === 'running' ? <IconPlayerPlay size={12} color="var(--mantine-color-blue-6)" /> :
  <IconClock size={12} color="var(--mantine-color-dimmed)" />;

/** Child runs started by a node (sub-agent node or agent tool call) */
export function getNodeChildRuns(run: Run, nodeId: string): Run[] {
  return run.childRuns?.filter((child) => child.triggeredBy?.nodeId === nodeId) ?? [];
}

/** Compact tree of child runs, shown in the folded node header; a row opens the child run */
export function ChildRunsTree({ runs, trail, depth = 0 }: { runs: Run[]; trail: Trail; depth?: number }) {
  return (
    <Box mt={depth === 0 ? 4 : 0} ml={depth === 0 ? 26 : 16}>
      {runs.map((child, i) => {
        const last = i === runs.length - 1;
        return (
          <Box key={child.id}>
            <Group gap={4} wrap="nowrap">
              <Text size="xs" c="dimmed" ff="monospace">{last ? '└─' : '├─'}</Text>
              <Anchor
                component={Link}
                to={buildRunDetailsSearch(child.id, trail)}
                size="xs"
                truncate
                // Inside the accordion control - don't toggle the node
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
              >
                {child.agentName || child.agentId}
              </Anchor>
              {child.triggeredBy?.toolName && (
                <Text size="xs" c="dimmed" ff="monospace" truncate>{child.triggeredBy.toolName}</Text>
              )}
              {statusIcon(child.status)}
              <Text size="xs" c="dimmed">{formatDuration(child.startedAt, child.completedAt)}</Text>
            </Group>
            {!!child.childRuns?.length && (
              <ChildRunsTree
                runs={child.childRuns}
                trail={[...trail, { id: child.id, name: child.agentName || child.agentId }]}
                depth={depth + 1}
              />
            )}
          </Box>
        );
      })}
    </Box>
  );
}
