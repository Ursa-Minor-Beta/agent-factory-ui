import { Group, Text, ActionIcon } from '@mantine/core';
import { IconDeviceFloppy, IconPlayerPlay, IconPlayerStop } from '@tabler/icons-react';

interface EditorToolbarProps {
  agentName: string;
  saving: boolean;
  running: boolean;
  onSave: () => void;
  onRun: () => void;
  onStop: () => void;
}

export function EditorToolbar({
  agentName,
  saving,
  running,
  onSave,
  onRun,
  onStop,
}: EditorToolbarProps) {
  return (
    <Group
      gap="md"
      style={{
        position: 'absolute',
        top: 16,
        left: 16,
        zIndex: 10,
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(8px)',
        padding: '8px 16px',
        borderRadius: 'var(--mantine-radius-md)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      <Text fw={600} size="sm">
        {agentName || 'Untitled Agent'}
      </Text>

      <Group gap="xs">
        <ActionIcon
          size="xs"
          variant="subtle"
          title='Save'
          loading={saving}
          onClick={onSave}
        >
          <IconDeviceFloppy size={16} />
        </ActionIcon>

        {running ? (
          <ActionIcon
            size="xs"
            variant="subtle"
            color="red"
            title='Stop'
            onClick={onStop}
          >
            <IconPlayerStop size={16} />
          </ActionIcon>
        ) : (
          <ActionIcon
            size="xs"
            variant="subtle"
            color="green"
            title='Run'
            onClick={onRun}
          >
            <IconPlayerPlay size={16} />
          </ActionIcon>
        )}
      </Group>
    </Group>
  );
}
