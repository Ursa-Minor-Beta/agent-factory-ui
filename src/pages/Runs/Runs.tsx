import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Text,
  Group,
  Badge,
  ActionIcon,
  Tooltip,
  CopyButton,
} from '@mantine/core';
import {
  IconClock,
  IconCheck,
  IconX,
  IconPlayerPlay,
  IconRobot,
  IconPlayerStop,
  IconTrash,
  IconCopy,
} from '@tabler/icons-react';
import { runsApi, sessionsApi } from '../../api';
import type { ListRunsParams } from '../../api/runs';
import type { RunSummary, RunStatus } from '../../types';
import { useRunDetailsModal } from '../../components/RunDetailsModal';
import {
  DataTable,
  type DataTableBulkAction,
  type DataTableColumn,
  type DataTableHandle,
  type DataTableQuery,
  type SortValue,
} from '../../components/common/DataTable';
import type { FilterOption } from '../../components/common/TableFilters';
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

type RunsSortBy = 'startedAt';

const INITIAL_SORT: SortValue<RunsSortBy> = { sortBy: 'startedAt', sortOrder: 'desc' };

interface RunsFilters {
  status: string | null;
  agentId: string;
  startedAfter: Date | null;
  startedBefore: Date | null;
  includeChildren: boolean;
}

const STATUS_OPTIONS: FilterOption[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'running', label: 'Running' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
  { value: 'cancelling', label: 'Cancelling' },
  { value: 'cancelled', label: 'Cancelled' },
];

