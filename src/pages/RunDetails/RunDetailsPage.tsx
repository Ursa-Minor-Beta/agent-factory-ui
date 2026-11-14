import { Accordion, ActionIcon, Alert, Anchor, Box, Breadcrumbs, Card, Center, Group, Loader, ScrollArea, Stack, Text, Title, Tooltip } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { useState } from 'react';
import { IconAlertCircle, IconChevronsDown, IconChevronsUp, IconPlayerStop, IconRefresh } from '@tabler/icons-react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { routes } from '../../config/routes';
import {
  CopyIconButton,
  NodeStateItem,
  RunInputOutput,
  RunStatusBadge,
  RunSummaryCard,
  toJson,
} from '../../components/RunDetailsModal';
import { RunTree, collectRunIds, findRun, parseSelection } from './RunTree';
import { useRunTree } from './useRunTree';

export function RunDetailsPage() {
  const { runId = '' } = useParams<{ runId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { run, loading, error, cancelling, refresh, cancel } = useRunTree(runId);

  const select = searchParams.get('select') || runId;
  const selection = parseSelection(select, runId);
  const selectedRun = run ? findRun(run, selection.runId) ?? run : null;
  const selectedNode = selection.nodeId && selectedRun ? selectedRun.nodeStates[selection.nodeId] : undefined;

  const onSelect = (key: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('select', key);
    setSearchParams(params, { replace: true });
  };

  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const toggleRun = (id: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  };

  const active = run && (run.status === 'pending' || run.status === 'running');

  return (
    <Stack gap="md" p={isMobile ? 'xs' : 'md'}>
      <Group gap="sm">
        <Breadcrumbs separatorMargin={6}>
          <Anchor component={Link} to={routes.runs()} size="sm">Runs</Anchor>
          <Text fw={600}>{run ? run.agentName || run.agentId : 'Run Details'}</Text>
        </Breadcrumbs>
        {run && (
          <>
            <RunStatusBadge status={run.status} size="md" withIcon={false} />
            {active && (
              <Tooltip label="Stop">
                <ActionIcon variant="subtle" size="sm" color="red" onClick={cancel} loading={cancelling}>
                  <IconPlayerStop size={16} />
                </ActionIcon>
              </Tooltip>
            )}
            <Tooltip label="Refresh">
              <ActionIcon variant="subtle" size="sm" onClick={refresh} loading={loading}>
                <IconRefresh size={16} />
              </ActionIcon>
            </Tooltip>
            <CopyIconButton value={toJson(run)} label="Copy entire run" size="sm" iconSize={16} />
          </>
        )}
      </Group>

      {error ? (
        <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">{error}</Alert>
      ) : !run || !selectedRun ? (
        <Center py="xl"><Loader /></Center>
      ) : (
        <Box
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'minmax(280px, 380px) 1fr',
            gap: 'var(--mantine-spacing-md)',
            alignItems: 'start',
          }}
        >
          <Card withBorder radius="lg" padding="xs" style={isMobile ? undefined : { position: 'sticky', top: 16 }}>
            <ScrollArea.Autosize mah={isMobile ? 360 : 'calc(100vh - 160px)'}>
              <Group gap={4} mb={4}>
                <Tooltip label="Expand all">
                  <ActionIcon variant="subtle" size="sm" onClick={() => setCollapsedIds(new Set())}>
                    <IconChevronsDown size={14} />
                  </ActionIcon>
                </Tooltip>
                <Tooltip label="Collapse all">
                  {/* The root stays open - its nodes and child run headers are visible */}
                  <ActionIcon variant="subtle" size="sm" onClick={() => setCollapsedIds(new Set(collectRunIds(run).slice(1)))}>
                    <IconChevronsUp size={14} />
                  </ActionIcon>
                </Tooltip>
              </Group>
              <RunTree run={run} selected={select} onSelect={onSelect} collapsedIds={collapsedIds} onToggle={toggleRun} />
            </ScrollArea.Autosize>
          </Card>

          <Stack gap="lg" miw={0}>
            {selectedNode && selection.nodeId ? (
              <Card withBorder radius="lg" padding="md">
                <Title order={5} mb="md">
                  {selectedRun.agentName || selectedRun.agentId} · {selection.nodeId}
                </Title>
                <Accordion variant="separated" value={selection.nodeId}>
                  <NodeStateItem run={selectedRun} nodeId={selection.nodeId} state={selectedNode} childTrail={[]} />
                </Accordion>
              </Card>
            ) : (
              <>
                <Group gap="sm">
                  <Title order={5}>{selectedRun.agentName || selectedRun.agentId}</Title>
                  <RunStatusBadge status={selectedRun.status} />
                </Group>
                <RunSummaryCard run={selectedRun} />
                <RunInputOutput run={selectedRun} />
              </>
            )}
          </Stack>
        </Box>
      )}
    </Stack>
  );
}
