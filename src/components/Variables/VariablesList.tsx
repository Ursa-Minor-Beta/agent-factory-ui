import { useState, useRef } from 'react';
import { Box, Text, Button, Group, ActionIcon, Code } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconPlus, IconTrash, IconPencil, IconSearch } from '@tabler/icons-react';
import { variablesApi } from '../../api';
import type { VariablesSortBy } from '../../api/variables';
import type { Variable } from '../../types';
import {
  DataTable,
  type DataTableColumn,
  type DataTableHandle,
  type DataTableQuery,
  type SortValue,
} from '../common/DataTable';
import { VariableModal } from './VariableModal';
import { DeleteConfirmModal } from '../DeleteConfirmModal';
import { WorkspaceBadge, useWorkspaceFilterOptions, GLOBAL_WORKSPACE } from '../Workspace';

export type VariableColumn = 'workspace' | 'name' | 'value' | 'description' | 'created' | 'updated' | 'actions';

const INITIAL_SORT: SortValue<VariablesSortBy> = { sortBy: 'name', sortOrder: 'asc' };

interface VariablesFilters {
  workspaceId: string | null;
  name: string;
}

interface VariablesListProps {
  workspaceId?: string;
  description?: string;
  /** Show the name search */
  showSearch?: boolean;
  /** Columns to leave out; all are shown by default */
  excludeColumns?: VariableColumn[];
  onCreate?: () => void;
  onDelete?: () => void;
}

export function VariablesList({
  workspaceId,
  description = '',
  showSearch = true,
  excludeColumns = [],
  onCreate,
  onDelete,
}: VariablesListProps) {
  const showColumn = (col: VariableColumn) => !excludeColumns.includes(col);
  const tableRef = useRef<DataTableHandle<Variable>>(null);
  const [error, setError] = useState('');
  const workspaceOptions = useWorkspaceFilterOptions(workspaceId === undefined);
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);
  const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);
  const [editingVariable, setEditingVariable] = useState<Variable | null>(null);
  const [deletingVariable, setDeletingVariable] = useState<Variable | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadVariables = async ({ filters, sort }: DataTableQuery<VariablesFilters, VariablesSortBy>) => {
    const workspace = workspaceId ?? filters.workspaceId;
    const rows = await variablesApi.list({
      workspaceId: workspace ? (workspace === GLOBAL_WORKSPACE ? null : workspace) : undefined,
      name: filters.name || undefined,
      ...sort,
    });
    return { rows, total: rows.length };
  };

  const handleOpenCreateModal = () => {
    setEditingVariable(null);
    openModal();
  };

  const handleOpenEditModal = (variable: Variable) => {
    setEditingVariable(variable);
    openModal();
  };

  const handleCloseModal = () => {
    setEditingVariable(null);
    closeModal();
  };

  const handleSuccess = () => {
    const isNew = !editingVariable;
    handleCloseModal();
    tableRef.current?.reload();
    if (isNew) onCreate?.();
  };

  const handleOpenDeleteModal = (variable: Variable) => {
    setDeletingVariable(variable);
    openDeleteModal();
  };

  const handleDelete = async () => {
    if (!deletingVariable) return;
    setDeleting(true);
    try {
      await variablesApi.delete(deletingVariable.id);
      closeDeleteModal();
      const deletedId = deletingVariable.id;
      setDeletingVariable(null);
      tableRef.current?.setRows((prev) => prev.filter((s) => s.id !== deletedId));
      tableRef.current?.setTotal((prev) => prev - 1);
      onDelete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete variable');
    } finally {
      setDeleting(false);
    }
  };

  const tableColumns: DataTableColumn<Variable, VariablesFilters>[] = [
    {
      key: 'workspace',
      header: 'Workspace',
      hidden: !showColumn('workspace'),
      // Only when the list isn't already scoped to one workspace
      filter:
        workspaceId === undefined
          ? { type: 'select', key: 'workspaceId', placeholder: 'Workspace', options: workspaceOptions }
          : undefined,
      render: (variable) => <WorkspaceBadge workspaceName={variable.workspaceName} />,
    },
    {
      key: 'name',
      header: 'Name',
      hidden: !showColumn('name'),
      sortable: true,
      filter: showSearch
        ? { type: 'text', key: 'name', placeholder: 'Search by name', icon: <IconSearch size={16} /> }
        : undefined,
      render: (variable) => <Code>{variable.name}</Code>,
    },
    {
      key: 'value',
      header: 'Value',
      hidden: !showColumn('value'),
      render: (variable) => (
        <Text size="sm" c="dimmed">
          {variable.value}
        </Text>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      hidden: !showColumn('description'),
      render: (variable) => (
        <Text size="sm" c="dimmed" lineClamp={1}>
          {variable.description || '-'}
        </Text>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      hidden: !showColumn('created'),
      sortable: true,
      render: (variable) => (
        <Text size="sm" c="dimmed">
          {new Date(variable.createdAt).toLocaleDateString()}
        </Text>
      ),
    },
    {
      key: 'updatedAt',
      header: 'Updated',
      hidden: !showColumn('updated'),
      sortable: true,
      render: (variable) => (
        <Text size="sm" c="dimmed">
          {new Date(variable.updatedAt).toLocaleDateString()}
        </Text>
      ),
    },
    {
      key: 'actions',
      pinned: true,
      header: 'Actions',
      align: 'right',
      hidden: !showColumn('actions'),
      render: (variable) => (
        <Group gap="xs" justify="flex-end">
          <ActionIcon variant="subtle" onClick={() => handleOpenEditModal(variable)}>
            <IconPencil size={18} />
          </ActionIcon>
          <ActionIcon variant="subtle" color="red" onClick={() => handleOpenDeleteModal(variable)}>
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
          Add Variable
        </Button>
      </Group>

      <DataTable
        // Remount on workspace change so the list reloads for the new workspace
        key={workspaceId ?? 'all'}
        ref={tableRef}
        columns={tableColumns}
        getRowId={(variable) => variable.id}
        loadData={loadVariables}
        error={error}
        onErrorClose={() => setError('')}
        emptyMessage="No variables configured"
        noMatchMessage="No variables match your search"
        initialSort={INITIAL_SORT}
        paginated={false}
        itemLabel={['variable', 'variables']}
      />

      <VariableModal
        opened={modalOpened}
        onClose={handleCloseModal}
        variable={editingVariable}
        workspaceId={workspaceId}
        onSuccess={handleSuccess}
      />

      <DeleteConfirmModal
        opened={deleteModalOpened}
        onClose={closeDeleteModal}
        onDelete={handleDelete}
        deleting={deleting}
        title="Delete Variable"
        entityName={<Code>{deletingVariable?.name}</Code>}
      />
    </Box>
  );
}
