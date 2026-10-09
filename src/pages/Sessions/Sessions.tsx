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
  ActionIcon,
  Tooltip,
  TextInput,
  Checkbox,
  Paper,
  Transition,
  CopyButton,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconAlertCircle,
  IconRefresh,
  IconRobot,
  IconTrash,
  IconEyeOff,
  IconSquareCheck,
  IconCopy,
  IconCheck,
} from '@tabler/icons-react';
import { sessionsApi } from '../../api';
import type { Session } from '../../types';
import { SessionDetailsModal } from './SessionDetailsModal';
import { DeleteSessionsModal } from './DeleteSessionsModal';
import { statusColors, formatRelativeTime } from './types';

const PAGE_SIZE = 50;

export function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [detailsOpened, { open: openDetails, close: closeDetails }] = useDisclosure(false);
  const [deleting, setDeleting] = useState(false);

  // Selection and deletion
  const [selectedSessionIds, setSelectedSessionIds] = useState<Set<string>>(new Set());
  const [deleteModalOpened, setDeleteModalOpened] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const [deleteByAgentIds, setDeleteByAgentIds] = useState<string[]>([]);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [agentFilter, setAgentFilter] = useState('');

  const loadSessions = useCallback(async () => {
    try {
      setLoading(true);
      const params: { agentId?: string; status?: 'active' | 'archived'; limit: number } = {
        limit: PAGE_SIZE,
      };
      if (statusFilter) params.status = statusFilter as 'active' | 'archived';
      if (agentFilter.trim()) params.agentId = agentFilter.trim();

      const data = await sessionsApi.list(params);
      setSessions(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, agentFilter]);

  useEffect(() => {
    loadSessions();
  }, [statusFilter]);

  // Clear selection when filters change
  useEffect(() => {
    setSelectedSessionIds(new Set());
  }, [statusFilter, agentFilter]);

  const handleViewDetails = (session: Session) => {
    setSelectedSession(session);
    openDetails();
  };

  // Selection handlers
  const handleToggleAll = () => {
    if (selectedSessionIds.size === sessions.length) {
      setSelectedSessionIds(new Set());
    } else {
      setSelectedSessionIds(new Set(sessions.map((s) => s.id)));
    }
  };

  const handleToggleSession = (sessionId: string) => {
    setSelectedSessionIds((prev) => {
      const next = new Set(prev);
      if (next.has(sessionId)) {
        next.delete(sessionId);
      } else {
        next.add(sessionId);
      }
      return next;
    });
  };

  // Delete handlers
  const handleDeleteClick = () => {
    if (selectedSessionIds.size > 0) {
      setDeleteModalOpened(true);
    }
  };

  const handleDeleteAllForAgents = () => {
    if (selectedSessionIds.size > 0) {
      const agentIds = Array.from(
        new Set(
          sessions
            .filter((s) => selectedSessionIds.has(s.id))
            .map((s) => s.agentId)
        )
      );
      setDeleteByAgentIds(agentIds);
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
        await loadSessions();
      } else {
        const idsToDelete = sessionToDelete
          ? [sessionToDelete]
          : Array.from(selectedSessionIds);

        await sessionsApi.delete({ id: idsToDelete });

        const deletedSet = new Set(idsToDelete);
        setSessions((prev) => prev.filter((s) => !deletedSet.has(s.id)));
      }

      setSelectedSessionIds(new Set());
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
    setSessionToDelete(null);
    setDeleteByAgentIds([]);
  };

  const handleClearFilters = () => {
    setStatusFilter(null);
    setAgentFilter('');
  };

  const hasFilters = statusFilter || agentFilter.trim();
  const allSelected = sessions.length > 0 && selectedSessionIds.size === sessions.length;

  return (
    <Box>
      <Text c="dimmed" size="sm" mb="md">
        View and manage conversation sessions
      </Text>

      {/* Filters Row */}
      <Box style={{ position: 'relative' }}>
        {/* Bulk actions bar - overlays filters */}
        <Transition mounted={selectedSessionIds.size > 0} transition="slide-down" duration={200}>
          {(styles) => (
            <Paper
              withBorder
              p="md"
              mb="md"
              radius="md"
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
                      {selectedSessionIds.size}{' '}
                      {selectedSessionIds.size !== 1 ? 'sessions' : 'session'} selected
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
                    onClick={() => setSelectedSessionIds(new Set())}
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
            onChange={setStatusFilter}
            data={[
              { value: 'active', label: 'Active' },
              { value: 'archived', label: 'Archived' },
            ]}
            clearable
            style={{ width: 140 }}
          />
          <TextInput
            placeholder="Agent ID"
            value={agentFilter}
            onChange={(e) => setAgentFilter(e.currentTarget.value)}
            onBlur={loadSessions}
            onKeyDown={(e) => e.key === 'Enter' && loadSessions()}
            leftSection={<IconRobot size={16} />}
            style={{ width: 200 }}
          />
          <Tooltip label="Refresh">
            <ActionIcon variant="light" onClick={loadSessions} loading={loading}>
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
                    size="xs"
                    checked={allSelected}
                    indeterminate={selectedSessionIds.size > 0 && !allSelected}
                    onChange={handleToggleAll}
                  />
                </Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Title</Table.Th>
                <Table.Th>Agent</Table.Th>
                <Table.Th>Updated</Table.Th>
                <Table.Th w={60}></Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {sessions.map((session) => {
                const isSelected = selectedSessionIds.has(session.id);
                return (
                  <Table.Tr
                    key={session.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleViewDetails(session)}
                  >
                    <Table.Td onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        size="xs"
                        checked={isSelected}
                        onChange={() => handleToggleSession(session.id)}
                      />
                    </Table.Td>
                    <Table.Td>
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
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{session.title || 'Untitled'}</Text>
                    </Table.Td>
                    <Table.Td>
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
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed">
                        {formatRelativeTime(session.updatedAt)}
                      </Text>
                    </Table.Td>
                    <Table.Td onClick={(e) => e.stopPropagation()}>
                      <Tooltip label="Delete session">
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          onClick={(e) => handleDeleteSingleSession(session.id, e)}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Tooltip>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
              {sessions.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={6}>
                    <Text ta="center" c="dimmed" py="md">
                      {hasFilters ? 'No sessions match your filters' : 'No sessions yet'}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        )}
      </Card>

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
        count={sessionToDelete ? 1 : selectedSessionIds.size}
        loading={deleting}
        agentIds={deleteByAgentIds}
      />
    </Box>
  );
}
