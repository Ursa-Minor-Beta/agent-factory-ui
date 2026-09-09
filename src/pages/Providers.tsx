import { useState, useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
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
  PasswordInput,
  Loader,
  Alert,
  Badge,
  Table,
  Center,
  Select,
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
import { providersApi } from '../api';
import type { ProviderConfig } from '../types';

type ProviderType = 'openai' | 'anthropic' | 'ollama';

interface ProviderForm {
  provider: ProviderType;
  name: string;
  apiKey: string;
  baseUrl: string;
}

export function ProvidersPage() {
  const [providers, setProviders] = useState<ProviderConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const { register, handleSubmit, control, watch, reset, formState: { errors } } = useForm<ProviderForm>({
    defaultValues: { provider: 'openai', name: '', apiKey: '', baseUrl: '' },
  });

  const watchProvider = watch('provider');

  const filteredProviders = useMemo(() => {
    if (!search.trim()) return providers;
    const query = search.toLowerCase();
    return providers.filter(
      (provider) =>
        provider.name.toLowerCase().includes(query) ||
        provider.provider.toLowerCase().includes(query)
    );
  }, [providers, search]);

  const loadProviders = async () => {
    try {
      setLoading(true);
      const data = await providersApi.list();
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
  }, []);

  const handleOpenModal = () => {
    reset({ provider: 'openai', name: '', apiKey: '', baseUrl: '' });
    openModal();
  };

  const onSubmit = async (data: ProviderForm) => {
    setSaving(true);
    try {
      await providersApi.create({
        provider: data.provider,
        name: data.name,
        config: {
          apiKey: data.apiKey || undefined,
          baseUrl: data.baseUrl || undefined,
        },
      });
      closeModal();
      loadProviders();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save provider');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this provider?')) return;
    try {
      await providersApi.delete(id);
      loadProviders();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete provider');
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

  return (
    <Box>
      <Group mb="md" gap="sm">
        <TextInput
          placeholder="Search providers..."
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          leftSection={<IconSearch size={16} />}
          style={{ flex: 1, maxWidth: 400 }}
        />
        <Box style={{ flex: 1 }} />
        <Button leftSection={<IconPlus size={16} />} onClick={handleOpenModal}>
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
              <Table.Th>Name</Table.Th>
              <Table.Th>Provider</Table.Th>
              <Table.Th>API Key</Table.Th>
              <Table.Th>Base URL</Table.Th>
              <Table.Th>Default</Table.Th>
              <Table.Th style={{ textAlign: 'right' }}>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {filteredProviders.map((provider) => (
              <Table.Tr key={provider.id}>
                <Table.Td>{provider.name}</Table.Td>
                <Table.Td>
                  <Badge variant="light">{provider.provider}</Badge>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" c="dimmed">
                    {provider.config.apiKey ? '••••••••' : '-'}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" c="dimmed">
                    {provider.config.baseUrl || '-'}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <ActionIcon
                    variant="subtle"
                    color={provider.isDefault ? 'yellow' : 'gray'}
                    onClick={() => handleSetDefault(provider.id)}
                  >
                    {provider.isDefault ? <IconStarFilled size={18} /> : <IconStar size={18} />}
                  </ActionIcon>
                </Table.Td>
                <Table.Td style={{ textAlign: 'right' }}>
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    onClick={() => handleDelete(provider.id)}
                  >
                    <IconTrash size={18} />
                  </ActionIcon>
                </Table.Td>
              </Table.Tr>
            ))}
            {filteredProviders.length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={6}>
                  <Text ta="center" c="dimmed" py="md">
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

      <Modal opened={modalOpened} onClose={closeModal} title="Add Provider">
        <form onSubmit={handleSubmit(onSubmit)}>
          <Stack>
            <Controller
              name="provider"
              control={control}
              render={({ field }) => (
                <Select
                  label="Provider"
                  data={[
                    { value: 'openai', label: 'OpenAI' },
                    { value: 'anthropic', label: 'Anthropic' },
                    { value: 'ollama', label: 'Ollama' },
                  ]}
                  {...field}
                />
              )}
            />
            <TextInput
              label="Name"
              placeholder="e.g., Production OpenAI"
              error={errors.name?.message}
              {...register('name', { required: 'Name is required' })}
            />
            {watchProvider !== 'ollama' && (
              <PasswordInput
                label="API Key"
                {...register('apiKey')}
              />
            )}
            {watchProvider === 'ollama' && (
              <TextInput
                label="Base URL"
                placeholder="http://localhost:11434"
                {...register('baseUrl')}
              />
            )}
            <Group justify="flex-end" mt="md">
              <Button variant="subtle" onClick={closeModal}>
                Cancel
              </Button>
              <Button type="submit" loading={saving}>
                Save
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Box>
  );
}
