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
import type { MemorySchema, MemorySchemaField } from '../../types';
import { CollectionModal } from './CollectionModal';
import { CollectionDeleteModal } from './CollectionDeleteModal';

interface SchemaFormData {
  name: string;
  description: string;
  fields: MemorySchemaField[];
}

export function CollectionsPage() {
  const clipboard = useClipboard({ timeout: 1500 });
  const [collections, setCollections] = useState<MemorySchema[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);
  const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);
  const [editingCollection, setEditingCollection] = useState<MemorySchema | null>(null);
  const [deletingCollection, setDeletingCollection] = useState<MemorySchema | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');

  const loadCollections = useCallback(async (searchQuery?: string) => {
    try {
      setLoading(true);
      const data = await memoryApi.listSchemas({
        search: searchQuery || undefined,
      });
      setCollections(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load collections');
    } finally {
      setLoading(false);
    }
  }, []);

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

  const handleSave = async (data: SchemaFormData) => {
    setSaving(true);
    try {
      const payload = {
        name: data.name,
        description: data.description || undefined,
        fields: data.fields.filter((f) => f.name.trim()),
      };

      if (editingCollection) {
        await memoryApi.updateSchema(editingCollection.id, payload);
      } else {
        await memoryApi.createSchema(payload);
      }
      handleCloseModal();
      loadCollections(searchDebounced);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save collection');
    } finally {
      setSaving(false);
    }
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
      <Text c="dimmed" size="sm" mb="md">
        Manage memory collections for storing and retrieving structured data
      </Text>
      <Group mb="md" gap="sm">
        <TextInput
          placeholder="Search collections..."
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          leftSection={<IconSearch size={16} />}
          style={{ flex: 1, maxWidth: 400 }}
        />
        <Box style={{ flex: 1 }} />
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
              <Table.Th>Name</Table.Th>
              <Table.Th>Description</Table.Th>
              <Table.Th>Records</Table.Th>
              <Table.Th>Fields</Table.Th>
              <Table.Th>Created</Table.Th>
              <Table.Th style={{ textAlign: 'right' }}>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {collections.map((collection) => (
              <Table.Tr key={collection.id}>
                <Table.Td>
                  <Group gap="xs" wrap="nowrap">
                    <Tooltip label="View Records">
                      <NavLink to={`/collections/${collection.name}/records`}>
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
                <Table.Td>
                  <Text size="sm" c="dimmed" lineClamp={1}>
                    {collection.description || '-'}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" c="dimmed">
                    {collection.recordCount ?? 0}
                  </Text>
                </Table.Td>
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
                <Table.Td>
                  <Text size="sm" c="dimmed">
                    {new Date(collection.createdAt).toLocaleDateString()}
                  </Text>
                </Table.Td>
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
              </Table.Tr>
            ))}
            {collections.length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={6}>
                  <Text ta="center" c="dimmed" py="md">
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
        onSave={handleSave}
        saving={saving}
      />

      <CollectionDeleteModal
        opened={deleteModalOpened}
        onClose={closeDeleteModal}
        collection={deletingCollection}
        onDelete={handleDelete}
        deleting={deleting}
      />
    </Box>
  );
}
