import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import {
  Box,
  Text,
  Button,
  Card,
  Group,
  Stack,
  ActionIcon,
  Modal,
  TextInput,
  Loader,
  Alert,
  Badge,
  Table,
  Center,
  Checkbox,
  Code,
  CopyButton,
  Tooltip,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconPlus,
  IconTrash,
  IconCopy,
  IconCheck,
  IconSearch,
  IconAlertCircle,
  IconAlertTriangle,
} from '@tabler/icons-react';
import { authApi } from '../api';
import type { ApiKey } from '../types';

const PERMISSIONS = [
  { value: 'agents:read', label: 'Read Agents' },
  { value: 'agents:write', label: 'Write Agents' },
  { value: 'agents:run', label: 'Run Agents' },
  { value: 'runs:read', label: 'Read Runs' },
];

interface ApiKeyForm {
  name: string;
}

export function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [createModalOpened, { open: openCreateModal, close: closeCreateModal }] = useDisclosure(false);
  const [keyModalOpened, { open: openKeyModal, close: closeKeyModal }] = useDisclosure(false);
  const [newPlainKey, setNewPlainKey] = useState('');
  const [permissions, setPermissions] = useState<string[]>(['agents:read', 'agents:run']);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ApiKeyForm>();

  const filteredApiKeys = useMemo(() => {
    if (!search.trim()) return apiKeys;
    const query = search.toLowerCase();
    return apiKeys.filter(
      (key) =>
        key.name.toLowerCase().includes(query) ||
        key.permissions.some((p) => p.toLowerCase().includes(query))
    );
  }, [apiKeys, search]);

  const loadApiKeys = async () => {
    try {
      setLoading(true);
      const data = await authApi.listApiKeys();
      setApiKeys(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load API keys');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApiKeys();
  }, []);

  const handleOpenCreateModal = () => {
    reset({ name: '' });
    setPermissions(['agents:read', 'agents:run']);
    openCreateModal();
  };

  const onSubmit = async (data: ApiKeyForm) => {
    setSaving(true);
    try {
      const result = await authApi.createApiKey(data.name, permissions);
      setNewPlainKey(result.plainKey);
      closeCreateModal();
      openKeyModal();
      loadApiKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create API key');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this API key?')) return;
    try {
      await authApi.revokeApiKey(id);
      loadApiKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke API key');
    }
  };

  const togglePermission = (permission: string) => {
    setPermissions((prev) =>
      prev.includes(permission)
        ? prev.filter((p) => p !== permission)
        : [...prev, permission]
    );
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
        Create API keys for programmatic access to the Agent Factory backend
      </Text>
      <Group mb="md" gap="sm">
        <TextInput
          placeholder="Search API keys..."
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          leftSection={<IconSearch size={16} />}
          style={{ flex: 1, maxWidth: 400 }}
        />
        <Box style={{ flex: 1 }} />
        <Button leftSection={<IconPlus size={16} />} onClick={handleOpenCreateModal}>
          Create API Key
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
              <Table.Th>Key</Table.Th>
              <Table.Th>Permissions</Table.Th>
              <Table.Th>Last Used</Table.Th>
              <Table.Th>Created</Table.Th>
              <Table.Th style={{ textAlign: 'right' }}>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {filteredApiKeys.map((apiKey) => (
              <Table.Tr key={apiKey.id}>
                <Table.Td>{apiKey.name}</Table.Td>
                <Table.Td>
                  <Code>{apiKey.keyPrefix}...</Code>
                </Table.Td>
                <Table.Td>
                  <Group gap={4} wrap="wrap">
                    {apiKey.permissions.map((p) => (
                      <Badge key={p} variant="light" size="sm">{p}</Badge>
                    ))}
                  </Group>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" c="dimmed">
                    {apiKey.lastUsedAt
                      ? new Date(apiKey.lastUsedAt).toLocaleDateString()
                      : 'Never'}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" c="dimmed">
                    {new Date(apiKey.createdAt).toLocaleDateString()}
                  </Text>
                </Table.Td>
                <Table.Td style={{ textAlign: 'right' }}>
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    onClick={() => handleDelete(apiKey.id)}
                  >
                    <IconTrash size={18} />
                  </ActionIcon>
                </Table.Td>
              </Table.Tr>
            ))}
            {filteredApiKeys.length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={6}>
                  <Text ta="center" c="dimmed" py="md">
                    {apiKeys.length === 0
                      ? 'No API keys created'
                      : 'No API keys match your search'}
                  </Text>
                </Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      </Card>

      {/* Create API Key Modal */}
      <Modal opened={createModalOpened} onClose={closeCreateModal} title="Create API Key">
        <form onSubmit={handleSubmit(onSubmit)}>
          <Stack>
            <TextInput
              label="Name"
              placeholder="e.g., Production API"
              error={errors.name?.message}
              {...register('name', { required: 'Name is required' })}
            />
            <Box>
              <Text size="sm" fw={500} mb="xs">Permissions</Text>
              <Stack gap="xs">
                {PERMISSIONS.map((perm) => (
                  <Checkbox
                    key={perm.value}
                    label={perm.label}
                    checked={permissions.includes(perm.value)}
                    onChange={() => togglePermission(perm.value)}
                  />
                ))}
              </Stack>
            </Box>
            <Group justify="flex-end" mt="md">
              <Button variant="subtle" onClick={closeCreateModal}>
                Cancel
              </Button>
              <Button type="submit" loading={saving}>
                Create
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* New Key Display Modal */}
      <Modal opened={keyModalOpened} onClose={closeKeyModal} title="API Key Created">
        <Stack>
          <Alert icon={<IconAlertTriangle size={16} />} color="yellow" variant="light">
            Copy this key now. You won't be able to see it again!
          </Alert>
          <Group
            p="md"
            style={{
              backgroundColor: 'var(--mantine-color-dark-6)',
              borderRadius: 'var(--mantine-radius-md)',
            }}
          >
            <Code
              style={{
                flex: 1,
                wordBreak: 'break-all',
                backgroundColor: 'transparent',
              }}
            >
              {newPlainKey}
            </Code>
            <CopyButton value={newPlainKey}>
              {({ copied, copy }) => (
                <Tooltip label={copied ? 'Copied' : 'Copy'}>
                  <ActionIcon variant="subtle" onClick={copy}>
                    {copied ? <IconCheck size={18} /> : <IconCopy size={18} />}
                  </ActionIcon>
                </Tooltip>
              )}
            </CopyButton>
          </Group>
          <Group justify="flex-end">
            <Button onClick={closeKeyModal}>Done</Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}
