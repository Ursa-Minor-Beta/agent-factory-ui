import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box,
  Text,
  Button,
  Group,
  TextInput,
  Loader,
  Alert,
  Pagination,
  Select,
  Center,
  Table,
  ActionIcon,
  Tooltip,
  Card,
  Badge,
} from '@mantine/core';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import {
  IconPlus,
  IconSearch,
  IconEdit,
  IconTrash,
  IconAlertCircle,
} from '@tabler/icons-react';
import { workspacesApi } from '../../api/workspaces';
import type { Workspace, WorkspaceQueryOptions } from '../../types/workspace';
import { WorkspaceModal } from './WorkspaceModal';
import { DeleteConfirmModal } from '../../components/DeleteConfirmModal';

const ITEMS_PER_PAGE = 20;
const SORT_STORAGE_KEY = 'workspaces-sort';

export function WorkspacesPage() {
  const isMobile = useMediaQuery('(max-width: 768px)') ?? false;
  const [searchParams, setSearchParams] = useSearchParams();

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);
  const [workspaceToEdit, setWorkspaceToEdit] = useState<Workspace | null>(null);
  const [saving, setSaving] = useState(false);

  const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);
  const [workspaceToDelete, setWorkspaceToDelete] = useState<Workspace | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Query params
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
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
  const [sortBy, sortOrder] = (sortValue || 'name-asc').split('-') as [
    WorkspaceQueryOptions['sortBy'],
    WorkspaceQueryOptions['sortOrder']
  ];

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounced(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Check for create query param
  useEffect(() => {
    if (searchParams.get('create') === 'true') {
      openModal();
      // Remove the param after opening modal
      setSearchParams({});
    }
  }, [searchParams, openModal, setSearchParams]);

  const loadWorkspaces = useCallback(async () => {
    try {
      setLoading(true);
      const params: WorkspaceQueryOptions = {
        sortBy,
        sortOrder,
        skip: (page - 1) * ITEMS_PER_PAGE,
        limit: ITEMS_PER_PAGE,
      };
      if (searchDebounced.trim()) {
        params.name = searchDebounced;
      }
      const data = await workspacesApi.list(params);
      setWorkspaces(data.workspaces);
      setTotal(data.total);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workspaces');
    } finally {
      setLoading(false);
    }
  }, [searchDebounced, sortBy, sortOrder, page]);

  useEffect(() => {
    loadWorkspaces();
  }, [loadWorkspaces]);

  const handleCreate = () => {
    setWorkspaceToEdit(null);
    openModal();
  };

  const handleEdit = (workspace: Workspace) => {
    setWorkspaceToEdit(workspace);
    openModal();
  };

  const handleSave = async (data: { name: string; description: string }) => {
    try {
      setSaving(true);
      if (workspaceToEdit) {
        const updated = await workspacesApi.update(workspaceToEdit.id, data);
        setWorkspaces((prev) =>
          prev.map((w) => (w.id === updated.id ? updated : w))
        );

        // Dispatch event to update sidebar
        window.dispatchEvent(new CustomEvent('workspace-updated', { detail: { workspace: updated } }));
      } else {
        const created = await workspacesApi.create(data);
        setWorkspaces((prev) => [created, ...prev]);
        setTotal((prev) => prev + 1);

        // Dispatch event to update sidebar
        window.dispatchEvent(new CustomEvent('workspace-created', { detail: { workspace: created } }));
      }
      closeModal();
      setWorkspaceToEdit(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save workspace');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (workspace: Workspace) => {
    setWorkspaceToDelete(workspace);
    openDeleteModal();
  };

  const handleDelete = async () => {
    if (!workspaceToDelete) return;

    try {
      setDeleting(true);
      await workspacesApi.delete(workspaceToDelete.id);
      setWorkspaces((prev) => prev.filter((w) => w.id !== workspaceToDelete.id));
      setTotal((prev) => prev - 1);

      // Dispatch event to update sidebar
      window.dispatchEvent(new CustomEvent('workspace-deleted', { detail: { workspaceId: workspaceToDelete.id } }));

      closeDeleteModal();
      setWorkspaceToDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete workspace');
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
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
        <Button leftSection={<IconPlus size={16} />} onClick={handleCreate}>
          New Workspace
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

      {/* Results info */}
      {!loading && (
        <Text size="sm" c="dimmed" mb="md">
          {total} workspace{total !== 1 ? 's' : ''} found
        </Text>
      )}

      {loading ? (
        <Center py="xl">
          <Loader />
        </Center>
      ) : (
        <>
          {isMobile ? (
            // Mobile: Card view
            <Box>
              {workspaces.map((workspace) => (
                <Card key={workspace.id} withBorder mb="sm" p="md">
                  <Group justify="space-between" mb="xs">
                    <Text fw={600}>{workspace.name}</Text>
                    <Group gap="xs">
                      <ActionIcon
                        variant="subtle"
                        color="cyan"
                        onClick={() => handleEdit(workspace)}
                      >
                        <IconEdit size={16} />
                      </ActionIcon>
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        onClick={() => handleDeleteClick(workspace)}
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Group>
                  </Group>
                  {workspace.description && (
                    <Text size="sm" c="dimmed" mb="xs">
                      {workspace.description}
                    </Text>
                  )}
                  <Group gap="xs">
                    <Badge variant="light" size="sm">
                      Created: {formatDate(workspace.createdAt)}
                    </Badge>
                    <Badge variant="light" size="sm">
                      Updated: {formatDate(workspace.updatedAt)}
                    </Badge>
                  </Group>
                </Card>
              ))}
            </Box>
          ) : (
            // Desktop: Table view
            <Card withBorder>
              <Table highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Name</Table.Th>
                    <Table.Th>Description</Table.Th>
                    <Table.Th>Created</Table.Th>
                    <Table.Th>Updated</Table.Th>
                    <Table.Th style={{ width: 100 }}>Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {workspaces.map((workspace) => (
                    <Table.Tr key={workspace.id}>
                      <Table.Td>
                        <Text>{workspace.name}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" c="dimmed" lineClamp={2}>
                          {workspace.description || '—'}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{formatDate(workspace.createdAt)}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{formatDate(workspace.updatedAt)}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Group gap="xs">
                          <Tooltip label="Edit">
                            <ActionIcon
                              variant="subtle"
                              color="cyan"
                              onClick={() => handleEdit(workspace)}
                            >
                              <IconEdit size={16} />
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip label="Delete">
                            <ActionIcon
                              variant="subtle"
                              color="red"
                              onClick={() => handleDeleteClick(workspace)}
                            >
                              <IconTrash size={16} />
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Card>
          )}

          {workspaces.length === 0 && (
            <Text c="dimmed" ta="center" py="xl">
              {total === 0 && !searchDebounced
                ? 'No workspaces yet. Create your first workspace to get started.'
                : 'No workspaces match your search.'}
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

      <WorkspaceModal
        opened={modalOpened}
        onClose={closeModal}
        workspace={workspaceToEdit}
        onSave={handleSave}
        saving={saving}
      />

      <DeleteConfirmModal
        opened={deleteModalOpened}
        onClose={closeDeleteModal}
        onDelete={handleDelete}
        deleting={deleting}
        title="Delete Workspace"
        entityName={`the workspace ${workspaceToDelete?.name}`}
        subtitle="All agents, secrets, providers, and collections in this workspace will be permanently deleted."
        deleteButtonText="Delete Workspace"
      />
    </Box>
  );
}
