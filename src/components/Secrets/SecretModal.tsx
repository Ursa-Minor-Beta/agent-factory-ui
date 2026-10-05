import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  Button,
  Group,
  Stack,
  Modal,
  TextInput,
  PasswordInput,
  Textarea,
  Select,
  Alert,
} from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { secretsApi, workspacesApi } from '../../api';
import type { Secret } from '../../types';
import type { Workspace } from '../../types/workspace';

interface SecretFormData {
  name: string;
  value: string;
  description: string;
  selectedWorkspaceId: string;
}

interface SecretModalProps {
  opened: boolean;
  onClose: () => void;
  secret: Secret | null;
  workspaceId?: string;
  onSuccess: () => void;
}

export function SecretModal({ opened, onClose, secret, workspaceId, onSuccess }: SecretModalProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(false);

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<SecretFormData>();

  useEffect(() => {
    if (opened) {
      if (secret) {
        reset({
          name: secret.name,
          value: '',
          description: secret.description || '',
          selectedWorkspaceId: secret.workspaceId || '',
        });
      } else {
        reset({
          name: '',
          value: '',
          description: '',
          selectedWorkspaceId: workspaceId || '',
        });
      }
      setError('');

      // Load workspaces
      setLoadingWorkspaces(true);
      workspacesApi.list()
        .then((response) => setWorkspaces(response.workspaces))
        .catch(() => setWorkspaces([]))
        .finally(() => setLoadingWorkspaces(false));
    }
  }, [opened, secret, workspaceId, reset]);

  const handleClose = () => {
    reset({ name: '', value: '', description: '', selectedWorkspaceId: '' });
    setError('');
    onClose();
  };

  const onSubmit = async (data: SecretFormData) => {
    setSaving(true);
    setError('');
    try {
      if (secret) {
        await secretsApi.update(secret.id, {
          name: data.name,
          value: data.value || undefined,
          description: data.description || undefined,
        });
      } else {
        await secretsApi.create({
          name: data.name,
          value: data.value,
          description: data.description || undefined,
          workspaceId: data.selectedWorkspaceId || undefined,
        });
      }
      handleClose();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save secret');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={secret ? 'Edit Secret' : 'Add Secret'}
      size="sm"
    >
      <form onSubmit={handleSubmit(onSubmit)} autoComplete="off" data-form-type="other">
        <Stack>
          {error && (
            <Alert icon={<IconAlertCircle size={16} />} color="red" onClose={() => setError('')} withCloseButton>
              {error}
            </Alert>
          )}
          {/* Hidden field to prevent browser password save */}
          <input type="text" name="prevent_autofill" style={{ display: 'none' }} />
          <input type="password" name="prevent_autofill_pass" style={{ display: 'none' }} />
          <TextInput
            label="Name"
            placeholder="e.g., API_KEY"
            description="Alphanumeric and underscore only, must start with letter or underscore"
            name="secretName"
            autoComplete="one-time-code"
            data-lpignore="true"
            data-1p-ignore
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
            placeholder={secret ? 'Leave empty to keep current value' : 'Secret value'}
            description={secret ? 'Leave empty to keep existing value' : undefined}
            name="secretValue"
            autoComplete="one-time-code"
            data-lpignore="true"
            data-1p-ignore
            error={errors.value?.message}
            {...register('value', {
              required: secret ? false : 'Value is required',
            })}
          />
          <Textarea
            label="Description"
            placeholder="Optional description"
            rows={2}
            {...register('description')}
          />
          {!secret && (
            <Controller
              name="selectedWorkspaceId"
              control={control}
              render={({ field }) => (
                <Select
                  label="Workspace"
                  placeholder="Select workspace"
                  data={[
                    { value: '', label: 'Global' },
                    ...workspaces.map((ws) => ({ value: ws.id, label: ws.name })),
                  ]}
                  disabled={loadingWorkspaces}
                  {...field}
                />
              )}
            />
          )}
          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {secret ? 'Save' : 'Create'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
