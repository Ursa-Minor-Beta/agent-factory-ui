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
import type { ProviderType, ProviderConfig, ProviderPreset, ProviderKind } from '../../types/provider';

// Display names for known kinds; unknown kinds fall back to the raw value
const KIND_LABELS: Partial<Record<ProviderKind, string>> = {
  llm: 'LLM',
  integration: 'Integrations',
};

// Unique kinds in the order the backend returns them
const getKinds = (presets: ProviderPreset[]) => [...new Set(presets.map((p) => p.kind))];

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
  const [presets, setPresets] = useState<ProviderPreset[]>([]);
  const [loadingPresets, setLoadingPresets] = useState(false);

  const isEditMode = !!provider;

  const { register, handleSubmit, control, watch, reset, setValue, formState: { errors } } = useForm<ProviderFormData>({
    defaultValues: { provider: '', name: '', apiKey: '', baseUrl: '', selectedWorkspaceId: '' },
  });

  const watchProvider = watch('provider');
  const selectedPreset = presets.find((p) => p.provider === watchProvider);

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
          provider: '',
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

      // Load provider presets
      setLoadingPresets(true);
      providersApi.getPresets()
        .then((data) => {
          // Sort by kind (backend order), then by label, so the list matches the grouped dropdown
          const kinds = getKinds(data);
          const sorted = [...data].sort((a, b) =>
            kinds.indexOf(a.kind) - kinds.indexOf(b.kind) || a.label.localeCompare(b.label)
          );
          setPresets(sorted);
          // Preselect the first option shown in the dropdown
          if (!isEditMode && sorted[0]) setValue('provider', sorted[0].provider);
        })
        .catch(() => setPresets([]))
        .finally(() => setLoadingPresets(false));
    }
  }, [opened, workspaceId, defaultName, reset, setValue, isEditMode, provider]);

  const handleClose = () => {
    reset({ provider: '', name: '', apiKey: '', baseUrl: '', selectedWorkspaceId: '' });
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
                data={getKinds(presets)
                  .map((kind) => ({
                    group: KIND_LABELS[kind] ?? kind,
                    items: presets
                      .filter((p) => p.kind === kind)
                      .map((p) => ({ value: p.provider, label: p.label })),
                  }))}
                disabled={isEditMode || loadingPresets}
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
          {selectedPreset?.requiresApiKey !== false && (
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
            placeholder={selectedPreset?.defaultBaseUrl ?? (selectedPreset?.requiresBaseUrl ? '' : 'Optional custom endpoint')}
            autoComplete="off"
            withAsterisk={selectedPreset?.requiresBaseUrl}
            error={errors.baseUrl?.message}
            {...register('baseUrl', {
              validate: (value) =>
                !selectedPreset?.requiresBaseUrl || !!value.trim() || 'Base URL is required',
            })}
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
