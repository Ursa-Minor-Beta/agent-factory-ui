import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Modal, Stack, TextInput, Textarea, Group, Button, CopyButton, ActionIcon, Tooltip, Text, Code } from '@mantine/core';
import { IconCopy, IconCheck } from '@tabler/icons-react';
import { agentsApi } from '../../api';
import type { AgentEditModalProps, AgentForm } from './types';

export function AgentEditModal({ opened, onClose, agent, onSave, isMobile }: AgentEditModalProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const { register, handleSubmit, reset, formState: { errors } } = useForm<AgentForm>();

  useEffect(() => {
    if (opened) {
      if (agent) {
        reset({ name: agent.name, description: agent.description || '' });
      } else {
        reset({ name: '', description: '' });
      }
      setError('');
    }
  }, [opened, agent, reset]);

  const handleClose = () => {
    reset({ name: '', description: '' });
    onClose();
  };

  const onSubmit = async (data: AgentForm) => {
    setSaving(true);
    setError('');
    try {
      if (agent) {
        await agentsApi.update(agent.id, data);
      } else {
        await agentsApi.create(data);
      }
      handleClose();
      onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save agent');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={agent ? 'Edit Agent' : 'New Agent'}
      fullScreen={isMobile}
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        <Stack>
          <TextInput
            label="Name"
            error={errors.name?.message || error}
            disabled={agent?.isSystem}
            {...register('name', { required: 'Name is required' })}
          />
          <Textarea
            label="Description"
            rows={3}
            {...register('description')}
          />
          {agent && (
            <Group gap="xs">
              <Text size="sm" c="dimmed">ID:</Text>
              <Code>{agent.id}</Code>
              <CopyButton value={agent.id}>
                {({ copied, copy }) => (
                  <Tooltip label={copied ? 'Copied' : 'Copy'}>
                    <ActionIcon variant="subtle" size="sm" onClick={copy}>
                      {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                    </ActionIcon>
                  </Tooltip>
                )}
              </CopyButton>
            </Group>
          )}
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