export function RunsPage() {
  const { runId, openRunDetails } = useRunDetailsModal();
  const tableRef = useRef<DataTableHandle<RunSummary>>(null);
  const [error, setError] = useState('');
  const [lastViewedRunId, setLastViewedRunId] = useState<string | null>(null);
  const prevRunIdRef = useRef<string | null>(null);

  // Selection and deletion
  // Rows the delete modal will act on (from a bulk action)
  const [rowsToDelete, setRowsToDelete] = useState<string[]>([]);
  const [deleteModalOpened, setDeleteModalOpened] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [runToDelete, setRunToDelete] = useState<string | null>(null);
  const [deleteByAgentIds, setDeleteByAgentIds] = useState<string[]>([]);

  // Cancel run
  const [cancellingRunId, setCancellingRunId] = useState<string | null>(null);

  const loadRuns = async ({ filters, sort, page, pageSize }: DataTableQuery<RunsFilters, RunsSortBy>) => {
    const params: ListRunsParams = {
      ...sort,
      skip: (page - 1) * pageSize,
      limit: pageSize,
      includeChildren: filters.includeChildren,
    };
    if (filters.status) params.status = filters.status as RunStatus;
    if (filters.agentId) params.agentId = filters.agentId;
    if (filters.startedAfter) params.startedAfter = filters.startedAfter.toISOString();
    if (filters.startedBefore) params.startedBefore = filters.startedBefore.toISOString();

    const response = await runsApi.listAll(params);
    return {
      rows: response.runs.map((r) => ({
        ...r,
        status: r.serviceStatus === 'active' ? 'running' : r.status,
      })),
      total: response.total,
    };
  };

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

  // Delete handlers
  const handleDeleteClick = (selected: RunSummary[]) => {
    setRowsToDelete(selected.map((row) => row.id));
    setDeleteModalOpened(true);
  };

  const handleDeleteAllForAgents = (selectedRuns: RunSummary[]) => {
    if (selectedRuns.length > 0) {
      // Get unique agent IDs from selected runs
      setDeleteByAgentIds(Array.from(new Set(selectedRuns.map((run) => run.agentId))));
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
        await tableRef.current?.reload();
      } 
      else {
        // Delete specific runs
        const idsToDelete = runToDelete
          ? [runToDelete]
          : rowsToDelete;

        await runsApi.deleteRuns({ id: idsToDelete });

        // Optimistic update - remove deleted runs from the list
        const deletedSet = new Set(idsToDelete);
        tableRef.current?.setRows((prev) => prev.filter((run) => !deletedSet.has(run.id)));
        tableRef.current?.setTotal((prev) => prev - idsToDelete.length);
      }

      // Clear states
      tableRef.current?.clearSelection();
      setRowsToDelete([]);
      setRunToDelete(null);
      setDeleteByAgentIds([]);
      setDeleteModalOpened(false);
      setError('');
    } 
    catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete runs');
    } 
    finally {
      setDeleting(false);
    }
  };

  const handleCloseDeleteModal = () => {
    setDeleteModalOpened(false);
    setRowsToDelete([]);
    setRunToDelete(null);
    setDeleteByAgentIds([]);
  };

  // Cancel run handler
  const handleCancelRun = async (agentId: string, runId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      setCancellingRunId(runId);
      // const response = await runsApi.cancel(runId);
      const response = await sessionsApi.cancelChat(agentId, runId);
      const ids = new Set([ runId, ...response.cancelledChildRunIds]);
      tableRef.current?.setRows((prev) =>
        prev.map((run) => 
          ids.has(run.id) ? { ...run, status: 'cancelled' } : run
        )
      );
      setError('');
    } 
    catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel run');
    } 
    finally {
      setCancellingRunId(null);
    }
  };


  const bulkActions: DataTableBulkAction<RunSummary>[] = [
    {
      label: 'Delete',
      icon: <IconTrash size={16} />,
      color: 'red',
      onClick: handleDeleteClick,
    },
    {
      label: 'Delete All for Agent(s)',
      icon: <IconRobot size={16} />,
      color: 'red',
      variant: 'light',
      onClick: handleDeleteAllForAgents,
    },
  ];

  const columns: DataTableColumn<RunSummary, RunsFilters>[] = [
    {
      key: 'status',
      header: 'Status',
      filter: { 
        type: 'select', 
        key: 'status', 
        placeholder: 'Status', 
        options: STATUS_OPTIONS 
      },
      render: (run) => (
        <Badge
          color={statusColors[run.status]}
          variant="light"
          leftSection={statusIcons[run.status]}
        >
          {run.status}
        </Badge>
      ),
    },
    {
      key: 'agent',
      header: 'Agent',
      filter: { type: 'text', key: 'agentId', placeholder: 'Agent ID', icon: <IconRobot size={16} /> },
      render: (run) => (
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
      ),
    },
    {
      key: 'startedAt',
      header: 'Started',
      sortable: true,
      filter: [
        { type: 'date', key: 'startedAfter', placeholder: 'Started after' },
        { type: 'date', key: 'startedBefore', placeholder: 'Started before' },
      ],
      render: (run) => (
        <Text size="sm" c="dimmed">
          {new Date(run.startedAt).toLocaleString()}
        </Text>
      ),
    },
    {
      key: 'duration',
      header: 'Duration',
      render: (run) => (
        <Text size="sm" c="dimmed">
          {run.completedAt ? formatDuration(run.startedAt, run.completedAt) : '~'}
        </Text>
      ),
    },
    {
      key: 'childRuns',
      header: 'Child Runs',
      hidden: (filters) => !filters.includeChildren,
      filter: {
        type: 'switch',
        key: 'includeChildren',
        label: 'Collect by parent',
        persistent: true,
        defaultValue: true,
        storageKey: 'runs-includeChildren',
      },
      render: (run) =>
        run.childRunIds && run.childRunIds.length > 0 && (
          <Badge size="sm" variant="light" color="cyan">
            {run.childRunIds.length}
          </Badge>
        ),
    },
    {
      key: 'triggeredBy',
      header: 'Triggered by',
      hidden: (filters) => filters.includeChildren,
      render: (run) =>
        run.triggeredBy && (
          <Text size="sm" c="dimmed">
            {run.triggeredBy.triggerType}
          </Text>
        ),
    },
    {
      key: 'actions',
      width: 60,
      stopPropagation: true,
      render: (run) => (
        <Group gap={4} wrap="nowrap" justify="flex-end">
          {(run.status === 'pending' || run.status === 'running') && (
            <Tooltip label="Cancel run">
              <ActionIcon
                color="orange"
                variant="subtle"
                loading={cancellingRunId === run.id}
                onClick={(e) => handleCancelRun(run.agentId, run.id, e)}
              >
                <IconPlayerStop size={16} />
              </ActionIcon>
            </Tooltip>
          )}
          <Tooltip label="Delete run">
            <ActionIcon
              color="red"
              variant="subtle"
              onClick={(e) => handleDeleteSingleRun(run.id, e)}
            >
              <IconTrash size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>
      ),
    },
  ];

  return (
    <Box>
      <Text c="dimmed" size="sm" mb="md">
        View execution history and debug agent runs
      </Text>

      <DataTable
        ref={tableRef}
        columns={columns}
        getRowId={(run) => run.id}
        loadData={loadRuns}
        error={error}
        onErrorClose={() => setError('')}
        emptyMessage="No runs yet"
        noMatchMessage="No runs match your filters"
        onRowClick={(run) => openRunDetails(run.id)}
        rowStyle={(run) => ({
          backgroundColor: run.id === lastViewedRunId ? 'var(--mantine-color-cyan-light)' : undefined,
          transition: 'background-color 0.3s ease',
        })}
        bulkActions={bulkActions}
        initialSort={INITIAL_SORT}
        itemLabel={['run', 'runs']}
      />

      {/* Delete confirmation modal */}
      <DeleteRunsModal
        opened={deleteModalOpened}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
        count={runToDelete ? 1 : rowsToDelete.length}
        loading={deleting}
        agentIds={deleteByAgentIds}
      />
    </Box>
  );
}
