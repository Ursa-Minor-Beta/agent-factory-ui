import { useMemo, type ReactNode } from 'react';
import { Alert, Box, Card, Code, Group, Paper, ScrollArea, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import type { Run } from '../../types';
import { formatDuration, formatTokens, getTriggerNodeId, getTriggerToolName, getTriggerWebhookId, triggerLabels, getRunProviderNames, getRunUsage, resolveRunOutput } from '../../types';
import { CopyIconButton, toJson } from './CopyIconButton';
import { DataWithFileRefs } from './utils';
import { TriggerBadge } from './TriggerBadge';
import { ScheduleTriggerInfo } from './ScheduleTriggerInfo';

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Box>
      <Text size="xs" c="dimmed" tt="uppercase" fw={500}>{label}</Text>
      {children}
    </Box>
  );
}

// Agent, timing, tokens, ids, parent trigger + run error
export function RunSummaryCard({ run }: { run: Run }) {
  const usage = useMemo(() => getRunUsage(run), [run]);
  const providers = useMemo(() => getRunProviderNames(run), [run]);

  return (
    <>
      <Card withBorder padding="md">
        <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="lg">
          <Field label="Agent ID">
            <Group gap="xs">
              <Code fz="xs">{run.agentId}</Code>
              <CopyIconButton value={run.agentId} />
            </Group>
          </Field>
          <Field label="Started">
            <Text size="sm">{new Date(run.startedAt).toLocaleString()}</Text>
          </Field>
          <Field label="Duration">
            <Text size="sm">{formatDuration(run.startedAt, run.completedAt)}</Text>
          </Field>
          {usage && (
            <Field label="Token Usage">
              <Text size="sm">
                {formatTokens(usage.inputTokens)} in · {formatTokens(usage.outputTokens)} out
              </Text>
              <Text size="xs" c="dimmed">{formatTokens(usage.inputTokens + usage.outputTokens)} total</Text>
              {providers.length > 0 && <Text size="xs" c="dimmed">{providers.join(', ')}</Text>}
            </Field>
          )}
          <Field label="Run ID">
            <Group gap="xs">
              <Code fz="xs">{run.id.slice(0, 12)}...</Code>
              <CopyIconButton value={run.id} />
            </Group>
          </Field>
          <Field label="Trigger">
            <Box mt={4}><TriggerBadge trigger={run.triggeredBy} /></Box>
            {run.triggeredBy?.triggerType === 'schedule' && (
              <ScheduleTriggerInfo scheduleId={run.triggeredBy.scheduleId} scheduledFor={run.triggeredBy.scheduledFor} />
            )}
          </Field>
          {run.triggeredBy && run.parentRunId && (
            <Field label="Triggered by">
              <Stack gap={0} mt={4}>
                <Code fz="xs">Trigger Type: {triggerLabels[run.triggeredBy.triggerType] ?? run.triggeredBy.triggerType}</Code>
                <Code fz="xs">Parent Run Id: {run.parentRunId}</Code>
                {getTriggerNodeId(run.triggeredBy) && <Code fz="xs">Node Id: {getTriggerNodeId(run.triggeredBy)}</Code>}
                {getTriggerWebhookId(run.triggeredBy) && <Code fz="xs">Webhook Id: {getTriggerWebhookId(run.triggeredBy)}</Code>}
                {getTriggerToolName(run.triggeredBy) && <Code fz="xs">Tool Name: {getTriggerToolName(run.triggeredBy)}</Code>}
              </Stack>
            </Field>
          )}
        </SimpleGrid>
      </Card>

      {run.error && (
        <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">
          <Group justify="space-between" wrap="nowrap" gap="xs">
            <Text style={{ wordBreak: 'break-word' }}>{run.error}</Text>
            <CopyIconButton value={run.error} label="Copy error" color="red" />
          </Group>
        </Alert>
      )}
    </>
  );
}

function DataCard({ title, copyValue, maxHeight, children }: { title: string; copyValue?: unknown; maxHeight: number; children: ReactNode }) {
  return (
    <Card withBorder padding="md">
      <Group justify="space-between" mb="sm">
        <Title order={5}>{title}</Title>
        {copyValue !== undefined && <CopyIconButton value={toJson(copyValue)} size="sm" iconSize={14} />}
      </Group>
      <Paper p="xs" radius="sm" style={{ backgroundColor: 'var(--mantine-color-default)' }}>
        <ScrollArea.Autosize mah={maxHeight}>{children}</ScrollArea.Autosize>
      </Paper>
    </Card>
  );
}

// Run input + output (nodeRef references resolved)
export function RunInputOutput({ run }: { run: Run }) {
  const output = useMemo(() => resolveRunOutput(run), [run]);
  const hasOutput = !!output && Object.keys(output).length > 0;

  return (
    <Stack gap="md">
      <DataCard title="Input" copyValue={run.input} maxHeight={200}>
        <Code block style={{ backgroundColor: 'transparent', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {toJson(run.input)}
        </Code>
      </DataCard>
      <DataCard title="Output" copyValue={hasOutput ? output : undefined} maxHeight={300}>
        {hasOutput ? (
          <DataWithFileRefs data={output} />
        ) : (
          <Text size="sm" c="dimmed" ta="center" py="md">No output yet</Text>
        )}
      </DataCard>
    </Stack>
  );
}
