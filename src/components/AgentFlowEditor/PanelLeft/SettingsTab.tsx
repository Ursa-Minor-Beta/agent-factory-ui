import { useEffect } from 'react';
import { Stack, TextInput, Textarea, Group, Code, ActionIcon, Tooltip, CopyButton, Center, Text, Select, Divider } from '@mantine/core';
import { IconCheck, IconCopy } from '@tabler/icons-react';
import { useForm } from 'react-hook-form';
import type { Agent } from '../../../types/agent';
import type { LayoutDirection } from '../utils/converters';

const EDGE_TYPE_OPTIONS = [
  { value: 'default', label: 'Bezier' },
  { value: 'smart', label: 'Smart' },
  { value: 'smoothstep', label: 'Smooth Step' },
  { value: 'step', label: 'Step' },
  { value: 'straight', label: 'Straight' },
];

const LAYOUT_DIRECTION_OPTIONS = [
  { value: 'LR', label: 'Left → Right' },
  { value: 'TB', label: 'Top → Bottom' },
];

interface SettingsTabProps {
  agent: Agent | null;
  edgeType: string;
  layoutDirection: LayoutDirection;
  onAgentInfoChange: (data: { name?: string; description?: string }) => Promise<void>;
  onEdgeTypeChange: (value: string) => void;
  onLayoutDirectionChange: (value: LayoutDirection) => void;
}

interface SettingsForm {
  name: string;
  description: string;
}

export function SettingsTab({ agent, edgeType, layoutDirection, onAgentInfoChange, onEdgeTypeChange, onLayoutDirectionChange }: SettingsTabProps) {
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
      <Textarea
        label="Description"
        placeholder="Enter description (optional)"
        autosize
        minRows={3}
        maxRows={8}
        {...register('description')}
        onBlur={onBlur}
      />
      <Select
        label="Layout Direction"
        size="xs"
        value={layoutDirection}
        onChange={(value) => value && onLayoutDirectionChange(value as LayoutDirection)}
        data={LAYOUT_DIRECTION_OPTIONS}
      />
      <Select
        label="Edge Style"
        size="xs"
        value={edgeType}
        onChange={(value) => value && onEdgeTypeChange(value)}
        data={EDGE_TYPE_OPTIONS}
      />
    </Stack>
  );
}
