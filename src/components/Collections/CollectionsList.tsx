import { useState, useEffect, useCallback } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Box,
  Text,
  Button,
  Card,
  Group,
  ActionIcon,
  TextInput,
  Loader,
  Alert,
  Table,
  Center,
  Badge,
  Tooltip,
} from '@mantine/core';
import { useDisclosure, useClipboard } from '@mantine/hooks';
import {
  IconPlus,
  IconTrash,
  IconPencil,
  IconSearch,
  IconAlertCircle,
  IconCopy,
  IconCheck,
} from '@tabler/icons-react';
import { memoryApi } from '../../api';
import type { MemorySchema } from '../../types';
import { CollectionModal } from './CollectionModal';
import { DeleteConfirmModal } from '../DeleteConfirmModal';
import { WorkspaceBadge } from '../Workspace';

export type CollectionColumn = 'workspace' | 'name' | 'description' | 'records' | 'fields' | 'created' | 'actions';

const DEFAULT_COLUMNS: CollectionColumn[] = ['workspace', 'name', 'description', 'records', 'fields', 'created', 'actions'];

interface CollectionsListProps {
  workspaceId?: string;
  description?: string;
  showSearch?: boolean;
  columns?: CollectionColumn[];
  onCreate?: () => void;
  onDelete?: () => void;
}

export function CollectionsList({
  workspaceId,
  description = '',
  showSearch = true,
  columns = DEFAULT_COLUMNS,
  onCreate,
  onDelete,
}: CollectionsListProps) {
  const showColumn = (col: CollectionColumn) => columns.includes(col);
  const clipboard = useClipboard({ timeout: 1500 });
  const [collections, setCollections] = useState<MemorySchema[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);
  const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);
  const [editingCollection, setEditingCollection] = useState<MemorySchema | null>(null);
  const [deletingCollection, setDeletingCollection] = useState<MemorySchema | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');

  const loadCollections = useCallback(async (searchQuery?: string) => {
    try {
      setLoading(true);
      const data = await memoryApi.listSchemas({
        search: searchQuery || undefined,
        workspaceId: workspaceId !== undefined ? workspaceId : undefined,
      });
      setCollections(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load collections');
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounced(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Load collections when debounced search changes
  useEffect(() => {
    loadCollections(searchDebounced);
  }, [searchDebounced, loadCollections]);

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
    loadCollections(searchDebounced);
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
      setDeletingCollection(null);
      loadCollections(searchDebounced);
      onDelete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete collection');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <Center py="xl">
        <Loader />
      </Center>
    );
  }

  return (
    <Box>
      <Group mb="md" justify="space-between" gap="sm">
        <Text c="dimmed" size="sm">
          {description}
        </Text>
        {showSearch && (
          <TextInput
            placeholder="Search collections..."
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            leftSection={<IconSearch size={16} />}
            style={{ flex: 1, maxWidth: 300 }}
          />
        )}
        <Button leftSection={<IconPlus size={16} />} onClick={handleOpenCreateModal}>
          Add Collection
        </Button>
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
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              {showColumn('workspace') && <Table.Th>Workspace</Table.Th>}
              {showColumn('name') && <Table.Th>Name</Table.Th>}
              {showColumn('description') && <Table.Th>Description</Table.Th>}
              {showColumn('records') && <Table.Th>Records</Table.Th>}
              {showColumn('fields') && <Table.Th>Fields</Table.Th>}
              {showColumn('created') && <Table.Th>Created</Table.Th>}
              {showColumn('actions') && <Table.Th style={{ textAlign: 'right' }}>Actions</Table.Th>}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {collections.map((collection) => (
              <Table.Tr key={collection.id}>
                {showColumn('workspace') && (
                  <Table.Td>
                    <WorkspaceBadge workspaceName={collection.workspaceName} />
                  </Table.Td>
                )}
                {showColumn('name') && (
                  <Table.Td>
                    <Group gap="xs" wrap="nowrap">
                      <Tooltip label="View Records">
                        <NavLink to={`/collections/${collection.id}/records`}>
                          <Text size="sm">{collection.name}</Text>
                        </NavLink>
                      </Tooltip>
                      <Tooltip label={clipboard.copied ? 'Copied!' : 'Copy name'}>
                        <ActionIcon
                          variant="subtle"
                          size="xs"
                          color={clipboard.copied ? 'green' : 'gray'}
                          onClick={() => clipboard.copy(collection.name)}
                        >
                          {clipboard.copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Table.Td>
                )}
                {showColumn('description') && (
                  <Table.Td>
                    <Text size="sm" c="dimmed" lineClamp={1}>
                      {collection.description || '-'}
                    </Text>
                  </Table.Td>
                )}
                {showColumn('records') && (
                  <Table.Td>
                    <Text size="sm" c="dimmed">
                      {collection.recordCount ?? 0}
                    </Text>
                  </Table.Td>
                )}
                {showColumn('fields') && (
                  <Table.Td>
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
                  </Table.Td>
                )}
                {showColumn('created') && (
                  <Table.Td>
                    <Text size="sm" c="dimmed">
                      {new Date(collection.createdAt).toLocaleDateString()}
                    </Text>
                  </Table.Td>
                )}
                {showColumn('actions') && (
                  <Table.Td style={{ textAlign: 'right' }}>
                    <Group gap="xs" justify="flex-end" wrap="nowrap">
                      <Tooltip label="Edit">
                        <ActionIcon
                          variant="subtle"
                          onClick={() => handleOpenEditModal(collection)}
                        >
                          <IconPencil size={18} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label="Delete">
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          onClick={() => handleOpenDeleteModal(collection)}
                        >
                          <IconTrash size={18} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Table.Td>
                )}
              </Table.Tr>
            ))}
            {collections.length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={columns.filter((c) => showColumn(c)).length}>
                  <Text ta="center" c="dimmed" py="md" size="sm">
                    {search ? 'No collections match your search' : 'No collections configured'}
                  </Text>
                </Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      </Card>

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
