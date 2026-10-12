import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  Button,
  Group,
  Stack,
  Modal,
  TextInput,
  Select,
  SegmentedControl,
  Alert,
  Text,
  Box,
} from '@mantine/core';
import { IconAlertCircle, IconSettings } from '@tabler/icons-react';
import { githubApi } from '../../../../api/github';
import { providersApi } from '../../../../api/providers';
import type { ProviderConfig } from '../../../../types/provider';

interface SettingsFormData {
  repository: string;
  branch: string;
  path: string;
  publicRepo: boolean;
  providerName: string;
}

interface SyncSettings {
  repository: string;
  branch: string;
  path: string;
  publicRepo: boolean;
  providerName?: string;
}

interface GitSyncSettingsModalProps {
  opened: boolean;
  onClose: () => void;
  agentId: string;
  syncStatus: SyncSettings;
  onSuccess: () => void;
}

export function GitSyncSettingsModal({
  opened,
  onClose,
  agentId,
  syncStatus,
  onSuccess,
}: GitSyncSettingsModalProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [githubProviders, setGithubProviders] = useState<ProviderConfig[]>([]);

  const { register, handleSubmit, reset, watch, setValue } = useForm<SettingsFormData>();
  const publicRepo = watch('publicRepo');
  const providerName = watch('providerName');

  // Load GitHub providers when modal opens
  useEffect(() => {
    if (!opened) return;
    providersApi
      .list({ provider: 'github' })
      .then((providers) => setGithubProviders(providers))
      .catch((err) => console.error('Failed to load GitHub providers:', err));
  }, [opened]);

  useEffect(() => {
    if (opened && syncStatus) {
      reset({
        repository: syncStatus.repository,
        branch: syncStatus.branch,
        path: syncStatus.path,
        publicRepo: syncStatus.publicRepo,
        providerName: syncStatus.providerName || '',
      });
      setError('');
    }
  }, [opened, syncStatus, reset]);

  const handleClose = () => {
    setError('');
    onClose();
  };

  const onSubmit = async (data: SettingsFormData) => {
    setSaving(true);
    setError('');
    try {
      await githubApi.updateSettings(agentId, {
        repository: data.repository,
        branch: data.branch,
        path: data.path,
        publicRepo: data.publicRepo,
        providerName: data.publicRepo ? undefined : (data.providerName || undefined),
      });
      handleClose();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={
        <Group gap="xs">
          <IconSettings size={20} />
          <Text fw={500}>GitHub Sync Settings</Text>
        </Group>
      }
      centered
      size="md"
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        <Stack gap="lg">
          <TextInput
            label="Repository"
            placeholder="owner/repo"
            description="GitHub repository (owner/repo format)"
            required
            {...register('repository', { required: 'Repository is required' })}
          />

          <TextInput
            label="File Path"
            placeholder="path/to/agent.json"
            description="Path to the agent JSON file in the repository"
            required
            {...register('path', { required: 'Path is required' })}
          />

          <TextInput
            label="Branch"
            placeholder="main"
            description="Branch to sync with"
            {...register('branch')}
          />

          <Stack gap="xs">
            <Group>
              <Text fz="sm" style={{ fontWeight: 'var(--mantine-font-weight-medium)' }}>Repository Access</Text>
              <Box>
                <SegmentedControl
                  value={publicRepo ? 'public' : 'private'}
                  onChange={(value) => setValue('publicRepo', value === 'public')}
                  data={[
                    { value: 'public', label: 'Public' },
                    { value: 'private', label: 'Private' },
                  ]}
                />
              </Box>
            </Group>
            <Select
              description={publicRepo ? 'Public read-only resource' : 'Select GitHub provider'}
              value={providerName}
              disabled={publicRepo}
              onChange={(value) => setValue('providerName', value || '')}
              data={[
                { value: '', label: 'Use default' },
                ...githubProviders.map((p) => ({ value: p.name, label: p.name })),
              ]}
            />
          </Stack>

          {error && (
            <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">
              {error}
            </Alert>
          )}

          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={handleClose}>
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
