import { useEffect } from 'react';
import { Stack, TextInput, Textarea, Group, Code, ActionIcon, Tooltip, CopyButton, Center, Text } from '@mantine/core';
import { IconCheck, IconCopy } from '@tabler/icons-react';
import { useForm } from 'react-hook-form';
import type { Agent } from '../../../types/agent';

interface SettingsTabProps {
  agent: Agent | null;
  onAgentInfoChange: (data: { name?: string; description?: string }) => Promise<void>;
}

interface SettingsForm {
  name: string;
  description: string;
}

export function SettingsTab({ agent, onAgentInfoChange }: SettingsTabProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SettingsForm>({
    defaultValues: {
      name: agent?.name || '',
      description: agent?.description || '',
    },
  });

  // Reset form when agent changes
  useEffect(() => {
    if (agent) {
      reset({
        name: agent.name,
        description: agent.description || '',
      });
    }
  }, [agent, reset]);

  if (!agent) {
    return (
      <Center h="100%">
        <Text size="sm" c="dimmed">
          No agent loaded
        </Text>
      </Center>
    );
  }

  const onBlur = handleSubmit(async (data) => {
    await onAgentInfoChange(data);
  });

  return (
    <Stack gap="md">
      <TextInput
        label="Name"
        placeholder="Enter agent name"
        error={errors.name?.message}
        {...register('name', { required: 'Name is required' })}
        onBlur={onBlur}
      />
      <Textarea
        label="Description"
        placeholder="Enter description (optional)"
        autosize
        minRows={3}
        maxRows={8}
        {...register('description')}
        onBlur={onBlur}
      />
      <Group gap="xs">
        <Code>ID: {agent.id}</Code>
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
    </Stack>
  );
}
