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
  Modal,
  Stack,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconAlertCircle,
  IconRefresh,
  IconRobot,
  IconTrash,
  IconEyeOff,
} from '@tabler/icons-react';
import { sessionsApi } from '../../api';
import type { Session } from '../../types';
import { SessionDetailsModal } from './SessionDetailsModal';
import { statusColors, formatRelativeTime } from './types';

const PAGE_SIZE = 50;

export function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [detailsOpened, { open: openDetails, close: closeDetails }] = useDisclosure(false);
  const [deleteOpened, { open: openDelete, close: closeDelete }] = useDisclosure(false);
  const [deleting, setDeleting] = useState(false);

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

  const handleViewDetails = (session: Session) => {
    setSelectedSession(session);
    openDetails();
  };

  const handleDeleteClick = (session: Session, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedSession(session);
    openDelete();
  };

  const handleDelete = async () => {
    if (!selectedSession) return;
    try {
      setDeleting(true);
      await sessionsApi.delete(selectedSession.id);
      setSessions((prev) => prev.filter((s) => s.id !== selectedSession.id));
      closeDelete();
      setSelectedSession(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete session');
    } finally {
      setDeleting(false);
    }
  };

  const handleClearFilters = () => {
    setStatusFilter(null);
    setAgentFilter('');
  };

  const hasFilters = statusFilter || agentFilter.trim();

  return (
    <Box>
      <Text c="dimmed" size="sm" mb="md">
        View and manage conversation sessions
      </Text>

      {/* Filters Row */}
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
                <Table.Th>Title</Table.Th>
                <Table.Th>Agent ID</Table.Th>
                <Table.Th>Updated</Table.Th>
                <Table.Th w={60}></Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {sessions.map((session) => (
                <Table.Tr
                  key={session.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleViewDetails(session)}
                >
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
                    <Text size="sm" ff="monospace">{session.agentId}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">
                      {formatRelativeTime(session.updatedAt)}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Tooltip label="Delete session">
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        onClick={(e) => handleDeleteClick(session, e)}
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Tooltip>
                  </Table.Td>
                </Table.Tr>
              ))}
              {sessions.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={5}>
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
      <Modal
        opened={deleteOpened}
        onClose={closeDelete}
        title="Delete Session"
        centered
        size="sm"
      >
        <Stack>
          <Text size="sm">
            Are you sure you want to delete this session? This will permanently delete all messages
            in this conversation.
          </Text>
          <Group justify="flex-end">
            <Button variant="subtle" onClick={closeDelete}>
              Cancel
            </Button>
            <Button color="red" loading={deleting} onClick={handleDelete}>
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}
