import { type ReactNode, type Ref } from 'react';
import { Link } from 'react-router-dom';
import { ActionIcon, Anchor, Badge, Group, SimpleGrid, Text, Tooltip } from '@mantine/core';
import { IconBrandGithub, IconMessageCircle, IconSchema, IconSearch } from '@tabler/icons-react';
import { agentsApi } from '../../api';
import type { Agent, AgentQueryParams } from '../../types';
import {
  DataTable,
  type DataTableColumn,
  type DataTableHandle,
  type DataTableQuery,
  type SortValue,
} from '../common/DataTable';
import { WorkspaceBadge, useWorkspaceFilterOptions, GLOBAL_WORKSPACE } from '../Workspace';
import { routes } from '../../config/routes';
import { AgentActionsMenu } from './AgentActionsMenu';
import { AgentCard } from './AgentCard';
import type { AgentCardProps } from './types';

type AgentsSortBy = NonNullable<AgentQueryParams['sortBy']>;

interface AgentsFilters {
  workspaceId: string | null;
  name: string;
  description: string;
  createdAfter: Date | null;
  createdBefore: Date | null;
}

const INITIAL_SORT: SortValue<AgentsSortBy> = { sortBy: 'name', sortOrder: 'asc' };

type AgentsTableProps = Pick<AgentCardProps, 'onEdit' | 'onDelete' | 'onClone' | 'onWorkspace' | 'onExport'> & {
  ref?: Ref<DataTableHandle<Agent>>;
  /** Scope to one workspace; otherwise a workspace filter is shown */
  workspaceId?: string;
  error?: string;
  onErrorClose?: () => void;
  /** Card grid or table; both share filters, sort and paging */
  view?: 'cards' | 'table';
  /** Shown before / after the filters in the same row */
  toolbarLeft?: ReactNode;
  toolbarRight?: ReactNode;
};

// Table view of the agents list; loads, filters and sorts on the server through DataTable
export function AgentsTable({
  ref,
  workspaceId,
  view = 'table',
  error,
  onErrorClose,
  toolbarLeft,
  toolbarRight,
  ...handlers
}: AgentsTableProps) {
  const workspaceOptions = useWorkspaceFilterOptions(workspaceId === undefined);

  const loadAgents = async ({
    filters,
    sort,
    page,
    pageSize,
  }: DataTableQuery<AgentsFilters, AgentsSortBy>) => {
    const params: AgentQueryParams = { ...sort, skip: (page - 1) * pageSize, limit: pageSize };
    if (workspaceId) {
      params.workspaceId = workspaceId;
    } else if (filters.workspaceId) {
      params.workspaceId = filters.workspaceId === GLOBAL_WORKSPACE ? null : filters.workspaceId;
    }
    if (filters.name) params.name = filters.name;
    if (filters.description) params.description = filters.description;
    if (filters.createdAfter) params.createdAfter = filters.createdAfter.toISOString();
    if (filters.createdBefore) params.createdBefore = filters.createdBefore.toISOString();

    const data = await agentsApi.list(params);
    return { rows: data.agents, total: data.total };
  };

  const columns: DataTableColumn<Agent, AgentsFilters>[] = [
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      filter: {
        type: 'text',
        key: 'name',
        placeholder: 'Search by name...',
        icon: <IconSearch size={16} />,
        debounce: 300,
      },
      render: (agent) => (
        <Group gap={6} wrap="nowrap">
          <Anchor component={Link} to={routes.agentEditor(agent.id)} size="sm" fw={600}>
            {agent.name}
          </Anchor>
          {agent.defaultName && <Text size="xs" c="dimmed">DEFAULT</Text>}
          {agent.systemName && <Text size="xs" c="dimmed">SYSTEM</Text>}
          {agent.github && (
            <Tooltip label={`${agent.github.rootId ? 'Sub' : 'Root'} agent: ${agent.github.repository}/${agent.github.path}`}>
              <Badge
                size="xs"
                variant={agent.github.rootId ? 'outline' : 'light'}
                color="gray"
                leftSection={<IconBrandGithub size={12} />}
              >
                {agent.github.rootId ? 'sub' : 'root'}
              </Badge>
            </Tooltip>
          )}
        </Group>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      filter: { type: 'text', key: 'description', placeholder: 'Search description', debounce: 300 },
      render: (agent) => (
        <Text size="sm" c="dimmed" lineClamp={1} maw={400}>
          {agent.description || '-'}
        </Text>
      ),
    },
    {
      key: 'workspace',
      header: 'Workspace',
      // Inside a workspace every agent has the same one
      hidden: workspaceId !== undefined,
      filter: workspaceId === undefined
        ? { type: 'select', key: 'workspaceId', placeholder: 'All workspaces', options: workspaceOptions }
        : undefined,
      render: (agent) => <WorkspaceBadge workspaceId={agent.workspaceId} workspaceName={agent.workspaceName} />,
    },
    {
      key: 'nodes',
      header: 'Nodes',
      render: (agent) => (
        <Text size="sm" c="dimmed">
          {agent.nodesCount || 0}
        </Text>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      sortable: true,
      filter: [
        { type: 'date', key: 'createdAfter', placeholder: 'Created after' },
        { type: 'date', key: 'createdBefore', placeholder: 'Created before' },
      ],
      render: (agent) => (
        <Text size="sm" c="dimmed">
          {new Date(agent.createdAt).toLocaleDateString()}
        </Text>
      ),
    },
    {
      key: 'updatedAt',
      header: 'Updated',
      sortable: true,
      render: (agent) => (
        <Text size="sm" c="dimmed">
          {new Date(agent.updatedAt).toLocaleDateString()}
        </Text>
      ),
    },
    {
      key: 'actions',
      pinned: true,
      align: 'right',
      render: (agent) => (
        <Group gap="xs" justify="flex-end" wrap="nowrap">
          <Tooltip label="Chat">
            <ActionIcon component={Link} to={routes.agentChat(agent.id)} variant="subtle" color="cyan">
              <IconMessageCircle size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Visual Editor">
            <ActionIcon component={Link} to={routes.agentEditor(agent.id)} variant="subtle" color="gray">
              <IconSchema size={16} />
            </ActionIcon>
          </Tooltip>
          <AgentActionsMenu agent={agent} {...handlers} />
        </Group>
      ),
    },
  ];

  return (
    <DataTable
      // Remount on workspace change so the list reloads for the new workspace
      key={workspaceId ?? 'all'}
      ref={ref}
      columns={columns}
      getRowId={(agent) => agent.id}
      loadData={loadAgents}
      emptyMessage="No agents yet. Create your first agent to get started."
      noMatchMessage="No agents match your filters."
      initialSort={INITIAL_SORT}
      itemLabel={['agent', 'agents']}
      error={error}
      onErrorClose={onErrorClose}
      toolbarLeft={toolbarLeft}
      toolbarRight={toolbarRight}
      renderContent={
        view === 'cards'
          ? (agents) => (
              <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
                {agents.map((agent) => (
                  <AgentCard key={agent.id} agent={agent} currentWorkspaceId={workspaceId} {...handlers} />
                ))}
              </SimpleGrid>
            )
          : undefined
      }
    />
  );
}
