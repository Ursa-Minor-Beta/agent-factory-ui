import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  Box,
  Text,
  Button,
  Card,
  Group,
  Stack,
  ActionIcon,
  Modal,
  TextInput,
  Textarea,
  Loader,
  Alert,
  Badge,
  Pagination,
  Select,
  SimpleGrid,
  Center,
} from '@mantine/core';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import {
  IconPlus,
  IconTrash,
  IconEdit,
  IconSearch,
  IconFilter,
  IconX,
  IconAlertCircle,
  IconMessageCircle,
  IconChevronRight,
} from '@tabler/icons-react';
import { agentsApi } from '../api';
import type { Agent, AgentQueryParams } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface AgentForm {
  name: string;
  description: string;
}

const ITEMS_PER_PAGE = 12;

export function AgentsPage() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [agents, setAgents] = useState<Agent[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [saving, setSaving] = useState(false);

  // Filter panel
  const [showFilters, { toggle: toggleFilters }] = useDisclosure(false);

  // Query params
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [descriptionFilter, setDescriptionFilter] = useState('');
  const [descriptionDebounced, setDescriptionDebounced] = useState('');
  const [isSystemFilter, setIsSystemFilter] = useState<string | null>('all');
  const [createdAfter, setCreatedAfter] = useState('');
  const [createdBefore, setCreatedBefore] = useState('');
  const [sortValue, setSortValue] = useState<string | null>('name-asc');
  const [page, setPage] = useState(1);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<AgentForm>();

  // Parse sort value
  const [sortBy, sortOrder] = (sortValue || 'name-asc').split('-') as [AgentQueryParams['sortBy'], AgentQueryParams['sortOrder']];

  // Check if any filters are active
  const activeFilterCount = [
    searchDebounced,
    descriptionDebounced,
    isSystemFilter !== 'all',
    createdAfter,
    createdBefore,
  ].filter(Boolean).length;

  // Debounce search inputs
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounced(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDescriptionDebounced(descriptionFilter);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [descriptionFilter]);

  const loadAgents = useCallback(async () => {
    try {
      setLoading(true);
      const params: AgentQueryParams = {
        sortBy,
        sortOrder,
        skip: (page - 1) * ITEMS_PER_PAGE,
        limit: ITEMS_PER_PAGE,
      };
      if (searchDebounced.trim()) {
        params.name = searchDebounced;
      }
      if (descriptionDebounced.trim()) {
        params.description = descriptionDebounced;
      }
      if (isAdmin && isSystemFilter && isSystemFilter !== 'all') {
        params.isSystem = isSystemFilter === 'system';
      }
      if (createdAfter) {
        params.createdAfter = new Date(createdAfter).toISOString();
      }
      if (createdBefore) {
        params.createdBefore = new Date(createdBefore).toISOString();
      }
      const data = await agentsApi.list(params);
      setAgents(data.agents);
      setTotal(data.total);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load agents');
    } finally {
      setLoading(false);
    }
  }, [searchDebounced, descriptionDebounced, isSystemFilter, createdAfter, createdBefore, sortBy, sortOrder, page, isAdmin]);

  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  const handleOpenModal = (agent?: Agent) => {
    if (agent) {
      setEditingAgent(agent);
      reset({ name: agent.name, description: agent.description || '' });
    } else {
      setEditingAgent(null);
      reset({ name: '', description: '' });
    }
    openModal();
  };

  const handleCloseModal = () => {
    closeModal();
    setEditingAgent(null);
    reset({ name: '', description: '' });
  };

  const onSubmit = async (data: AgentForm) => {
    setSaving(true);
    try {
      if (editingAgent) {
        await agentsApi.update(editingAgent.id, data);
      } else {
        await agentsApi.create(data);
      }
      handleCloseModal();
      loadAgents();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save agent');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this agent?')) return;
    try {
      await agentsApi.delete(id);
      loadAgents();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete agent');
    }
  };

  const clearFilters = () => {
    setSearch('');
    setSearchDebounced('');
    setDescriptionFilter('');
    setDescriptionDebounced('');
    setIsSystemFilter('all');
    setCreatedAfter('');
    setCreatedBefore('');
    setPage(1);
  };

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  return (
    <Box>
      {/* Main toolbar */}
      <Group mb="md" gap="sm" wrap="wrap">
        <TextInput
          placeholder="Search by name..."
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          leftSection={<IconSearch size={16} />}
          style={{ flex: 1, minWidth: 200, maxWidth: 300 }}
        />
        <Button
          variant={showFilters ? 'filled' : 'outline'}
          leftSection={<IconFilter size={16} />}
          onClick={toggleFilters}
          color={activeFilterCount > 0 ? 'cyan' : 'gray'}
        >
          Filters
          {activeFilterCount > 0 && (
            <Badge size="sm" ml="xs" circle>{activeFilterCount}</Badge>
          )}
        </Button>
        <Select
          value={sortValue}
          onChange={(val) => setSortValue(val || 'name-asc')}
          data={[
            { value: 'name-asc', label: 'Name A-Z' },
            { value: 'name-desc', label: 'Name Z-A' },
            { value: 'updatedAt-desc', label: 'Recently updated' },
            { value: 'updatedAt-asc', label: 'Oldest updated' },
            { value: 'createdAt-desc', label: 'Newest first' },
            { value: 'createdAt-asc', label: 'Oldest first' },
          ]}
          style={{ minWidth: 160 }}
        />
        <Box style={{ flex: 1 }} />
        <Button
          leftSection={<IconPlus size={16} />}
          onClick={() => handleOpenModal()}
          disabled
          title="Soon"
        >
          New Agent
        </Button>
      </Group>

      {/* Expandable filters */}
      {showFilters && (
        <Card mb="md" p="md" withBorder>
          <Group gap="sm" wrap="wrap" align="flex-end">
            <TextInput
              label="Description"
              placeholder="Filter by description..."
              value={descriptionFilter}
              onChange={(e) => setDescriptionFilter(e.currentTarget.value)}
              style={{ minWidth: 200 }}
            />
            <TextInput
              label="Created after"
              type="date"
              value={createdAfter}
              onChange={(e) => {
                setCreatedAfter(e.currentTarget.value);
                setPage(1);
              }}
              style={{ minWidth: 150 }}
            />
            <TextInput
              label="Created before"
              type="date"
              value={createdBefore}
              onChange={(e) => {
                setCreatedBefore(e.currentTarget.value);
                setPage(1);
              }}
              style={{ minWidth: 150 }}
            />
            {isAdmin && (
              <Select
                label="Agent type"
                value={isSystemFilter}
                onChange={(val) => {
                  setIsSystemFilter(val);
                  setPage(1);
                }}
                data={[
                  { value: 'all', label: 'All agents' },
                  { value: 'system', label: 'System only' },
                  { value: 'user', label: 'User only' },
                ]}
                style={{ minWidth: 140 }}
              />
            )}
            <Box style={{ flex: 1 }} />
            {activeFilterCount > 0 && (
              <Button
                variant="subtle"
                leftSection={<IconX size={16} />}
                onClick={clearFilters}
              >
                Clear filters
              </Button>
            )}
          </Group>
        </Card>
      )}

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

      {/* Results info */}
      {!loading && (
        <Text size="sm" c="dimmed" mb="md">
          {total} agent{total !== 1 ? 's' : ''} found
        </Text>
      )}

      {loading ? (
        <Center py="xl">
          <Loader />
        </Center>
      ) : (
        <>
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
            {agents.map((agent) => (
              <Card
                key={agent.id}
                withBorder
                padding="md"
                style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
              >
                <Stack gap="xs" style={{ flex: 1 }}>
                  <Group justify="space-between" align="flex-start" wrap="nowrap">
                    <Text
                      fw={600}
                      style={{
                        flex: 1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {agent.name}
                    </Text>
                    {isAdmin && agent.isSystem && (
                      <Badge color="cyan" size="sm">System</Badge>
                    )}
                  </Group>
                  <Text
                    size="sm"
                    c="dimmed"
                    style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      minHeight: '2.5em',
                    }}
                  >
                    {agent.description || 'No description'}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {agent.nodes.length} nodes
                  </Text>
                </Stack>
                <Group mt="sm" gap="xs" justify="space-between">
                  <Link
                    to={`/agents/${agent.id}/chat`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      color: 'var(--mantine-color-cyan-5)',
                      textDecoration: 'none',
                    }}
                  >
                    <IconMessageCircle size={16} />
                    <Text size="sm" fw={500} c="cyan">Chat</Text>
                    <IconChevronRight size={14} />
                  </Link>
                  <Group gap="xs">
                  <ActionIcon
                    variant="subtle"
                    onClick={() => handleOpenModal(agent)}
                  >
                    <IconEdit size={18} />
                  </ActionIcon>
                  {!agent.isSystem && (
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      onClick={() => handleDelete(agent.id)}
                    >
                      <IconTrash size={18} />
                    </ActionIcon>
                  )}
                  </Group>
                </Group>
              </Card>
            ))}
          </SimpleGrid>

          {agents.length === 0 && (
            <Text c="dimmed" ta="center" py="xl">
              {total === 0 && activeFilterCount === 0
                ? 'No agents yet. Create your first agent to get started.'
                : 'No agents match your filters.'}
            </Text>
          )}

          {totalPages > 1 && (
            <Center mt="lg">
              <Pagination
                total={totalPages}
                value={page}
                onChange={setPage}
                size={isMobile ? 'sm' : 'md'}
              />
            </Center>
          )}
        </>
      )}

      <Modal
        opened={modalOpened}
        onClose={handleCloseModal}
        title={editingAgent ? 'Edit Agent' : 'New Agent'}
        fullScreen={isMobile}
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          <Stack>
            <TextInput
              label="Name"
              error={errors.name?.message}
              {...register('name', { required: 'Name is required' })}
            />
            <Textarea
              label="Description"
              rows={3}
              {...register('description')}
            />
            <Group justify="flex-end" mt="md">
              <Button variant="subtle" onClick={handleCloseModal}>
                Cancel
              </Button>
              <Button type="submit" loading={saving}>
                Save
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Box>
  );
}
