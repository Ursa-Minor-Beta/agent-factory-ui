import { Accordion, Alert, Badge, Card, Group, Stack, Text, Title, Tooltip } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { NodeTypeIcon } from '../../nodes';
import type { NodeState, Run } from '../../types';
import { formatDuration, formatTokens, getNodeUsage, PROVIDER_OPTIONS } from '../../types';
import type { RunTrailItem } from './useRunDetailsModal';
import { RunStatusBadge } from './RunStatusBadge';
import { CopyIconButton } from './CopyIconButton';
import { JsonPanel } from './JsonPanel';
import { ToolCallsTree, getToolCalls } from './ToolCallsTree';
import { ChildRunsTree, getNodeChildRuns } from './ChildRunsTree';

// Started first, not started last
const byStart = ([, a]: [string, NodeState], [, b]: [string, NodeState]) => {
  if (!a.startedAt && !b.startedAt) return 0;
  if (!a.startedAt) return 1;
  if (!b.startedAt) return -1;
  return new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime();
};

function providerLabel(config: NonNullable<NodeState['providerConfig']>) {
  if (!config.provider) return config.name;
  const provider = PROVIDER_OPTIONS.find((p) => p.value === config.provider)?.label ?? config.provider;
  return `${provider} · ${config.name}`;
}

interface NodeStateItemProps {
  run: Run;
  nodeId: string;
  state: NodeState;
  // Trail for child runs opened from this run
  childTrail: RunTrailItem[];
}

function NodeStateItem({ run, nodeId, state, childTrail }: NodeStateItemProps) {
  const usage = getNodeUsage(state);
  const toolCalls = getToolCalls(state.output);
  const childRuns = getNodeChildRuns(run, nodeId);

  return (
    <Accordion.Item value={nodeId}>
      <Accordion.Control>
        <Group gap="sm">
          {!!state.nodeType && (
            <Tooltip label={`Node: ${state.nodeType}`}>
              <NodeTypeIcon type={state.nodeType} size={16} />
            </Tooltip>
          )}
          <RunStatusBadge status={state.status} />
          <Text size="sm" fw={500}>{nodeId}</Text>
          {state.completedAt && state.startedAt && (
            <Badge size="xs" variant="outline" color="gray">
              {formatDuration(state.startedAt, state.completedAt)}
            </Badge>
          )}
          {usage && (
            <Tooltip label={`Input: ${formatTokens(usage.inputTokens)} / Output: ${formatTokens(usage.outputTokens)} tokens`}>
              <Badge size="xs" variant="outline" color="violet">
                {formatTokens(usage.inputTokens)} in · {formatTokens(usage.outputTokens)} out
              </Badge>
            </Tooltip>
          )}
          {state.providerConfig?.name && (
            <Tooltip label="Provider">
              <Badge size="xs" variant="outline" color="cyan">{providerLabel(state.providerConfig)}</Badge>
            </Tooltip>
          )}
        </Group>
        {toolCalls && <ToolCallsTree calls={toolCalls} />}
        {childRuns.length > 0 && <ChildRunsTree runs={childRuns} trail={childTrail} />}
      </Accordion.Control>
      <Accordion.Panel>
        <Stack gap="sm">
          {state.error && (
            <Alert icon={<IconAlertCircle size={14} />} color="red" variant="light" p="xs">
              <Group justify="space-between" wrap="nowrap" gap="xs">
                <Text size="xs" style={{ wordBreak: 'break-word' }}>{state.error}</Text>
                <CopyIconButton value={state.error} label="Copy error" color="red" iconSize={10} />
              </Group>
            </Alert>
          )}
          {state.input !== undefined && <JsonPanel label="INPUT SCHEMA" data={state.input} />}
          {state.output !== undefined && <JsonPanel label="OUTPUT" data={state.output} />}
          {state.state !== undefined && <JsonPanel label="PERSISTED FIELDS" data={state.state} mt="sm" />}
        </Stack>
      </Accordion.Panel>
    </Accordion.Item>
  );
}

export function NodeStatesSection({ run, childTrail }: { run: Run; childTrail: RunTrailItem[] }) {
  const nodes = Object.entries(run.nodeStates).sort(byStart);
  return (
    <Card withBorder padding="md">
      <Title order={5} mb="md">Node Execution ({nodes.length} nodes)</Title>
      <Accordion variant="separated" multiple>
        {nodes.map(([nodeId, state]) => (
          <NodeStateItem key={nodeId} run={run} nodeId={nodeId} state={state} childTrail={childTrail} />
        ))}
      </Accordion>
    </Card>
  );
}
