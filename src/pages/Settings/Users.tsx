import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  Box,
  Text,
  Button,
  Card,
  Group,
  Stack,
  Modal,
  TextInput,
  PasswordInput,
  Select,
  Alert,
  Table,
  Badge,
  Loader,
  Center,
  ActionIcon,
} from '@mantine/core';
import { useDisclosure, useDebouncedValue } from '@mantine/hooks';
import {
  IconPlus,
  IconAlertCircle,
  IconSearch,
  IconKey,
} from '@tabler/icons-react';
import { usersApi } from '../../api';
import type { User } from '../../types';

type UserRole = 'admin' | 'user';

interface UserForm {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

interface PasswordForm {
  password: string;
}

export function UsersSettings() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);
  const [passwordModalOpened, { open: openPasswordModal, close: closePasswordModal }] = useDisclosure(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [modalError, setModalError] = useState('');

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<UserForm>({
    defaultValues: { name: '', email: '', password: '', role: 'user' },
  });

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    reset: resetPassword,
    formState: { errors: passwordErrors },
  } = useForm<PasswordForm>({
    defaultValues: { password: '' },
  });

  const [debouncedSearch] = useDebouncedValue(search, 300);

  const loadUsers = async (searchQuery?: string) => {
    try {
      setLoading(true);
      const data = await usersApi.list(searchQuery ? { name: searchQuery } : undefined);
      setUsers(data.users);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers(debouncedSearch);
  }, [debouncedSearch]);

  const handleOpenModal = () => {
    reset({ name: '', email: '', password: '', role: 'user' });
    setModalError('');
    openModal();
  };

  const handleCloseModal = () => {
    reset({ name: '', email: '', password: '', role: 'user' });
    setModalError('');
    closeModal();
  };

  const onSubmit = async (data: UserForm) => {
    setSaving(true);
    setModalError('');
    try {
      await usersApi.create(data);
      handleCloseModal();
      loadUsers(debouncedSearch);
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenPasswordModal = (user: User) => {
    setSelectedUser(user);
    resetPassword({ password: '' });
    setModalError('');
    openPasswordModal();
  };

  const handleClosePasswordModal = () => {
    setSelectedUser(null);
    resetPassword({ password: '' });
    setModalError('');
    closePasswordModal();
  };

  const onPasswordSubmit = async (data: PasswordForm) => {
    if (!selectedUser) return;
    setSaving(true);
    setModalError('');
    try {
      await usersApi.updatePassword(selectedUser.id, data.password);
      handleClosePasswordModal();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Failed to update password');
    } finally {
      setSaving(false);
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
      <Text fw={500} size="lg" mb="xs">Users</Text>
      <Text c="dimmed" size="sm" mb="md">
        Manage user accounts and permissions
      </Text>
      <Group mb="md" gap="sm">
        <TextInput
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          leftSection={<IconSearch size={16} />}
          style={{ flex: 1, maxWidth: 400 }}
        />
        <Box style={{ flex: 1 }} />
        <Button leftSection={<IconPlus size={16} />} onClick={handleOpenModal}>
          Create User
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
              <Table.Th>Email</Table.Th>
              <Table.Th>Role</Table.Th>
              <Table.Th>Created</Table.Th>
              <Table.Th style={{ textAlign: 'right' }}>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {users.map((user) => (
              <Table.Tr key={user.id}>
                <Table.Td>
                  <Text size="sm" fw={500}>{user.name}</Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" c="dimmed">{user.email}</Text>
                </Table.Td>
                <Table.Td>
                  <Badge
                    color={user.role === 'admin' ? 'cyan' : 'gray'}
                    variant="light"
                  >
                    {user.role}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" c="dimmed">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </Text>
                </Table.Td>
                <Table.Td style={{ textAlign: 'right' }}>
                  <ActionIcon
                    variant="subtle"
                    onClick={() => handleOpenPasswordModal(user)}
                    title="Change password"
                  >
                    <IconKey size={18} />
                  </ActionIcon>
                </Table.Td>
              </Table.Tr>
            ))}
            {users.length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={5}>
                  <Text ta="center" c="dimmed" py="md">
                    No users found
                  </Text>
                </Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      </Card>

      <Modal opened={modalOpened} onClose={handleCloseModal} title="Create User">
        <form onSubmit={handleSubmit(onSubmit)}>
          <Stack>
            {modalError && (
              <Alert icon={<IconAlertCircle size={16} />} color="red">
                {modalError}
              </Alert>
            )}
            <TextInput
              label="Name"
              error={errors.name?.message}
              {...register('name', { required: 'Name is required' })}
            />
            <TextInput
              label="Email"
              type="email"
              error={errors.email?.message}
              {...register('email', { required: 'Email is required' })}
            />
            <PasswordInput
              label="Password"
              description="Minimum 8 characters"
              error={errors.password?.message}
              {...register('password', {
                required: 'Password is required',
                minLength: { value: 8, message: 'Password must be at least 8 characters' },
              })}
            />
            <Controller
              name="role"
              control={control}
              render={({ field }) => (
                <Select
                  label="Role"
                  data={[
                    { value: 'user', label: 'User' },
                    { value: 'admin', label: 'Admin' },
                  ]}
                  {...field}
                />
              )}
            />
            <Group justify="flex-end" mt="md">
              <Button variant="subtle" onClick={handleCloseModal}>
                Cancel
              </Button>
              <Button type="submit" loading={saving}>
                Create
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <Modal
        opened={passwordModalOpened}
        onClose={handleClosePasswordModal}
        title="Change Password"
        size="sm"
        centered
      >
        <form onSubmit={handlePasswordSubmit(onPasswordSubmit)}>
          <Stack>
            {modalError && (
              <Alert icon={<IconAlertCircle size={16} />} color="red">
                {modalError}
              </Alert>
            )}
            <Text size="sm" c="dimmed">
              Set a new password for <strong>{selectedUser?.name}</strong>
            </Text>
            <PasswordInput
              label="New Password"
              description="Minimum 8 characters"
              error={passwordErrors.password?.message}
              {...registerPassword('password', {
                required: 'Password is required',
                minLength: { value: 8, message: 'Password must be at least 8 characters' },
              })}
            />
            <Group justify="flex-end" mt="md">
              <Button variant="subtle" onClick={handleClosePasswordModal}>
                Cancel
              </Button>
              <Button type="submit" loading={saving}>
                Update
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Box>
  );
}
