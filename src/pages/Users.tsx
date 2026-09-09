import { useState } from 'react';
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
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconPlus,
  IconAlertCircle,
  IconCheck,
} from '@tabler/icons-react';
import { usersApi } from '../api';

type UserRole = 'admin' | 'user';

interface UserForm {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export function UsersPage() {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<UserForm>({
    defaultValues: { name: '', email: '', password: '', role: 'user' },
  });

  const handleOpenModal = () => {
    reset({ name: '', email: '', password: '', role: 'user' });
    openModal();
  };

  const onSubmit = async (data: UserForm) => {
    setSaving(true);
    setError('');
    try {
      await usersApi.create(data);
      setSuccess(`User "${data.name}" created successfully`);
      closeModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <Group mb="md" justify="flex-end">
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

      {success && (
        <Alert
          icon={<IconCheck size={16} />}
          color="green"
          mb="md"
          withCloseButton
          onClose={() => setSuccess('')}
        >
          {success}
        </Alert>
      )}

      <Card withBorder padding="lg">
        <Text c="dimmed">
          Create new users for the Agent Factory platform. Only administrators can access this page.
        </Text>
      </Card>

      <Modal opened={modalOpened} onClose={closeModal} title="Create User">
        <form onSubmit={handleSubmit(onSubmit)}>
          <Stack>
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
              <Button variant="subtle" onClick={closeModal}>
                Cancel
              </Button>
              <Button type="submit" loading={saving}>
                Create
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Box>
  );
}
