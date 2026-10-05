import { useState, useEffect } from 'react';
import {
  Box,
  Text,
  Button,
  Card,
  Group,
  ActionIcon,
  Loader,
  Alert,
  Table,
  Center,
  Code,
  TextInput,
  Badge,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconPlus,
  IconTrash,
  IconPencil,
  IconSearch,
  IconAlertCircle,
} from '@tabler/icons-react';
import { secretsApi } from '../../api';
import type { Secret } from '../../types';
import { SecretModal } from './SecretModal';
import { SecretDeleteModal } from './SecretDeleteModal';

export type SecretColumn = 'workspace' | 'name' | 'value' | 'description' | 'created' | 'actions';

const DEFAULT_COLUMNS: SecretColumn[] = ['workspace', 'name', 'value', 'description', 'created', 'actions'];

interface SecretsListProps {
  workspaceId?: string;
  description?: string;
  showSearch?: boolean;
  columns?: SecretColumn[];
}

export function SecretsList({
  workspaceId,
  description = '',
  showSearch = true,
  columns = DEFAULT_COLUMNS,
}: SecretsListProps) {
  const showColumn = (col: SecretColumn) => columns.includes(col);
  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);
  const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);
  const [editingSecret, setEditingSecret] = useState<Secret | null>(null);
  const [deletingSecret, setDeletingSecret] = useState<Secret | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState('');

  const loadSecrets = async () => {
    try {
      setLoading(true);
      const data = await secretsApi.list(workspaceId !== undefined ? { workspaceId } : undefined);
      setSecrets(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load secrets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSecrets();
  }, [workspaceId]);

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
    handleCloseModal();
    loadSecrets();
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
      setDeletingSecret(null);
      loadSecrets();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete secret');
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
            placeholder="Search secrets..."
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            leftSection={<IconSearch size={16} />}
            style={{ flex: 1, maxWidth: 300 }}
          />
        )}
        <Button leftSection={<IconPlus size={16} />} onClick={handleOpenCreateModal}>
          Add Secret
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
              {showColumn('value') && <Table.Th>Value</Table.Th>}
              {showColumn('description') && <Table.Th>Description</Table.Th>}
              {showColumn('created') && <Table.Th>Created</Table.Th>}
              {showColumn('actions') && <Table.Th style={{ textAlign: 'right' }}>Actions</Table.Th>}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {secrets.map((secret) => (
              <Table.Tr key={secret.id}>
                {showColumn('workspace') && (
                  <Table.Td>
                    <Badge variant="light" color={secret.workspaceName ? 'cyan' : 'gray'} size="sm">
                      {secret.workspaceName ? secret.workspaceName.slice(0, 8) : 'Global'}
                    </Badge>
                  </Table.Td>
                )}
                {showColumn('name') && (
                  <Table.Td>
                    <Code>{secret.name}</Code>
                  </Table.Td>
                )}
                {showColumn('value') && (
                  <Table.Td>
                    <Text size="sm" c="dimmed">
                      {secret.maskedValue}
                    </Text>
                  </Table.Td>
                )}
                {showColumn('description') && (
                  <Table.Td>
                    <Text size="sm" c="dimmed" lineClamp={1}>
                      {secret.description || '-'}
                    </Text>
                  </Table.Td>
                )}
                {showColumn('created') && (
                  <Table.Td>
                    <Text size="sm" c="dimmed">
                      {new Date(secret.createdAt).toLocaleDateString()}
                    </Text>
                  </Table.Td>
                )}
                {showColumn('actions') && (
                  <Table.Td style={{ textAlign: 'right' }}>
                    <Group gap="xs" justify="flex-end">
                      <ActionIcon
                        variant="subtle"
                        onClick={() => handleOpenEditModal(secret)}
                      >
                        <IconPencil size={18} />
                      </ActionIcon>
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        onClick={() => handleOpenDeleteModal(secret)}
                      >
                        <IconTrash size={18} />
                      </ActionIcon>
                    </Group>
                  </Table.Td>
                )}
              </Table.Tr>
            ))}
            {secrets.length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={columns.filter((c) => showColumn(c)).length}>
                  <Text ta="center" c="dimmed" py="md" size="sm">
                    {secrets.length === 0
                      ? 'No secrets configured'
                      : 'No secrets match your search'}
                  </Text>
                </Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      </Card>

      <SecretModal
        opened={modalOpened}
        onClose={handleCloseModal}
        secret={editingSecret}
        workspaceId={workspaceId}
        onSuccess={handleSuccess}
      />

      <SecretDeleteModal
        opened={deleteModalOpened}
        onClose={closeDeleteModal}
        secret={deletingSecret}
        onDelete={handleDelete}
        deleting={deleting}
      />
    </Box>
  );
}
