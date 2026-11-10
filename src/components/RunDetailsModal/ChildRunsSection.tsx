import { Link } from 'react-router-dom';
import { Accordion, ActionIcon, Alert, Badge, Card, Group, SimpleGrid, Stack, Text, Title, Tooltip } from '@mantine/core';
import { IconAlertCircle, IconExternalLink, IconSubtask } from '@tabler/icons-react';
import type { Run } from '../../types';
import { formatDuration, getTriggerNodeId, triggerLabels } from '../../types';
import { buildRunDetailsSearch, type RunTrailItem } from './useRunDetailsModal';
import { RunStatusBadge } from './RunStatusBadge';
import { JsonPanel } from './JsonPanel';

function ChildRunItem({ childRun, childTrail }: { childRun: Run; childTrail: RunTrailItem[] }) {
  return (
    <Accordion.Item value={childRun.id}>
      <Accordion.Control>
        <Group gap="sm">
          <Tooltip label="View full details">
            <ActionIcon
              component={Link}
              to={buildRunDetailsSearch(childRun.id, childTrail)}
              variant="subtle"
              size="sm"
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
              <IconExternalLink size={14} />
            </ActionIcon>
          </Tooltip>
          <RunStatusBadge status={childRun.status} />
          <Text size="sm" fw={500} ff="monospace">{childRun.agentId}</Text>
          {childRun.triggeredBy && (
            <Badge size="xs" variant="outline" color="gray">
              {triggerLabels[childRun.triggeredBy.triggerType]}
              {getTriggerNodeId(childRun.triggeredBy) && `: ${getTriggerNodeId(childRun.triggeredBy)}`}
            </Badge>
          )}
          <Badge size="xs" variant="outline" color="gray">
            {formatDuration(childRun.startedAt, childRun.completedAt)}
          </Badge>
        </Group>
      </Accordion.Control>
      <Accordion.Panel>
        <Stack gap="sm">
          {childRun.error && (
            <Alert icon={<IconAlertCircle size={14} />} color="red" variant="light" p="xs">
              <Text size="xs" style={{ wordBreak: 'break-word' }}>{childRun.error}</Text>
            </Alert>
          )}
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
            <JsonPanel label="INPUT" data={childRun.input} maxHeight={150} />
            {childRun.output && <JsonPanel label="OUTPUT" data={childRun.output} maxHeight={150} />}
          </SimpleGrid>
        </Stack>
      </Accordion.Panel>
    </Accordion.Item>
  );
}

export function ChildRunsSection({ childRuns, childTrail }: { childRuns: Run[]; childTrail: RunTrailItem[] }) {
  return (
    <Card withBorder padding="md">
      <Title order={5} mb="md">
        <Group gap="xs">
          <IconSubtask size={18} />
          Child Runs ({childRuns.length})
        </Group>
      </Title>
      <Accordion variant="separated" multiple>
        {childRuns.map((childRun) => (
          <ChildRunItem key={childRun.id} childRun={childRun} childTrail={childTrail} />
        ))}
      </Accordion>
    </Card>
  );
}
