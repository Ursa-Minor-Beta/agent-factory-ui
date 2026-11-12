import { useState, useRef } from 'react';
import { Box, Text, Button, Group, ActionIcon, Code } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconPlus, IconTrash, IconPencil, IconSearch } from '@tabler/icons-react';
import { secretsApi } from '../../api';
import type { SecretsSortBy } from '../../api/secrets';
import type { Secret } from '../../types';
import {
  DataTable,
  type DataTableColumn,
  type DataTableHandle,
  type DataTableQuery,
  type SortValue,
} from '../common/DataTable';
import { SecretModal } from './SecretModal';
import { DeleteConfirmModal } from '../DeleteConfirmModal';
import { WorkspaceBadge, useWorkspaceFilterOptions, GLOBAL_WORKSPACE } from '../Workspace';

export type SecretColumn = 'workspace' | 'name' | 'value' | 'description' | 'created' | 'updated' | 'actions';

const INITIAL_SORT: SortValue<SecretsSortBy> = { sortBy: 'name', sortOrder: 'asc' };

interface SecretsFilters {
  workspaceId: string | null;
  name: string;
}

interface SecretsListProps {
  workspaceId?: string;
  description?: string;
  /** Show the name search */
  showSearch?: boolean;
  /** Columns to leave out; all are shown by default */
  excludeColumns?: SecretColumn[];
  onCreate?: () => void;
  onDelete?: () => void;
}

export function SecretsList({
  workspaceId,
  description = '',
  showSearch = true,
  excludeColumns = [],
  onCreate,
  onDelete,
}: SecretsListProps) {
  const showColumn = (col: SecretColumn) => !excludeColumns.includes(col);
  const tableRef = useRef<DataTableHandle<Secret>>(null);
  const [error, setError] = useState('');
  const workspaceOptions = useWorkspaceFilterOptions(workspaceId === undefined);
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);
  const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);
  const [editingSecret, setEditingSecret] = useState<Secret | null>(null);
  const [deletingSecret, setDeletingSecret] = useState<Secret | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadSecrets = async ({ filters, sort }: DataTableQuery<SecretsFilters, SecretsSortBy>) => {
    const workspace = workspaceId ?? filters.workspaceId;
    const rows = await secretsApi.list({
      workspaceId: workspace ? (workspace === GLOBAL_WORKSPACE ? null : workspace) : undefined,
      name: filters.name || undefined,
      ...sort,
    });
    return { rows, total: rows.length };
  };

  const handleOpenCreateModal = () => {
    setEditingSecret(null);
    openModal();
  };

  const handleOpenEditModal = (secret: Secret) => {
    setEditingSecret(secret);
    openModal();
  };

  const handleCloseModal = () => {
    setEditingSecret(null);
    closeModal();
  };

  const handleSuccess = () => {
    const isNew = !editingSecret;
    handleCloseModal();
    tableRef.current?.reload();
    if (isNew) onCreate?.();
  };

  const handleOpenDeleteModal = (secret: Secret) => {
    setDeletingSecret(secret);
    openDeleteModal();
  };

  const handleDelete = async () => {
    if (!deletingSecret) return;
    setDeleting(true);
    try {
      await secretsApi.delete(deletingSecret.id);
      closeDeleteModal();
      const deletedId = deletingSecret.id;
      setDeletingSecret(null);
      tableRef.current?.setRows((prev) => prev.filter((s) => s.id !== deletedId));
      tableRef.current?.setTotal((prev) => prev - 1);
      onDelete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete secret');
    } finally {
      setDeleting(false);
    }
  };

  const tableColumns: DataTableColumn<Secret, SecretsFilters>[] = [
    {
      key: 'workspace',
      header: 'Workspace',
      hidden: !showColumn('workspace'),
      // Only when the list isn't already scoped to one workspace
      filter:
        workspaceId === undefined
          ? { type: 'select', key: 'workspaceId', placeholder: 'Workspace', options: workspaceOptions }
          : undefined,
      render: (secret) => <WorkspaceBadge workspaceName={secret.workspaceName} />,
    },
    {
      key: 'name',
      header: 'Name',
      hidden: !showColumn('name'),
      sortable: true,
      filter: showSearch
        ? { type: 'text', key: 'name', placeholder: 'Search by name', icon: <IconSearch size={16} /> }
        : undefined,
      render: (secret) => <Code>{secret.name}</Code>,
    },
    {
      key: 'value',
      header: 'Value',
      hidden: !showColumn('value'),
      render: (secret) => (
        <Text size="sm" c="dimmed">
          {secret.maskedValue}
        </Text>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      hidden: !showColumn('description'),
      render: (secret) => (
        <Text size="sm" c="dimmed" lineClamp={1}>
          {secret.description || '-'}
        </Text>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      hidden: !showColumn('created'),
      sortable: true,
      render: (secret) => (
        <Text size="sm" c="dimmed">
          {new Date(secret.createdAt).toLocaleDateString()}
        </Text>
      ),
    },
    {
      key: 'updatedAt',
      header: 'Updated',
      hidden: !showColumn('updated'),
      sortable: true,
      render: (secret) => (
        <Text size="sm" c="dimmed">
          {new Date(secret.updatedAt).toLocaleDateString()}
        </Text>
      ),
    },
    {
      key: 'actions',
      pinned: true,
      header: 'Actions',
      align: 'right',
      hidden: !showColumn('actions'),
      render: (secret) => (
        <Group gap="xs" justify="flex-end">
          <ActionIcon variant="subtle" onClick={() => handleOpenEditModal(secret)}>
            <IconPencil size={18} />
          </ActionIcon>
          <ActionIcon variant="subtle" color="red" onClick={() => handleOpenDeleteModal(secret)}>
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
        <Button leftSection={<IconPlus size={16} />} onClick={handleOpenCreateModal}>
          Add Secret
        </Button>
      </Group>

      <DataTable
        // Remount on workspace change so the list reloads for the new workspace
        key={workspaceId ?? 'all'}
        ref={tableRef}
        columns={tableColumns}
        getRowId={(secret) => secret.id}
        loadData={loadSecrets}
        error={error}
        onErrorClose={() => setError('')}
        emptyMessage="No secrets configured"
        noMatchMessage="No secrets match your search"
        initialSort={INITIAL_SORT}
        paginated={false}
        itemLabel={['secret', 'secrets']}
      />

      <SecretModal
        opened={modalOpened}
        onClose={handleCloseModal}
        secret={editingSecret}
        workspaceId={workspaceId}
        onSuccess={handleSuccess}
      />

      <DeleteConfirmModal
        opened={deleteModalOpened}
        onClose={closeDeleteModal}
        onDelete={handleDelete}
        deleting={deleting}
        title="Delete Secret"
        entityName={<Code>{deletingSecret?.name}</Code>}
      />
    </Box>
  );
}
