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

interface SecretsListProps {
  workspaceId?: string;
  description?: string;
  showSearch?: boolean;
  compact?: boolean;
}

export function SecretsList({
  workspaceId,
  description = '',
  showSearch = true,
  compact = false,
}: SecretsListProps) {
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

  const buttonSize = compact ? 'xs' : 'sm';
  const iconSize = compact ? 14 : 16;
  const tableIconSize = compact ? 16 : 18;

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
            leftSection={<IconSearch size={iconSize} />}
            size={buttonSize}
            style={{ flex: 1, maxWidth: 300 }}
          />
        )}
        <Button size={buttonSize} leftSection={<IconPlus size={iconSize} />} onClick={handleOpenCreateModal}>
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
              <Table.Th>Workspace</Table.Th>
              <Table.Th>Name</Table.Th>
              <Table.Th>Value</Table.Th>
              <Table.Th>Description</Table.Th>
              {!compact && <Table.Th>Created</Table.Th>}
              <Table.Th style={{ textAlign: 'right' }}>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {secrets.map((secret) => (
              <Table.Tr key={secret.id}>
                <Table.Td>
                  <Badge variant="light" color={secret.workspaceName ? 'cyan' : 'gray'} size="sm">
                    {secret.workspaceName ? secret.workspaceName.slice(0, 8) : 'Global'}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Code>{secret.name}</Code>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" c="dimmed">
                    {secret.maskedValue}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" c="dimmed" lineClamp={1}>
                    {secret.description || '-'}
                  </Text>
                </Table.Td>
                {!compact && (
                  <Table.Td>
                    <Text size="sm" c="dimmed">
                      {new Date(secret.createdAt).toLocaleDateString()}
                    </Text>
                  </Table.Td>
                )}
                <Table.Td style={{ textAlign: 'right' }}>
                  <Group gap="xs" justify="flex-end">
                    <ActionIcon
                      variant="subtle"
                      size={compact ? 'sm' : 'md'}
                      onClick={() => handleOpenEditModal(secret)}
                    >
                      <IconPencil size={tableIconSize} />
                    </ActionIcon>
                    <ActionIcon
                      variant="subtle"
                      size={compact ? 'sm' : 'md'}
                      color="red"
                      onClick={() => handleOpenDeleteModal(secret)}
                    >
                      <IconTrash size={tableIconSize} />
                    </ActionIcon>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
            {secrets.length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={compact ? 5 : 6}>
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
