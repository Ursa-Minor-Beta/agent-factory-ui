import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  Button,
  Group,
  Stack,
  Modal,
  TextInput,
  PasswordInput,
  Select,
  Alert,
} from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { providersApi, workspacesApi } from '../../api';
import type { Workspace } from '../../types/workspace';

type ProviderType = 'openai' | 'anthropic' | 'ollama';

interface ProviderFormData {
  provider: ProviderType;
  name: string;
  apiKey: string;
  baseUrl: string;
  selectedWorkspaceId: string;
}

interface ProviderModalProps {
  opened: boolean;
  onClose: () => void;
  workspaceId?: string;
  onSuccess: () => void;
  defaultName?: string;
}

export function ProviderModal({ opened, onClose, workspaceId, onSuccess, defaultName }: ProviderModalProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(false);

  const { register, handleSubmit, control, watch, reset, formState: { errors } } = useForm<ProviderFormData>({
    defaultValues: { provider: 'openai', name: '', apiKey: '', baseUrl: '', selectedWorkspaceId: '' },
  });

  const watchProvider = watch('provider');

  useEffect(() => {
    if (opened) {
      reset({
        provider: 'openai',
        name: defaultName || '',
        apiKey: '',
        baseUrl: '',
        selectedWorkspaceId: workspaceId || '',
      });
      setError('');

      // Load workspaces
      setLoadingWorkspaces(true);
      workspacesApi.list()
        .then((response) => setWorkspaces(response.workspaces))
        .catch(() => setWorkspaces([]))
        .finally(() => setLoadingWorkspaces(false));
    }
  }, [opened, workspaceId, defaultName, reset]);

  const handleClose = () => {
    reset({ provider: 'openai', name: '', apiKey: '', baseUrl: '', selectedWorkspaceId: '' });
    setError('');
    onClose();
  };

  const onSubmit = async (data: ProviderFormData) => {
    setSaving(true);
    setError('');
    try {
      await providersApi.create({
        provider: data.provider,
        name: data.name,
        config: {
          apiKey: data.apiKey || undefined,
          baseUrl: data.baseUrl || undefined,
        },
        workspaceId: data.selectedWorkspaceId || undefined,
      });
      handleClose();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save provider');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal opened={opened} onClose={handleClose} title="Add Provider" size="sm">
      <form onSubmit={handleSubmit(onSubmit)} autoComplete="off" data-form-type="other">
        <Stack>
          {error && (
            <Alert icon={<IconAlertCircle size={16} />} color="red" onClose={() => setError('')} withCloseButton>
              {error}
            </Alert>
          )}
          {/* Hidden fields to prevent browser password save */}
          <input type="text" name="prevent_autofill" style={{ display: 'none' }} />
          <input type="password" name="prevent_autofill_pass" style={{ display: 'none' }} />
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
            name="providerName"
            autoComplete="one-time-code"
            data-lpignore="true"
            data-1p-ignore
            error={errors.name?.message}
            {...register('name', { required: 'Name is required' })}
          />
          {watchProvider !== 'ollama' && (
            <PasswordInput
              label="API Key"
              name="apiKey"
              autoComplete="one-time-code"
              data-lpignore="true"
              data-1p-ignore
              {...register('apiKey')}
            />
          )}
          <TextInput
            label="Base URL"
            placeholder={watchProvider === 'ollama' ? 'http://localhost:11434' : 'Optional custom endpoint'}
            autoComplete="off"
            {...register('baseUrl')}
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
              Save
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
