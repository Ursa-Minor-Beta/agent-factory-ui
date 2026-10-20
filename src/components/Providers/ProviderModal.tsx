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
import type { ProviderType, ProviderConfig } from '../../types/provider';
import { PROVIDER_OPTIONS } from '../../types/provider';

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
  provider?: ProviderConfig; // When provided, modal is in edit mode
}

export function ProviderModal({ opened, onClose, workspaceId, onSuccess, defaultName, provider }: ProviderModalProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(false);

  const isEditMode = !!provider;

  const { register, handleSubmit, control, watch, reset, formState: { errors } } = useForm<ProviderFormData>({
    defaultValues: { provider: 'openai', name: '', apiKey: '', baseUrl: '', selectedWorkspaceId: '' },
  });

  const watchProvider = watch('provider');

  useEffect(() => {
    if (opened) {
      if (isEditMode && provider) {
        reset({
          provider: provider.provider,
          name: provider.name,
          apiKey: '', // Don't pre-fill API key for security
          baseUrl: provider.config.baseUrl || '',
          selectedWorkspaceId: provider.workspaceId || '',
        });
      } else {
        reset({
          provider: 'openai',
          name: defaultName || '',
          apiKey: '',
          baseUrl: '',
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
  }, [opened, workspaceId, defaultName, reset, isEditMode, provider]);

  const handleClose = () => {
    reset({ provider: 'openai', name: '', apiKey: '', baseUrl: '', selectedWorkspaceId: '' });
    setError('');
    onClose();
  };

  const onSubmit = async (data: ProviderFormData) => {
    setSaving(true);
    setError('');
    try {
      if (isEditMode && provider) {
        await providersApi.update(provider.id, {
          name: data.name,
          config: {
            apiKey: data.apiKey || undefined,
            baseUrl: data.baseUrl || undefined,
          },
          workspaceId: data.selectedWorkspaceId || null,
        });
      } else {
        await providersApi.create({
          provider: data.provider,
          name: data.name,
          config: {
            apiKey: data.apiKey || undefined,
            baseUrl: data.baseUrl || undefined,
          },
          workspaceId: data.selectedWorkspaceId || undefined,
        });
      }
      handleClose();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save provider');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal opened={opened} onClose={handleClose} title={isEditMode ? 'Edit Provider' : 'Add Provider'} size="sm">
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
                data={PROVIDER_OPTIONS}
                disabled={isEditMode}
                {...field}
              />
            )}
          />
          <TextInput
            label="Name"
            placeholder="e.g., Production OpenAI"
            autoComplete="one-time-code"
            data-lpignore="true"
            data-1p-ignore
            error={errors.name?.message}
            {...register('name', { required: 'Name is required' })}
          />
          {watchProvider !== 'ollama' && (
            <PasswordInput
              label="API Key"
              placeholder={isEditMode ? 'Leave empty to keep current key' : ''}
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
