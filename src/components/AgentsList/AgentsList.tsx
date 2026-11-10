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
  Tooltip,
  SegmentedControl,
} from '@mantine/core';
import { useDisclosure, useLocalStorage, useMediaQuery } from '@mantine/hooks';
import {
  IconSearch,
  IconFilter,
  IconAlertCircle,
  IconSchema,
  IconCode,
  IconDownload,
  IconBrandGithub,
  IconHierarchy2,
  IconLayoutGrid,
} from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import { agentsApi } from '../../api';
import { workspacesApi } from '../../api/workspaces';
import type { Agent, AgentQueryParams } from '../../types';
import type { Workspace } from '../../types/workspace';
import { AgentCard } from './AgentCard';
import { AgentsRelationsGraph } from '../AgentsGraph';
import { AgentFilters, GLOBAL_WORKSPACE_FILTER } from './AgentFilters';
import { AgentDeleteModal } from './AgentDeleteModal';
import { AgentWorkspaceModal } from './AgentWorkspaceModal';
import { ModalAgentImport } from './ModalAgentImport/ModalAgentImport';
import { ModalGitHubImport } from './ModalGitHubImport';
import { useAgentModal } from '../AgentCreateModal';
import { routes } from '../../config/routes';

const ITEMS_PER_PAGE = 12;
const SORT_STORAGE_KEY = 'agents-sort';

const VIEW_MODE_STORAGE_KEY = 'agents-view-mode';

type ViewMode = 'list' | 'graph';

function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

interface AgentsListProps {
  workspaceId?: string; // If provided, filter by this workspace
  showFilters?: boolean; // Show/hide filters panel
  showPagination?: boolean; // Show/hide pagination
  showCreateButton?: boolean; // Show/hide create button
  limit?: number; // Custom limit
  onCreate?: () => void; // Called when agent is created/imported
  onDelete?: () => void; // Called when agent is deleted
}

