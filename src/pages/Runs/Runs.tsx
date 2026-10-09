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
  Checkbox,
  Paper,
  Transition,
  CopyButton,
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
  IconTrash,
  IconSquareCheck,
  IconCopy,
} from '@tabler/icons-react';
import { runsApi } from '../../api';
import type { ListRunsParams } from '../../api/runs';
import type { RunSummary, RunStatus } from '../../types';
import { useRunDetailsModal } from '../../components/RunDetailsModal';
import { statusColors, formatDuration } from '../../types';
import { DeleteRunsModal } from './DeleteRunsModal';

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

  // Selection and deletion
  const [selectedRunIds, setSelectedRunIds] = useState<Set<string>>(new Set());
  const [deleteModalOpened, setDeleteModalOpened] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [runToDelete, setRunToDelete] = useState<string | null>(null);
  const [deleteByAgentIds, setDeleteByAgentIds] = useState<string[]>([]);

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

  // Clear selection when runs list changes
  useEffect(() => {
    setSelectedRunIds(new Set());
  }, [page, statusFilter, agentFilter, startedAfter, startedBefore, sortBy, sortOrder, includeChildren]);

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

  // Selection handlers
  const handleToggleAll = () => {
    if (selectedRunIds.size === runs.length) {
      setSelectedRunIds(new Set());
    } else {
      setSelectedRunIds(new Set(runs.map((run) => run.id)));
    }
  };

  const handleToggleRun = (runId: string) => {
    setSelectedRunIds((prev) => {
      const next = new Set(prev);
      if (next.has(runId)) {
        next.delete(runId);
      } else {
        next.add(runId);
      }
      return next;
    });
  };

  // Delete handlers
  const handleDeleteClick = () => {
    if (selectedRunIds.size > 0) {
      setDeleteModalOpened(true);
    }
  };

  const handleDeleteAllForAgents = () => {
    if (selectedRunIds.size > 0) {
      // Get unique agent IDs from selected runs
      const agentIds = Array.from(
        new Set(
          runs
            .filter((run) => selectedRunIds.has(run.id))
            .map((run) => run.agentId)
        )
      );
      setDeleteByAgentIds(agentIds);
      setDeleteModalOpened(true);
    }
  };

  const handleDeleteSingleRun = (runId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setRunToDelete(runId);
    setDeleteModalOpened(true);
  };

  const handleConfirmDelete = async () => {
    try {
      setDeleting(true);

      // Determine what to delete
      if (deleteByAgentIds.length > 0) {
        // Delete all runs for these agents
        await runsApi.deleteRuns({ agentId: deleteByAgentIds });
        // Reload runs since we don't know exact count deleted
        await loadRuns();
      } else {
        // Delete specific runs
        const idsToDelete = runToDelete
          ? [runToDelete]
          : Array.from(selectedRunIds);

        await runsApi.deleteRuns({ id: idsToDelete });

        // Optimistic update - remove deleted runs from the list
        const deletedSet = new Set(idsToDelete);
        setRuns((prev) => prev.filter((run) => !deletedSet.has(run.id)));
        setTotal((prev) => prev - idsToDelete.length);
      }

      // Clear states
      setSelectedRunIds(new Set());
      setRunToDelete(null);
      setDeleteByAgentIds([]);
      setDeleteModalOpened(false);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete runs');
    } finally {
      setDeleting(false);
    }
  };

  const handleCloseDeleteModal = () => {
    setDeleteModalOpened(false);
    setRunToDelete(null);
    setDeleteByAgentIds([]);
  };

  const hasFilters = statusFilter || agentFilter.trim() || startedAfter || startedBefore;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const allSelected = runs.length > 0 && selectedRunIds.size === runs.length;

  return (
    <Box>
      <Text c="dimmed" size="sm" mb="md">
        View execution history and debug agent runs
      </Text>

      {/* Filters Row */}
      <Box style={{ position: 'relative' }}>
        {/* Bulk actions bar - overlays filters */}
        <Transition mounted={selectedRunIds.size > 0} transition="slide-down" duration={200}>
          {(styles) => (
            <Paper
              withBorder
              p="md"
              mb="md"
              radius="md"
              // bg="cyan.0"
              style={{
                ...styles,
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                zIndex: 10,
                borderColor: 'var(--mantine-color-cyan-6)',
              }}
            >
              <Group justify="space-between" wrap="nowrap">
                <Group gap="xs">
                  <IconSquareCheck size={20} style={{ color: 'var(--mantine-color-cyan-6)' }} />
                  <div>
                    <Text size="sm" fw={600} c="cyan.9">
                      {selectedRunIds.size} {selectedRunIds.size !== 1 ? 'runs' : 'run'} selected
                    </Text>
                    <Text size="xs" c="dimmed">
                      Choose an action to perform on selected items
                    </Text>
                  </div>
                </Group>
                <Group gap="xs">
                  <Button
                    variant="light"
                    color="gray"
                    size="sm"
                    onClick={() => setSelectedRunIds(new Set())}
                  >
                    Clear
                  </Button>
                  <Button
                    color="red"
                    size="sm"
                    leftSection={<IconTrash size={16} />}
                    onClick={handleDeleteClick}
                  >
                    Delete
                  </Button>
                  <Button
                    color="red"
                    variant="light"
                    size="sm"
                    leftSection={<IconRobot size={16} />}
                    onClick={handleDeleteAllForAgents}
                  >
                    Delete All for Agent(s)
                  </Button>
                </Group>
              </Group>
            </Paper>
          )}
        </Transition>
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
      </Box>

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
                <Table.Th style={{ width: 40 }}>
                  <Checkbox
                    size='xs'
                    checked={allSelected}
                    indeterminate={selectedRunIds.size > 0 && !allSelected}
                    onChange={handleToggleAll}
                  />
                </Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Agent ID</Table.Th>
                <Table.Th>Started</Table.Th>
                <Table.Th>Duration</Table.Th>
                {includeChildren && <Table.Th>Child Runs</Table.Th>}
                {!includeChildren && <Table.Th>Triggered by</Table.Th>}
                <Table.Th style={{ width: 60 }}></Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {runs.map((run) => {
                const isLastViewed = run.id === lastViewedRunId;
                const isSelected = selectedRunIds.has(run.id);
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
                  <Table.Td onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      size='xs'
                      checked={isSelected}
                      onChange={() => handleToggleRun(run.id)}
                    />
                  </Table.Td>
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
                    <Group gap="xs">
                      <Text size="sm" ff="monospace">{run.agentName}</Text>
                      <CopyButton value={run.agentId}>
                        {({ copied, copy }) => (
                          <Tooltip label={copied ? 'Copied' : 'Copy Agent ID'}>
                            <ActionIcon
                              size="xs"
                              variant="subtle"
                              color={copied ? 'teal' : 'gray'}
                              onClick={(e) => {
                                e.stopPropagation();
                                copy();
                              }}
                            >
                              {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                            </ActionIcon>
                          </Tooltip>
                        )}
                      </CopyButton>
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">
                      {new Date(run.startedAt).toLocaleString()}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">
                      { run.completedAt ? formatDuration(run.startedAt, run.completedAt) : '~'}
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
                  <Table.Td onClick={(e) => e.stopPropagation()}>
                    <Tooltip label="Delete run">
                      <ActionIcon
                        color="red"
                        variant="subtle"
                        onClick={(e) => handleDeleteSingleRun(run.id, e)}
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Tooltip>
                  </Table.Td>
                </Table.Tr>
                );
              })}
              {runs.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={7}>
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

      {/* Delete confirmation modal */}
      <DeleteRunsModal
        opened={deleteModalOpened}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
        count={runToDelete ? 1 : selectedRunIds.size}
        loading={deleting}
        agentIds={deleteByAgentIds}
      />
    </Box>
  );
}
