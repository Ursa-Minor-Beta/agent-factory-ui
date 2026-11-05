import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  Button,
  Group,
  Stack,
  Modal,
  TextInput,
  Textarea,
  Select,
  Alert,
} from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { variablesApi, workspacesApi } from '../../api';
import type { Variable } from '../../types';
import type { Workspace } from '../../types/workspace';

interface VariableFormData {
  name: string;
  value: string;
  description: string;
  selectedWorkspaceId: string;
}

interface VariableModalProps {
  opened: boolean;
  onClose: () => void;
  variable: Variable | null;
  workspaceId?: string;
  onSuccess: () => void;
  defaultName?: string;
}

export function VariableModal({ opened, onClose, variable, workspaceId, onSuccess, defaultName }: VariableModalProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(false);

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<VariableFormData>();

  useEffect(() => {
    if (opened) {
      if (variable) {
        reset({
          name: variable.name,
          value: variable.value,
          description: variable.description || '',
          selectedWorkspaceId: variable.workspaceId || '',
        });
      } else {
        reset({
          name: defaultName || '',
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
  }, [opened, variable, workspaceId, defaultName, reset]);

  const handleClose = () => {
    reset({ name: '', value: '', description: '', selectedWorkspaceId: '' });
    setError('');
    onClose();
  };

  const onSubmit = async (data: VariableFormData) => {
    setSaving(true);
    setError('');
    try {
      if (variable) {
        await variablesApi.update(variable.id, {
          name: data.name,
          value: data.value,
          description: data.description || undefined,
          workspaceId: data.selectedWorkspaceId || null,
        });
      } else {
        await variablesApi.create({
          name: data.name,
          value: data.value,
          description: data.description || undefined,
          workspaceId: data.selectedWorkspaceId || undefined,
        });
      }
      handleClose();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save variable');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={variable ? 'Edit Variable' : 'Add Variable'}
      size="sm"
    >
      <form onSubmit={handleSubmit(onSubmit)} autoComplete="off">
        <Stack>
          {error && (
            <Alert icon={<IconAlertCircle size={16} />} color="red" onClose={() => setError('')} withCloseButton>
              {error}
            </Alert>
          )}
          <TextInput
            label="Name"
            placeholder="e.g., BASE_URL"
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
          <Textarea
            label="Value"
            placeholder="Variable value"
            description="Stored in plain text — use secrets for sensitive values"
            autosize
            minRows={1}
            maxRows={6}
            error={errors.value?.message}
            {...register('value', {
              required: 'Value is required',
            })}
          />
          <Textarea
            label="Description"
            placeholder="Optional description"
            rows={2}
            {...register('description')}
          />
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
          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {variable ? 'Save' : 'Create'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
