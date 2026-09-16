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
  PasswordInput,
  Textarea,
  Loader,
  Alert,
  Table,
  Center,
  Code,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconPlus,
  IconTrash,
  IconPencil,
  IconSearch,
  IconAlertCircle,
} from '@tabler/icons-react';
import { secretsApi } from '../api';
import type { Secret } from '../types';

interface SecretForm {
  name: string;
  value: string;
  description: string;
}

export function SecretsPage() {
  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);
  const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);
  const [editingSecret, setEditingSecret] = useState<Secret | null>(null);
  const [deletingSecret, setDeletingSecret] = useState<Secret | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState('');

  const { register, handleSubmit, reset, formState: { errors } } = useForm<SecretForm>();

  const filteredSecrets = useMemo(() => {
    if (!search.trim()) return secrets;
    const query = search.toLowerCase();
    return secrets.filter(
      (secret) =>
        secret.name.toLowerCase().includes(query) ||
        secret.description?.toLowerCase().includes(query)
    );
  }, [secrets, search]);

  const loadSecrets = async () => {
    try {
      setLoading(true);
      const data = await secretsApi.list();
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
  }, []);

  const handleOpenCreateModal = () => {
    setEditingSecret(null);
    reset({ name: '', value: '', description: '' });
    openModal();
  };

  const handleOpenEditModal = (secret: Secret) => {
    setEditingSecret(secret);
    reset({ name: secret.name, value: '', description: secret.description || '' });
    openModal();
  };

  const handleCloseModal = () => {
    setEditingSecret(null);
    reset({ name: '', value: '', description: '' });
    closeModal();
  };

  const onSubmit = async (data: SecretForm) => {
    setSaving(true);
    try {
      if (editingSecret) {
        await secretsApi.update(editingSecret.id, {
          name: data.name,
          value: data.value || undefined,
          description: data.description || undefined,
        });
      } else {
        await secretsApi.create({
          name: data.name,
          value: data.value,
          description: data.description || undefined,
        });
      }
      handleCloseModal();
      loadSecrets();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save secret');
    } finally {
      setSaving(false);
    }
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
      <Text c="dimmed" size="sm" mb="md">
        Store encrypted secrets for use in HTTP nodes with {'{{secret:NAME}}'} syntax
      </Text>
      <Group mb="md" gap="sm">
        <TextInput
          placeholder="Search secrets..."
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          leftSection={<IconSearch size={16} />}
          style={{ flex: 1, maxWidth: 400 }}
        />
        <Box style={{ flex: 1 }} />
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
              <Table.Th>Name</Table.Th>
              <Table.Th>Value</Table.Th>
              <Table.Th>Description</Table.Th>
              <Table.Th>Created</Table.Th>
              <Table.Th style={{ textAlign: 'right' }}>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {filteredSecrets.map((secret) => (
              <Table.Tr key={secret.id}>
                <Table.Td>
                  <Code>{secret.name}</Code>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" c="dimmed">
                    {secret.maskedValue}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" c="dimmed">
                    {secret.description || '-'}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" c="dimmed">
                    {new Date(secret.createdAt).toLocaleDateString()}
                  </Text>
                </Table.Td>
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
              </Table.Tr>
            ))}
            {filteredSecrets.length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={5}>
                  <Text ta="center" c="dimmed" py="md">
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

      <Modal
        opened={modalOpened}
        onClose={handleCloseModal}
        title={editingSecret ? 'Edit Secret' : 'Add Secret'}
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          <Stack>
            <TextInput
              label="Name"
              placeholder="e.g., API_KEY"
              description="Alphanumeric and underscore only, must start with letter or underscore"
              error={errors.name?.message}
              {...register('name', {
                required: 'Name is required',
                pattern: {
                  value: /^[a-zA-Z_][a-zA-Z0-9_]*$/,
                  message: 'Invalid name format',
                },
              })}
            />
            <PasswordInput
              label="Value"
              placeholder={editingSecret ? 'Leave empty to keep current value' : 'Secret value'}
              description={editingSecret ? 'Leave empty to keep existing value' : undefined}
              error={errors.value?.message}
              {...register('value', {
                required: editingSecret ? false : 'Value is required',
              })}
            />
            <Textarea
              label="Description"
              placeholder="Optional description"
              rows={2}
              {...register('description')}
            />
            <Group justify="flex-end" mt="md">
              <Button variant="subtle" onClick={handleCloseModal}>
                Cancel
              </Button>
              <Button type="submit" loading={saving}>
                {editingSecret ? 'Save' : 'Create'}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <Modal
        opened={deleteModalOpened}
        onClose={closeDeleteModal}
        title="Delete Secret"
        size="sm"
        centered
      >
        <Stack>
          <Text size="sm">
            Are you sure you want to delete the secret <Code>{deletingSecret?.name}</Code>?
          </Text>
          <Text size="sm" c="dimmed">
            This action cannot be undone.
          </Text>
          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={closeDeleteModal} disabled={deleting}>
              Cancel
            </Button>
            <Button color="red" onClick={handleDelete} loading={deleting}>
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}
