import { useState, useRef, useEffect } from 'react';
import { Box, Text, Button, Group, ActionIcon, Badge } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconPlus,
  IconTrash,
  IconPencil,
  IconStar,
  IconStarFilled,
  IconSearch,
} from '@tabler/icons-react';
import { providersApi } from '../../api';
import type { ListProvidersOptions, ProvidersSortBy } from '../../api/providers';
import type { ProviderConfig, ProviderPreset, ProviderType } from '../../types';
import {
  DataTable,
  type DataTableColumn,
  type DataTableHandle,
  type DataTableQuery,
} from '../common/DataTable';
import { ProviderModal } from './ProviderModal';
import { DeleteConfirmModal } from '../DeleteConfirmModal';
import { WorkspaceBadge, useWorkspaceFilterOptions, GLOBAL_WORKSPACE } from '../Workspace';

export type ProviderColumn =
  | 'workspace'
  | 'name'
  | 'provider'
  | 'apiKey'
  | 'baseUrl'
  | 'default'
  | 'createdAt'
  | 'updatedAt'
  | 'actions';

interface ProvidersFilters {
  workspaceId: string | null;
  provider: string | null;
  name: string;
}

interface ProvidersListProps {
  workspaceId?: string;
  description?: string;
  /** Show the name search and provider type filter */
  showSearch?: boolean;
  /** Columns to leave out; all are shown by default */
  excludeColumns?: ProviderColumn[];
  onCreate?: () => void;
  onDelete?: () => void;
}

