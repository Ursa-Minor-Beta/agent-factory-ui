import { useState, useRef } from 'react';
import { Box, Text, Group, ActionIcon, Tooltip, CopyButton, Badge } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconRobot, IconTrash, IconCopy, IconCheck, IconEyeOff } from '@tabler/icons-react';
import { sessionsApi } from '../../api';
import type { SessionsQueryParams } from '../../api/sessions';
import type { Session } from '../../types';
import {
  DataTable,
  type DataTableBulkAction,
  type DataTableColumn,
  type DataTableHandle,
  type DataTableQuery,
} from '../../components/common/DataTable';
import type { FilterOption } from '../../components/common/TableFilters';
import { SessionDetailsModal } from './SessionDetailsModal';
import { DeleteSessionsModal } from './DeleteSessionsModal';
import { statusColors, formatRelativeTime } from './types';

interface SessionsFilters {
  status: string | null;
  agentId: string;
}

const STATUS_OPTIONS: FilterOption[] = [
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
];

export function SessionsPage() {
  const tableRef = useRef<DataTableHandle<Session>>(null);
  const [error, setError] = useState('');
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [detailsOpened, { open: openDetails, close: closeDetails }] = useDisclosure(false);
  const [deleting, setDeleting] = useState(false);

  // Selection and deletion
  // Rows the delete modal will act on (from a bulk action)
  const [rowsToDelete, setRowsToDelete] = useState<string[]>([]);
  const [deleteModalOpened, setDeleteModalOpened] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const [deleteByAgentIds, setDeleteByAgentIds] = useState<string[]>([]);

  const loadSessions = async ({ filters, page, pageSize }: DataTableQuery<SessionsFilters>) => {
    const params: SessionsQueryParams = {
      offset: (page - 1) * pageSize,
      limit: pageSize,
    };
    if (filters.status) params.status = filters.status as SessionsQueryParams['status'];
    if (filters.agentId) params.agentId = filters.agentId;

    const response = await sessionsApi.list(params);
    return { rows: response.items, total: response.total };
  };

  const handleViewDetails = (session: Session) => {
    setSelectedSession(session);
    openDetails();
  };

  // Delete handlers
  const handleDeleteClick = (selected: Session[]) => {
    setRowsToDelete(selected.map((row) => row.id));
    setDeleteModalOpened(true);
  };

  const handleDeleteAllForAgents = (selectedSessions: Session[]) => {
    if (selectedSessions.length > 0) {
      setDeleteByAgentIds(Array.from(new Set(selectedSessions.map((s) => s.agentId))));
      setDeleteModalOpened(true);
    }
  };

  const handleDeleteSingleSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSessionToDelete(sessionId);
    setDeleteModalOpened(true);
  };

  const handleConfirmDelete = async () => {
    try {
      setDeleting(true);

      if (deleteByAgentIds.length > 0) {
        await sessionsApi.delete({ agentId: deleteByAgentIds });
        await tableRef.current?.reload();
      } else {
        const idsToDelete = sessionToDelete
          ? [sessionToDelete]
          : rowsToDelete;

        await sessionsApi.delete({ id: idsToDelete });

        const deletedSet = new Set(idsToDelete);
        tableRef.current?.setRows((prev) => prev.filter((s) => !deletedSet.has(s.id)));
        tableRef.current?.setTotal((prev) => prev - idsToDelete.length);
      }

      tableRef.current?.clearSelection();
      setRowsToDelete([]);
      setSessionToDelete(null);
      setDeleteByAgentIds([]);
      setDeleteModalOpened(false);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete sessions');
    } finally {
      setDeleting(false);
    }
  };

  const handleCloseDeleteModal = () => {
    setDeleteModalOpened(false);
    setRowsToDelete([]);
    setSessionToDelete(null);
    setDeleteByAgentIds([]);
  };

  const bulkActions: DataTableBulkAction<Session>[] = [
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

  const columns: DataTableColumn<Session, SessionsFilters>[] = [
    {
      key: 'status',
      header: 'Status',
      filter: { type: 'select', key: 'status', placeholder: 'Status', options: STATUS_OPTIONS },
      render: (session) => (
        <Group gap="xs">
          <Badge color={statusColors[session.status]} variant="light">
            {session.status}
          </Badge>
          {session.incognito && (
            <Tooltip label="Incognito">
              <IconEyeOff size={14} style={{ opacity: 0.5 }} />
            </Tooltip>
          )}
        </Group>
      ),
    },
    {
      key: 'title',
      header: 'Title',
      render: (session) => <Text size="sm">{session.title || 'Untitled'}</Text>,
    },
    {
      key: 'agent',
      header: 'Agent',
      filter: { type: 'text', key: 'agentId', placeholder: 'Agent ID', icon: <IconRobot size={16} /> },
      render: (session) => (
        <Group gap="xs">
          <Text size="sm" ff="monospace">{session.agentName || session.agentId}</Text>
          <CopyButton value={session.agentId}>
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
      key: 'updated',
      header: 'Updated',
      render: (session) => (
        <Text size="sm" c="dimmed">
          {formatRelativeTime(session.updatedAt)}
        </Text>
      ),
    },
    {
      key: 'actions',
      width: 60,
      stopPropagation: true,
      render: (session) => (
        <Tooltip label="Delete session">
          <ActionIcon
            variant="subtle"
            color="red"
            onClick={(e) => handleDeleteSingleSession(session.id, e)}
          >
            <IconTrash size={16} />
          </ActionIcon>
        </Tooltip>
      ),
    },
  ];

  return (
    <Box>
      <Text c="dimmed" size="sm" mb="md">
        View and manage conversation sessions
      </Text>

      <DataTable
        ref={tableRef}
        columns={columns}
        getRowId={(session) => session.id}
        loadData={loadSessions}
        error={error}
        onErrorClose={() => setError('')}
        emptyMessage="No sessions yet"
        noMatchMessage="No sessions match your filters"
        onRowClick={handleViewDetails}
        bulkActions={bulkActions}
        itemLabel={['session', 'sessions']}
      />

      <SessionDetailsModal
        session={selectedSession}
        opened={detailsOpened}
        onClose={closeDetails}
      />

      {/* Delete Confirmation Modal */}
      <DeleteSessionsModal
        opened={deleteModalOpened}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
        count={sessionToDelete ? 1 : rowsToDelete.length}
        loading={deleting}
        agentIds={deleteByAgentIds}
      />
    </Box>
  );
}
