import { useState, useEffect, useCallback, useRef } from 'react';
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
  Switch,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
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
  IconPlayerStop,
} from '@tabler/icons-react';
import { runsApi } from '../../api';
import type { ListRunsParams } from '../../api/runs';
import type { RunSummary, RunStatus } from '../../types';
import { useRunDetailsModal } from '../../components/RunDetailsModal';
import { statusColors, formatDuration } from '../../types';

const statusIcons: Record<RunStatus, React.ReactNode> = {
  pending: <IconClock size={14} />,
  running: <IconPlayerPlay size={14} />,
  completed: <IconCheck size={14} />,
  failed: <IconX size={14} />,
  cancelling: <IconClock size={14} />,
  cancelled: <IconPlayerStop size={14} />,
};

const PAGE_SIZE = 20;

export function RunsPage() {
  const { runId, openRunDetails } = useRunDetailsModal();
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastViewedRunId, setLastViewedRunId] = useState<string | null>(null);
  const prevRunIdRef = useRef<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [agentFilter, setAgentFilter] = useState('');
  const [startedAfter, setStartedAfter] = useState<Date | null>(null);
  const [startedBefore, setStartedBefore] = useState<Date | null>(null);
  const [sortBy, setSortBy] = useState<'startedAt' | 'completedAt'>('startedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [includeChildren, setIncludeChildren] = useState(() => {
    const saved = localStorage.getItem('runs-includeChildren');
    return saved !== null ? saved === 'true' : true;
  });

  const loadRuns = useCallback(async () => {
    try {
      setLoading(true);
      const params: ListRunsParams = {
        sortBy,
        sortOrder,
        skip: (page - 1) * PAGE_SIZE,
        limit: PAGE_SIZE,
        includeChildren,
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
  }, [statusFilter, agentFilter, startedAfter, startedBefore, sortBy, sortOrder, page, includeChildren]);

  useEffect(() => {
    loadRuns();
  }, [statusFilter, startedAfter, startedBefore, sortBy, sortOrder, page, includeChildren]);

  useEffect(() => {
    localStorage.setItem('runs-includeChildren', String(includeChildren));
  }, [includeChildren]);

  // Track last viewed run when modal closes
  useEffect(() => {
    if (runId) {
      // Modal is open, store the runId and clear the highlight
      prevRunIdRef.current = runId;
      setLastViewedRunId(null);
    }
     else if (!runId && prevRunIdRef.current) {
      // Modal just closed, highlight the last viewed run
      setLastViewedRunId(prevRunIdRef.current);
      // Clear after a few seconds
      const timeout = setTimeout(() => setLastViewedRunId(null), 3000);
      return () => clearTimeout(timeout);
    }
  }, [runId]);

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
            { value: 'cancelling', label: 'Cancelling' },
            { value: 'cancelled', label: 'Cancelled' },
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
        <Switch
          label="Collect by parent"
          checked={includeChildren}
          onChange={(e) => setIncludeChildren(e.currentTarget.checked)}
          size="sm"
        />
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
                {includeChildren && <Table.Th>Child Runs</Table.Th>}
                {!includeChildren && <Table.Th>Triggered by</Table.Th>}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {runs.map((run) => {
                const isLastViewed = run.id === lastViewedRunId;
                return (
                  <Table.Tr
                    key={run.id}
                    style={{
                      cursor: 'pointer',
                      backgroundColor: isLastViewed ? 'var(--mantine-color-cyan-light)' : undefined,
                      transition: 'background-color 0.3s ease',
                    }}
                    onClick={() => openRunDetails(run.id)}
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
                  {includeChildren && (
                    <Table.Td>
                      {run.childRunIds && run.childRunIds.length > 0 && (
                        <Badge size="sm" variant="light" color="cyan">
                          {run.childRunIds.length}
                        </Badge>
                      )}
                    </Table.Td>
                  )}
                  {!includeChildren && (
                    <Table.Td>
                      {run.triggeredBy && (
                        <Text size="sm" c="dimmed">
                          {run.triggeredBy.triggerType}
                        </Text>
                      )}
                    </Table.Td>
                  )}
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
    </Box>
  );
}