export function ProvidersList({
  workspaceId,
  description = '',
  showSearch = true,
  excludeColumns = [],
  onCreate,
  onDelete,
}: ProvidersListProps) {
  const showColumn = (col: ProviderColumn) => !excludeColumns.includes(col);
  const tableRef = useRef<DataTableHandle<ProviderConfig>>(null);
  const [error, setError] = useState('');
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);
  const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);
  const [deleting, setDeleting] = useState(false);
  const [deletingProvider, setDeletingProvider] = useState<ProviderConfig | null>(null);
  const [editingProvider, setEditingProvider] = useState<ProviderConfig | null>(null);
  const workspaceOptions = useWorkspaceFilterOptions(workspaceId === undefined);
  // Provider type filter options come from the backend presets
  const [presets, setPresets] = useState<ProviderPreset[]>([]);

  useEffect(() => {
    providersApi.getPresets().then(setPresets).catch(() => setPresets([]));
  }, []);

  const loadProviders = async ({ filters, sort }: DataTableQuery<ProvidersFilters, ProvidersSortBy>) => {
    const options: ListProvidersOptions = { ...sort };
    const workspace = workspaceId ?? filters.workspaceId;
    if (workspace) options.workspaceId = workspace === GLOBAL_WORKSPACE ? null : workspace;
    if (filters.provider) options.provider = filters.provider as ProviderType;
    if (filters.name) options.name = filters.name;

    const rows = await providersApi.list(options);
    return { rows, total: rows.length };
  };

  const reload = () => tableRef.current?.reload();

  const handleOpenDeleteModal = (provider: ProviderConfig) => {
    setDeletingProvider(provider);
    openDeleteModal();
  };

  const handleEdit = (provider: ProviderConfig) => {
    setEditingProvider(provider);
    openModal();
  };

  const handleModalClose = () => {
    setEditingProvider(null);
    closeModal();
  };

  const handleDelete = async () => {
    if (!deletingProvider) return;
    setDeleting(true);
    try {
      await providersApi.delete(deletingProvider.id);
      closeDeleteModal();
      const deletedId = deletingProvider.id;
      setDeletingProvider(null);
      tableRef.current?.setRows((prev) => prev.filter((p) => p.id !== deletedId));
      tableRef.current?.setTotal((prev) => prev - 1);
      onDelete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete provider');
    } finally {
      setDeleting(false);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await providersApi.setDefault(id);
      // Default can move between providers, so refetch rather than patch one row
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set default');
    }
  };

  const tableColumns: DataTableColumn<ProviderConfig, ProvidersFilters>[] = [
    {
      key: 'provider',
      header: 'Provider',
      hidden: !showColumn('provider'),
      sortable: true,
      filter: showSearch
        ? {
            type: 'select',
            key: 'provider',
            placeholder: 'Provider type',
            options: presets.map((preset) => ({ value: preset.provider, label: preset.label })),
          }
        : undefined,
      render: (provider) => <Badge variant="light">{provider.provider}</Badge>,
    },
    {
      key: 'workspace',
      header: 'Workspace',
      hidden: !showColumn('workspace'),
      // Only when the list isn't already scoped to one workspace
      filter:
        workspaceId === undefined
          ? { type: 'select', key: 'workspaceId', placeholder: 'Workspace', options: workspaceOptions }
          : undefined,
      render: (provider) => <WorkspaceBadge workspaceName={provider.workspaceName} />,
    },
    {
      key: 'default',
      header: 'Default',
      hidden: !showColumn('default'),
      render: (provider) => (
        <ActionIcon
          variant="subtle"
          color={provider.isDefault ? 'yellow' : 'gray'}
          onClick={() => handleSetDefault(provider.id)}
        >
          {provider.isDefault ? <IconStarFilled size={18} /> : <IconStar size={18} />}
        </ActionIcon>
      ),
    },
    {
      key: 'name',
      header: 'Name',
      hidden: !showColumn('name'),
      sortable: true,
      filter: showSearch
        ? { type: 'text', key: 'name', placeholder: 'Search by name', icon: <IconSearch size={16} /> }
        : undefined,
      render: (provider) => provider.name,
    },
    {
      key: 'apiKey',
      header: 'API Key',
      hidden: !showColumn('apiKey'),
      render: (provider) => (
        <Text size="sm" c="dimmed">
          {provider.config.apiKey ? '••••••••' : '-'}
        </Text>
      ),
    },
    {
      key: 'baseUrl',
      header: 'Base URL',
      hidden: !showColumn('baseUrl'),
      render: (provider) => (
        <Text size="sm" c="dimmed">
          {provider.config.baseUrl || '-'}
        </Text>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      hidden: !showColumn('createdAt'),
      sortable: true,
      render: (provider) => (
        <Text size="sm" c="dimmed">
          {new Date(provider.createdAt).toLocaleDateString()}
        </Text>
      ),
    },
    {
      key: 'updatedAt',
      header: 'Updated',
      hidden: !showColumn('updatedAt'),
      sortable: true,
      render: (provider) => (
        <Text size="sm" c="dimmed">
          {new Date(provider.updatedAt).toLocaleDateString()}
        </Text>
      ),
    },
    {
      key: 'actions',
      pinned: true,
      header: 'Actions',
      align: 'right',
      hidden: !showColumn('actions'),
      render: (provider) => (
        <Group gap="xs" justify="flex-end">
          <ActionIcon variant="subtle" onClick={() => handleEdit(provider)}>
            <IconPencil size={18} />
          </ActionIcon>
          <ActionIcon variant="subtle" color="red" onClick={() => handleOpenDeleteModal(provider)}>
            <IconTrash size={18} />
          </ActionIcon>
        </Group>
      ),
    },
  ];

  return (
    <Box>
      <Group mb="md" justify="space-between" gap="sm">
        <Text c="dimmed" size="sm">
          {description}
        </Text>
        <Button leftSection={<IconPlus size={16} />} onClick={openModal}>
          Add Provider
        </Button>
      </Group>

      <DataTable
        // Remount on workspace change so the list reloads for the new workspace
        key={workspaceId ?? 'all'}
        ref={tableRef}
        columns={tableColumns}
        getRowId={(provider) => provider.id}
        loadData={loadProviders}
        error={error}
        onErrorClose={() => setError('')}
        emptyMessage="No providers configured"
        noMatchMessage="No providers match your filters"
        paginated={false}
        itemLabel={['provider', 'providers']}
      />

      <ProviderModal
        opened={modalOpened}
        onClose={handleModalClose}
        workspaceId={workspaceId}
        onSuccess={() => { reload(); onCreate?.(); }}
        provider={editingProvider ?? undefined}
      />

      <DeleteConfirmModal
        opened={deleteModalOpened}
        onClose={closeDeleteModal}
        onDelete={handleDelete}
        deleting={deleting}
        title="Delete Provider"
        entityName={deletingProvider?.name}
      />
    </Box>
  );
}