export function AgentsList({
  workspaceId,
  showFilters = true,
  showPagination = true,
  showCreateButton = true,
  limit = ITEMS_PER_PAGE,
  onCreate,
  onDelete,
}: AgentsListProps) {
  const isMobile = useMediaQuery('(max-width: 768px)') ?? false;

  const [agents, setAgents] = useState<Agent[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals
  const { openCreateAgent, openEditAgent } = useAgentModal();
  const [agentToDelete, setAgentToDelete] = useState<Agent | null>(null);
  const [agentForWorkspace, setAgentForWorkspace] = useState<Agent | null>(null);
  const [importModalOpened, setImportModalOpened] = useState(false);
  const [githubImportModalOpened, setGithubImportModalOpened] = useState(false);

  // Filter panel
  const [filtersOpened, { toggle: toggleFilters }] = useDisclosure(false);

  // Query params
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [descriptionFilter, setDescriptionFilter] = useState('');
  const [descriptionDebounced, setDescriptionDebounced] = useState('');
  const [workspaceFilter, setWorkspaceFilter] = useState('');
  const [createdAfter, setCreatedAfter] = useState('');
  const [createdBefore, setCreatedBefore] = useState('');
  const [sortValue, setSortValue] = useState<string | null>(() => {
    return localStorage.getItem(SORT_STORAGE_KEY) || 'name-asc';
  });
  const [page, setPage] = useState(1);

  // Workspaces for filter
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspacesLoading, setWorkspacesLoading] = useState(false);

  // Graph view is only offered inside a workspace
  // Last chosen view is remembered across reloads
  const [selectedViewMode, setViewMode] = useLocalStorage<ViewMode>({
    key: VIEW_MODE_STORAGE_KEY,
    defaultValue: 'list',
    getInitialValueInEffect: false,
  });
  const viewMode: ViewMode = workspaceId && selectedViewMode === 'graph' ? 'graph' : 'list';

  // Persist sort value
  const handleSortChange = (val: string | null) => {
    const value = val || 'name-asc';
    setSortValue(value);
    localStorage.setItem(SORT_STORAGE_KEY, value);
  };

  // Parse sort value
  const [sortBy, sortOrder] = (sortValue || 'name-asc').split('-') as [
    AgentQueryParams['sortBy'],
    AgentQueryParams['sortOrder']
  ];

  // Filters inside the expandable panel (drives the Filters button badge)
  const panelFilterCount = [descriptionDebounced, createdAfter, createdBefore].filter(Boolean).length;
  // Any filter active, incl. toolbar ones (drives the empty-state message)
  const activeFilterCount = panelFilterCount + [searchDebounced, workspaceFilter].filter(Boolean).length;

  // Load workspaces for filter (only if filters are shown and no workspace is pre-selected)
  useEffect(() => {
    if (!showFilters || workspaceId) return;

    const loadWorkspaces = async () => {
      setWorkspacesLoading(true);
      try {
        const data = await workspacesApi.list({ limit: 100, sortBy: 'name', sortOrder: 'asc' });
        setWorkspaces(data.workspaces);
      } catch (err) {
        console.error('Failed to load workspaces:', err);
      } finally {
        setWorkspacesLoading(false);
      }
    };
    loadWorkspaces();
  }, [showFilters, workspaceId]);

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
        skip: (page - 1) * limit,
        limit,
      };
      if (searchDebounced.trim()) {
        params.name = searchDebounced;
      }
      if (descriptionDebounced.trim()) {
        params.description = descriptionDebounced;
      }
      // Use workspace from props if provided, otherwise use filter
      if (workspaceId) {
        params.workspaceId = workspaceId;
      } else if (workspaceFilter === GLOBAL_WORKSPACE_FILTER) {
        params.workspaceId = null; // agents not in any workspace
      } else if (workspaceFilter) {
        params.workspaceId = workspaceFilter;
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
  }, [
    searchDebounced,
    descriptionDebounced,
    workspaceId,
    workspaceFilter,
    createdAfter,
    createdBefore,
    sortBy,
    sortOrder,
    page,
    limit,
  ]);

  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  // Bumped on every mutation so the graph view refetches; plain list reloads (paging, filters) don't touch it
  const [graphVersion, setGraphVersion] = useState(0);
  const reloadAgents = useCallback(() => {
    loadAgents();
    setGraphVersion((v) => v + 1);
  }, [loadAgents]);

  // Listen for agent-saved event from global modal
  useEffect(() => {
    const handleAgentSaved = () => { reloadAgents(); onCreate?.(); };
    window.addEventListener('agent-saved', handleAgentSaved);
    return () => window.removeEventListener('agent-saved', handleAgentSaved);
  }, [reloadAgents, onCreate]);

  const handleOpenEditModal = (agent: Agent) => {
    openEditAgent(agent.id);
  };

  const handleClone = async (agent: Agent) => {
    try {
      // Fetch full agent data to get nodes // TODO move clone to thhe backend
      const fullAgent = await agentsApi.getById(agent.id);
      await agentsApi.create({
        name: `${fullAgent.name} (clone)`,
        description: fullAgent.description,
        nodes: fullAgent.nodes,
        workspaceId: fullAgent.workspaceId || workspaceId,
        editorData: fullAgent.editorData
      });
      reloadAgents();
      onCreate?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clone agent');
    }
  };

  const handleExport = async (agent: Agent) => {
    try {
      const exportData = await agentsApi.export(agent.id);
      downloadJson(exportData, `${agent.name}.agent.json`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export agent');
    }
  };

  // Clears only the expandable panel filters; search and workspace live in the toolbar with their own controls
  const clearPanelFilters = () => {
    setDescriptionFilter('');
    setDescriptionDebounced('');
    setCreatedAfter('');
    setCreatedBefore('');
    setPage(1);
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <Box pos="relative">
      {/* Main toolbar - floats over the graph in graph mode so the graph gets the full height */}
      <Group
        mb={viewMode === 'graph' ? 0 : 'md'}
        gap="sm"
        wrap="wrap"
        style={viewMode === 'graph' ? { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 } : undefined}
      >
        {workspaceId && (
          <SegmentedControl
            value={viewMode}
            onChange={(value) => setViewMode(value as ViewMode)}
            data={[
              { value: 'list', label: <Center><IconLayoutGrid size={16} /></Center> },
              { value: 'graph', label: <Center><IconHierarchy2 size={16} /></Center> },
            ]}
          />
        )}
        {viewMode === 'list' && (<>
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
            {showFilters && !workspaceId && (
              <Select
                placeholder={workspacesLoading ? 'Loading...' : 'All workspaces'}
                value={workspaceFilter || null}
                onChange={(val) => {
                  setWorkspaceFilter(val || '');
                  setPage(1);
                }}
                data={[
                  { value: GLOBAL_WORKSPACE_FILTER, label: 'Global' },
                  ...workspaces.map((ws) => ({ value: ws.id, label: ws.name })),
                ]}
                disabled={workspacesLoading}
                searchable
                clearable
                style={{ minWidth: 180 }}
              />
            )}
            <TextInput
              placeholder="Search by name..."
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
              leftSection={<IconSearch size={16} />}
              style={{ flex: 1, minWidth: 200, maxWidth: 300 }}
            />
            {showFilters && !workspaceId && (
              <Button
                variant={filtersOpened ? 'filled' : 'outline'}
                leftSection={<IconFilter size={16} />}
                onClick={toggleFilters}
                color={panelFilterCount > 0 ? 'cyan' : 'gray'}
              >
                Filters
                {panelFilterCount > 0 && (
                  <Badge size="sm" ml="xs" circle>
                    {panelFilterCount}
                  </Badge>
                )}
              </Button>
            )}
        </>)}
        <Box style={{ flex: 1 }} />
        {showCreateButton && (
          <Group gap="md">
            <Group gap="xs">
              <Text size="sm" c="dimmed">New agent:</Text>
              <Button.Group>
                <Tooltip label="Visual Editor">
                  <Button
                    component={Link}
                    to={routes.newAgentEditor(workspaceId)}
                    variant="default"
                  >
                    <IconSchema size={16} style={{ color: 'var(--mantine-color-violet-5)' }} />
                  </Button>
                </Tooltip>
                <Tooltip label="JSON Editor">
                  <Button
                    variant="default"
                    onClick={() => openCreateAgent(workspaceId)}
                  >
                    <IconCode size={16} />
                  </Button>
                </Tooltip>
                <Tooltip label="Import Agent">
                  <Button
                    variant="default"
                    onClick={() => setImportModalOpened(true)}
                  >
                    <IconDownload size={16} />
                  </Button>
                </Tooltip>
                <Tooltip label="Clone from GitHub">
                  <Button
                    variant="default"
                    onClick={() => setGithubImportModalOpened(true)}
                  >
                    <IconBrandGithub size={16} />
                  </Button>
                </Tooltip>
              </Button.Group>
            </Group>
          </Group>
        )}
      </Group>

      {/* Expandable filters */}
      {viewMode === 'list' && showFilters && filtersOpened && !workspaceId && (
        <AgentFilters
          descriptionFilter={descriptionFilter}
          onDescriptionChange={setDescriptionFilter}
          createdAfter={createdAfter}
          onCreatedAfterChange={(val) => {
            setCreatedAfter(val);
            setPage(1);
          }}
          createdBefore={createdBefore}
          onCreatedBeforeChange={(val) => {
            setCreatedBefore(val);
            setPage(1);
          }}
          activeFilterCount={panelFilterCount}
          onClearFilters={clearPanelFilters}
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
      {/* {!loading && (
        <Text size="sm" c="dimmed" mb="md">
          {total} agent{total !== 1 ? 's' : ''} found
        </Text>
      )} */}
      {viewMode === 'list' && <Box mb="xl" />}

      {viewMode === 'graph' && workspaceId ? (
        <AgentsRelationsGraph
          workspaceId={workspaceId}
          topInset={48}
          refreshKey={graphVersion}
          onEdit={handleOpenEditModal}
          onDelete={setAgentToDelete}
          onClone={handleClone}
          onWorkspace={setAgentForWorkspace}
          onExport={handleExport}
        />
      ) : loading ? (
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
                onWorkspace={setAgentForWorkspace}
                onExport={handleExport}
                currentWorkspaceId={workspaceId}
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

          {showPagination && totalPages > 1 && (
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
        onDeleted={() => { reloadAgents(); onDelete?.(); }}
      />

      <AgentWorkspaceModal
        agent={agentForWorkspace}
        onClose={() => setAgentForWorkspace(null)}
        onSaved={reloadAgents}
      />

      <ModalAgentImport
        opened={importModalOpened}
        onClose={() => setImportModalOpened(false)}
        onImported={() => { reloadAgents(); onCreate?.(); }}
        workspaceId={workspaceId}
      />

      <ModalGitHubImport
        opened={githubImportModalOpened}
        onClose={() => setGithubImportModalOpened(false)}
        onImported={() => { reloadAgents(); onCreate?.(); }}
        workspaceId={workspaceId}
      />
    </Box>
  );
}
