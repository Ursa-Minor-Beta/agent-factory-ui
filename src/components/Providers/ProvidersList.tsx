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
  Badge,
  Table,
  Center,
  TextInput,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconPlus,
  IconTrash,
  IconStar,
  IconStarFilled,
  IconSearch,
  IconAlertCircle,
} from '@tabler/icons-react';
import { providersApi } from '../../api';
import type { ProviderConfig } from '../../types';
import { ProviderModal } from './ProviderModal';
import { ProviderDeleteModal } from './ProviderDeleteModal';

interface ProvidersListProps {
  workspaceId?: string;
  description?: string;
  showSearch?: boolean;
  compact?: boolean;
}

export function ProvidersList({
  workspaceId,
  description = '',
  showSearch = true,
  compact = false,
}: ProvidersListProps) {
  const [providers, setProviders] = useState<ProviderConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);
  const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);
  const [deleting, setDeleting] = useState(false);
  const [deletingProvider, setDeletingProvider] = useState<ProviderConfig | null>(null);
  const [search, setSearch] = useState('');

  const loadProviders = async () => {
    try {
      setLoading(true);
      const data = await providersApi.list(workspaceId !== undefined ? { workspaceId } : undefined);
      setProviders(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load providers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProviders();
  }, [workspaceId]);

  const handleOpenDeleteModal = (provider: ProviderConfig) => {
    setDeletingProvider(provider);
    openDeleteModal();
  };

  const handleDelete = async () => {
    if (!deletingProvider) return;
    setDeleting(true);
    try {
      await providersApi.delete(deletingProvider.id);
      closeDeleteModal();
      setDeletingProvider(null);
      loadProviders();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete provider');
    } finally {
      setDeleting(false);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await providersApi.setDefault(id);
      loadProviders();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set default');
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
            placeholder="Search providers..."
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            leftSection={<IconSearch size={iconSize} />}
            size={buttonSize}
            style={{ flex: 1, maxWidth: 300 }}
          />
        )}
        <Button size={buttonSize} leftSection={<IconPlus size={iconSize} />} onClick={openModal}>
          Add Provider
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
              <Table.Th>Provider</Table.Th>
              <Table.Th>API Key</Table.Th>
              {!compact && <Table.Th>Base URL</Table.Th>}
              <Table.Th>Default</Table.Th>
              <Table.Th style={{ textAlign: 'right' }}>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {providers.map((provider) => (
              <Table.Tr key={provider.id}>
                <Table.Td>
                  <Badge variant="light" color={provider.workspaceName ? 'cyan' : 'gray'} size="sm">
                    {provider.workspaceName ? provider.workspaceName.slice(0, 8) : 'Global'}
                  </Badge>
                </Table.Td>
                <Table.Td>{provider.name}</Table.Td>
                <Table.Td>
                  <Badge variant="light" size={compact ? 'sm' : 'md'}>{provider.provider}</Badge>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" c="dimmed">
                    {provider.config.apiKey ? '••••••••' : '-'}
                  </Text>
                </Table.Td>
                {!compact && (
                  <Table.Td>
                    <Text size="sm" c="dimmed">
                      {provider.config.baseUrl || '-'}
                    </Text>
                  </Table.Td>
                )}
                <Table.Td>
                  <ActionIcon
                    variant="subtle"
                    size={compact ? 'sm' : 'md'}
                    color={provider.isDefault ? 'yellow' : 'gray'}
                    onClick={() => handleSetDefault(provider.id)}
                  >
                    {provider.isDefault ? <IconStarFilled size={tableIconSize} /> : <IconStar size={tableIconSize} />}
                  </ActionIcon>
                </Table.Td>
                <Table.Td style={{ textAlign: 'right' }}>
                  <ActionIcon
                    variant="subtle"
                    size={compact ? 'sm' : 'md'}
                    color="red"
                    onClick={() => handleOpenDeleteModal(provider)}
                  >
                    <IconTrash size={tableIconSize} />
                  </ActionIcon>
                </Table.Td>
              </Table.Tr>
            ))}
            {providers.length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={compact ? 6 : 7}>
                  <Text ta="center" c="dimmed" py="md" size="sm">
                    {providers.length === 0
                      ? 'No providers configured'
                      : 'No providers match your search'}
                  </Text>
                </Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      </Card>

      <ProviderModal
        opened={modalOpened}
        onClose={closeModal}
        workspaceId={workspaceId}
        onSuccess={loadProviders}
      />

      <ProviderDeleteModal
        opened={deleteModalOpened}
        onClose={closeDeleteModal}
        provider={deletingProvider}
        onDelete={handleDelete}
        deleting={deleting}
      />
    </Box>
  );
}
