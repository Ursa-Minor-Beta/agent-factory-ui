import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Text,
  Card,
  Group,
  Loader,
  Alert,
  Table,
  Center,
  Badge,
  Select,
  Button,
  Pagination,
  ActionIcon,
  Tooltip,
  TextInput,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { useDisclosure } from '@mantine/hooks';
import {
  IconAlertCircle,
  IconClock,
  IconCheck,
  IconX,
  IconPlayerPlay,
  IconRefresh,
  IconSortAscending,
  IconSortDescending,
  IconRobot,
} from '@tabler/icons-react';
import { runsApi } from '../../api';
import type { ListRunsParams } from '../../api/runs';
import type { Run, RunStatus } from '../../types';
import { RunDetailsModal } from '../../components/RunDetailsModal';
import { statusColors, formatDuration } from '../../types';

const statusIcons: Record<RunStatus, React.ReactNode> = {
  pending: <IconClock size={14} />,
  running: <IconPlayerPlay size={14} />,
  completed: <IconCheck size={14} />,
  failed: <IconX size={14} />,
};

const PAGE_SIZE = 20;

export function RunsPage() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedRun, setSelectedRun] = useState<Run | null>(null);
  const [detailsOpened, { open: openDetails, close: closeDetails }] = useDisclosure(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [agentFilter, setAgentFilter] = useState('');
  const [startedAfter, setStartedAfter] = useState<Date | null>(null);
  const [startedBefore, setStartedBefore] = useState<Date | null>(null);
  const [sortBy, setSortBy] = useState<'startedAt' | 'completedAt'>('startedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);

  const loadRuns = useCallback(async () => {
    try {
      setLoading(true);
      const params: ListRunsParams = {
        sortBy,
        sortOrder,
        skip: (page - 1) * PAGE_SIZE,
        limit: PAGE_SIZE,
      };
      if (statusFilter) params.status = statusFilter as RunStatus;
      if (agentFilter.trim()) params.agentId = agentFilter.trim();
      if (startedAfter) params.startedAfter = startedAfter.toISOString();
      if (startedBefore) params.startedBefore = startedBefore.toISOString();

      const response = await runsApi.listAll(params);
      setRuns(response.runs);
      setTotal(response.total);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load runs');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, agentFilter, startedAfter, startedBefore, sortBy, sortOrder, page]);

  useEffect(() => {
    loadRuns();
  }, [statusFilter, startedAfter, startedBefore, sortBy, sortOrder, page]);

  const handleViewDetails = (run: Run) => {
    setSelectedRun(run);
    openDetails();
  };

  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
  };

  const handleClearFilters = () => {
    setStatusFilter(null);
    setAgentFilter('');
    setStartedAfter(null);
    setStartedBefore(null);
    setPage(1);
  };

  const hasFilters = statusFilter || agentFilter.trim() || startedAfter || startedBefore;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <Box>
      <Text c="dimmed" size="sm" mb="md">
        View execution history and debug agent runs
      </Text>

      {/* Filters Row */}
      <Group mb="md" gap="sm" wrap="wrap">
        <Select
          placeholder="Status"
          value={statusFilter}
          onChange={(val) => setStatusFilter(val)}
          data={[
            { value: 'pending', label: 'Pending' },
            { value: 'running', label: 'Running' },
            { value: 'completed', label: 'Completed' },
            { value: 'failed', label: 'Failed' },
          ]}
          clearable
          style={{ width: 140 }}
        />
        <TextInput
          placeholder="Agent ID"
          value={agentFilter}
          onChange={(e) => setAgentFilter(e.currentTarget.value)}
          onBlur={loadRuns}
          onKeyDown={(e) => e.key === 'Enter' && loadRuns()}
          leftSection={<IconRobot size={16} />}
          style={{ width: 200 }}
        />
        <DatePickerInput
          placeholder="Started after"
          value={startedAfter}
          onChange={(val) => setStartedAfter(val ? new Date(val) : null)}
          clearable
          style={{ width: 150 }}
        />
        <DatePickerInput
          placeholder="Started before"
          value={startedBefore}
          onChange={(val) => setStartedBefore(val ? new Date(val) : null)}
          clearable
          style={{ width: 150 }}
        />
        <Select
          value={sortBy}
          onChange={(val) => setSortBy(val as 'startedAt' | 'completedAt')}
          data={[
            { value: 'startedAt', label: 'Started' },
            { value: 'completedAt', label: 'Completed' },
          ]}
          style={{ width: 120 }}
        />
        <Tooltip label={sortOrder === 'desc' ? 'Newest first' : 'Oldest first'}>
          <ActionIcon variant="light" onClick={toggleSortOrder}>
            {sortOrder === 'desc' ? <IconSortDescending size={18} /> : <IconSortAscending size={18} />}
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Refresh">
          <ActionIcon variant="light" onClick={loadRuns} loading={loading}>
            <IconRefresh size={18} />
          </ActionIcon>
        </Tooltip>
        {hasFilters && (
          <Button variant="subtle" size="xs" onClick={handleClearFilters}>
            Clear filters
          </Button>
        )}
      </Group>

      {error && (
        <Alert
          icon={<IconAlertCircle size={16} />}
          color="red"
          mb="md"
          withCloseButton
          onClose={() => setError('')}
        >
          {error}
        </Alert>
      )}

      <Card withBorder>
        {loading ? (
          <Center py="xl">
            <Loader />
          </Center>
        ) : (
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Status</Table.Th>
                <Table.Th>Agent ID</Table.Th>
                <Table.Th>Started</Table.Th>
                <Table.Th>Duration</Table.Th>
                <Table.Th>Nodes</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {runs.map((run) => {
                const nodeStates = Object.values(run.nodeStates);
                const completedNodes = nodeStates.filter((n) => n.status === 'completed').length;
                const failedNodes = nodeStates.filter((n) => n.status === 'failed').length;

                return (
                  <Table.Tr
                    key={run.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleViewDetails(run)}
                  >
                    <Table.Td>
                      <Badge
                        color={statusColors[run.status]}
                        variant="light"
                        leftSection={statusIcons[run.status]}
                      >
                        {run.status}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" ff="monospace">{run.agentId}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed">
                        {new Date(run.startedAt).toLocaleString()}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed">
                        {formatDuration(run.startedAt, run.completedAt)}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap={4}>
                        <Badge size="sm" color="green" variant="light">
                          {completedNodes}
                        </Badge>
                        {failedNodes > 0 && (
                          <Badge size="sm" color="red" variant="light">
                            {failedNodes}
                          </Badge>
                        )}
                        <Text size="xs" c="dimmed">
                          / {nodeStates.length}
                        </Text>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
              {runs.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={5}>
                    <Text ta="center" c="dimmed" py="md">
                      {total === 0 ? 'No runs yet' : 'No runs match your filters'}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        )}
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <Group justify="space-between" mt="md">
          <Text size="sm" c="dimmed">
            Showing {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, total)} of {total} runs
          </Text>
          <Pagination value={page} onChange={setPage} total={totalPages} />
        </Group>
      )}

      <RunDetailsModal
        run={selectedRun}
        opened={detailsOpened}
        onClose={closeDetails}
      />
    </Box>
  );
}
