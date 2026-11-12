import { useState, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { Box, Text, Button, Group, ActionIcon, Badge, Tooltip } from '@mantine/core';
import { useDisclosure, useClipboard } from '@mantine/hooks';
import {
  IconPlus,
  IconTrash,
  IconPencil,
  IconSearch,
  IconCopy,
  IconCheck,
} from '@tabler/icons-react';
import { memoryApi } from '../../api';
import type { SchemasSortBy } from '../../api/memory';
import type { MemorySchema } from '../../types';
import {
  DataTable,
  type DataTableColumn,
  type DataTableHandle,
  type DataTableQuery,
  type SortValue,
} from '../common/DataTable';
import { CollectionModal } from './CollectionModal';
import { DeleteConfirmModal } from '../DeleteConfirmModal';
import { WorkspaceBadge, useWorkspaceFilterOptions, GLOBAL_WORKSPACE } from '../Workspace';
import { routes } from '../../config/routes';

export type CollectionColumn = 'workspace' | 'name' | 'description' | 'records' | 'fields' | 'created' | 'actions';

interface CollectionsFilters {
  workspaceId: string | null;
  name: string;
  description: string;
}

const INITIAL_SORT: SortValue<SchemasSortBy> = { sortBy: 'createdAt', sortOrder: 'desc' };

// The API caps a page at 100 and doesn't return a total yet, so load one full page
const LIST_LIMIT = 100;

interface CollectionsListProps {
  workspaceId?: string;
  description?: string;
  /** Show the search */
  showSearch?: boolean;
  /** Columns to leave out; all are shown by default */
  excludeColumns?: CollectionColumn[];
  onCreate?: () => void;
  onDelete?: () => void;
}

export function CollectionsList({
  workspaceId,
  description = '',
  showSearch = true,
  excludeColumns = [],
  onCreate,
  onDelete,
}: CollectionsListProps) {
  const showColumn = (col: CollectionColumn) => !excludeColumns.includes(col);
  const tableRef = useRef<DataTableHandle<MemorySchema>>(null);
  const clipboard = useClipboard({ timeout: 1500 });
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);
  const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);
  const [editingCollection, setEditingCollection] = useState<MemorySchema | null>(null);
  const [deletingCollection, setDeletingCollection] = useState<MemorySchema | null>(null);
  const [deleting, setDeleting] = useState(false);
  const workspaceOptions = useWorkspaceFilterOptions(workspaceId === undefined);

  const loadCollections = async ({ filters, sort }: DataTableQuery<CollectionsFilters, SchemasSortBy>) => {
    const workspace = workspaceId ?? filters.workspaceId;
    const rows = await memoryApi.listSchemas({
      ...sort,
      limit: LIST_LIMIT,
      name: filters.name || undefined,
      description: filters.description || undefined,
      workspaceId: workspace ? (workspace === GLOBAL_WORKSPACE ? null : workspace) : undefined,
    });
    return { rows, total: rows.length };
  };

  const handleOpenCreateModal = () => {
    setEditingCollection(null);
    openModal();
  };

  const handleOpenEditModal = (collection: MemorySchema) => {
    setEditingCollection(collection);
    openModal();
  };

  const handleCloseModal = () => {
    setEditingCollection(null);
    closeModal();
  };

  const handleSuccess = () => {
    const isNew = !editingCollection;
    handleCloseModal();
    tableRef.current?.reload();
    if (isNew) onCreate?.();
  };

  const handleOpenDeleteModal = (collection: MemorySchema) => {
    setDeletingCollection(collection);
    openDeleteModal();
  };

  const handleDelete = async () => {
    if (!deletingCollection) return;
    setDeleting(true);
    try {
      await memoryApi.deleteSchema(deletingCollection.id);
      closeDeleteModal();
      const deletedId = deletingCollection.id;
      setDeletingCollection(null);
      tableRef.current?.setRows((prev) => prev.filter((c) => c.id !== deletedId));
      tableRef.current?.setTotal((prev) => prev - 1);
      onDelete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete collection');
    } finally {
      setDeleting(false);
    }
  };

  const columns: DataTableColumn<MemorySchema, CollectionsFilters>[] = [
    {
      key: 'workspace',
      header: 'Workspace',
      hidden: !showColumn('workspace'),
      // Only when the list isn't already scoped to one workspace
      filter:
        workspaceId === undefined
          ? { type: 'select', key: 'workspaceId', placeholder: 'Workspace', options: workspaceOptions }
          : undefined,
      render: (collection) => <WorkspaceBadge workspaceName={collection.workspaceName} />,
    },
    {
      key: 'name',
      header: 'Name',
      hidden: !showColumn('name'),
      sortable: true,
      filter: showSearch
        ? {
            type: 'text',
            key: 'name',
            placeholder: 'Search by name',
            icon: <IconSearch size={16} />,
            debounce: 300,
          }
        : undefined,
      render: (collection) => {
        const copied = clipboard.copied && copiedId === collection.id;
        return (
          <Group gap="xs" wrap="nowrap">
            <Tooltip label="View Records">
              <NavLink to={routes.collectionRecords(collection.id)}>
                <Text size="sm">{collection.name}</Text>
              </NavLink>
            </Tooltip>
            <Tooltip label={copied ? 'Copied!' : 'Copy name'}>
              <ActionIcon
                variant="subtle"
                size="xs"
                color={copied ? 'green' : 'gray'}
                onClick={() => {
                  setCopiedId(collection.id);
                  clipboard.copy(collection.name);
                }}
              >
                {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
              </ActionIcon>
            </Tooltip>
          </Group>
        );
      },
    },
    {
      key: 'description',
      header: 'Description',
      hidden: !showColumn('description'),
      filter: showSearch
        ? { type: 'text', key: 'description', placeholder: 'Search description', debounce: 300 }
        : undefined,
      render: (collection) => (
        <Text size="sm" c="dimmed" lineClamp={1}>
          {collection.description || '-'}
        </Text>
      ),
    },
    {
      key: 'records',
      header: 'Records',
      hidden: !showColumn('records'),
      render: (collection) => (
        <Text size="sm" c="dimmed">
          {collection.recordCount ?? 0}
        </Text>
      ),
    },
    {
      key: 'fields',
      header: 'Fields',
      hidden: !showColumn('fields'),
      render: (collection) => (
        <Group gap={4}>
          {collection.fields.slice(0, 3).map((field) => (
            <Badge key={field.name} size="xs" variant="light">
              {field.name}
            </Badge>
          ))}
          {collection.fields.length > 3 && (
            <Badge size="xs" variant="outline" c="dimmed">
              +{collection.fields.length - 3}
            </Badge>
          )}
        </Group>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      hidden: !showColumn('created'),
      sortable: true,
      render: (collection) => (
        <Text size="sm" c="dimmed">
          {new Date(collection.createdAt).toLocaleDateString()}
        </Text>
      ),
    },
    {
      key: 'actions',
      pinned: true,
      header: 'Actions',
      align: 'right',
      hidden: !showColumn('actions'),
      render: (collection) => (
        <Group gap="xs" justify="flex-end" wrap="nowrap">
          <Tooltip label="Edit">
            <ActionIcon variant="subtle" onClick={() => handleOpenEditModal(collection)}>
              <IconPencil size={18} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Delete">
            <ActionIcon variant="subtle" color="red" onClick={() => handleOpenDeleteModal(collection)}>
              <IconTrash size={18} />
            </ActionIcon>
          </Tooltip>
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
          Add Collection
        </Button>
      </Group>

      <DataTable
        // Remount on workspace change so the list reloads for the new workspace
        key={workspaceId ?? 'all'}
        ref={tableRef}
        columns={columns}
        getRowId={(collection) => collection.id}
        loadData={loadCollections}
        error={error}
        onErrorClose={() => setError('')}
        emptyMessage="No collections configured"
        noMatchMessage="No collections match your filters"
        initialSort={INITIAL_SORT}
        paginated={false}
        itemLabel={['collection', 'collections']}
      />

      <CollectionModal
        opened={modalOpened}
        onClose={handleCloseModal}
        collection={editingCollection}
        workspaceId={workspaceId}
        onSuccess={handleSuccess}
      />

      <DeleteConfirmModal
        opened={deleteModalOpened}
        onClose={closeDeleteModal}
        onDelete={handleDelete}
        deleting={deleting}
        title="Delete Collection"
        entityName={deletingCollection?.name}
        subtitle="All records in this collection will be permanently deleted."
      />
    </Box>
  );
}
