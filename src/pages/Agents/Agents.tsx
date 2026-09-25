import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Text,
  Button,
  Group,
  TextInput,
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
  IconSearch,
  IconFilter,
  IconAlertCircle,
} from '@tabler/icons-react';
import { agentsApi } from '../../api';
import type { Agent, AgentQueryParams } from '../../types';
import { AgentCard } from './AgentCard';
import { AgentFilters } from './AgentFilters';
import { useAgentModal } from '../../components/AgentCreateModal';
import { AgentDeleteModal } from './AgentDeleteModal';

const ITEMS_PER_PAGE = 12;
const SORT_STORAGE_KEY = 'agents-sort';

export function AgentsPage() {
  const isMobile = useMediaQuery('(max-width: 768px)') ?? false;

  const [agents, setAgents] = useState<Agent[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals
  const { openCreateAgent, openEditAgent } = useAgentModal();
  const [agentToDelete, setAgentToDelete] = useState<Agent | null>(null);

  // Filter panel
  const [showFilters, { toggle: toggleFilters }] = useDisclosure(false);

  // Query params
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [descriptionFilter, setDescriptionFilter] = useState('');
  const [descriptionDebounced, setDescriptionDebounced] = useState('');
  const [createdAfter, setCreatedAfter] = useState('');
  const [createdBefore, setCreatedBefore] = useState('');
  const [sortValue, setSortValue] = useState<string | null>(() => {
    return localStorage.getItem(SORT_STORAGE_KEY) || 'name-asc';
  });
  const [page, setPage] = useState(1);

  // Persist sort value
  const handleSortChange = (val: string | null) => {
    const value = val || 'name-asc';
    setSortValue(value);
    localStorage.setItem(SORT_STORAGE_KEY, value);
  };

  // Parse sort value
  const [sortBy, sortOrder] = (sortValue || 'name-asc').split('-') as [AgentQueryParams['sortBy'], AgentQueryParams['sortOrder']];

  // Check if any filters are active
  const activeFilterCount = [
    searchDebounced,
    descriptionDebounced,
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
  }, [searchDebounced, descriptionDebounced, createdAfter, createdBefore, sortBy, sortOrder, page]);

  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  // Listen for agent-saved event from global modal
  useEffect(() => {
    const handleAgentSaved = () => loadAgents();
    window.addEventListener('agent-saved', handleAgentSaved);
    return () => window.removeEventListener('agent-saved', handleAgentSaved);
  }, [loadAgents]);

  const handleOpenEditModal = (agent?: Agent) => {
    if (agent) {
      openEditAgent(agent.id);
    } else {
      openCreateAgent();
    }
  };

  const handleClone = async (agent: Agent) => {
    try {
      await agentsApi.create({
        name: `${agent.name} (clone)`,
        description: agent.description,
        nodes: agent.nodes,
      });
      loadAgents();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clone agent');
    }
  };

  const clearFilters = () => {
    setSearch('');
    setSearchDebounced('');
    setDescriptionFilter('');
    setDescriptionDebounced('');
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
          onChange={handleSortChange}
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
          onClick={openCreateAgent}
        >
          New Agent
        </Button>
      </Group>

      {/* Expandable filters */}
      {showFilters && (
        <AgentFilters
          descriptionFilter={descriptionFilter}
          onDescriptionChange={setDescriptionFilter}
          createdAfter={createdAfter}
          onCreatedAfterChange={(val) => { setCreatedAfter(val); setPage(1); }}
          createdBefore={createdBefore}
          onCreatedBeforeChange={(val) => { setCreatedBefore(val); setPage(1); }}
          activeFilterCount={activeFilterCount}
          onClearFilters={clearFilters}
        />
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
              <AgentCard
                key={agent.id}
                agent={agent}
                onEdit={handleOpenEditModal}
                onDelete={setAgentToDelete}
                onClone={handleClone}
              />
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

      <AgentDeleteModal
        agent={agentToDelete}
        onClose={() => setAgentToDelete(null)}
        onDeleted={loadAgents}
      />
    </Box>
  );
}
