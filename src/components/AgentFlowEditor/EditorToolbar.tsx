import { Group, Text, ActionIcon, Badge, Tooltip } from '@mantine/core';
import { IconDeviceFloppy, IconLayoutSidebar, IconBrandGithub } from '@tabler/icons-react';
import { WorkspaceBadge } from '../Workspace';
import type { AgentGitHubInfo } from '../../types/agent';

interface EditorToolbarProps {
  agentName: string;
  agentId?: string;
  workspaceName?: string | null;
  github?: AgentGitHubInfo | null;
  saving: boolean;
  isPaletteOpen: boolean;
  onSave: () => void;
  onTogglePalette: () => void;
}

const glassStyle = {
  background: 'rgba(255, 255, 255, 0.1)',
  backdropFilter: 'blur(8px)',
  borderRadius: 'var(--mantine-radius-md)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
};

export function EditorToolbar({
  agentName,
  agentId,
  workspaceName,
  github,
  saving,
  isPaletteOpen,
  onSave,
  onTogglePalette,
}: EditorToolbarProps) {
  const isSubAgent = github?.rootId && github.rootId !== agentId;
  return (
    <Group
      gap="sm"
      wrap="nowrap"
      style={isPaletteOpen
        ? { padding: '12px 12px 8px', minWidth: 0 }
        : { position: 'absolute', top: 16, left: 16, zIndex: 10, padding: '4px 12px 4px 4px', ...glassStyle }
      }
    >
      <ActionIcon
        size="md"
        variant="subtle"
        title={isPaletteOpen ? 'Hide Panel' : 'Show Panel'}
        onClick={(e) => {
          e.stopPropagation();
          onTogglePalette();
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <IconLayoutSidebar size={16} />
      </ActionIcon>

      <Group gap="xs" wrap="nowrap" style={{ flexShrink: 0 }}>
        <Text fw={600} size="sm" truncate style={{ minWidth: 0, flexShrink: 1 }}>
          {agentName || 'Untitled Agent'}
        </Text>
        {!!agentId
          ? <WorkspaceBadge workspaceName={workspaceName} size="xs" />
          : <Text fz="xs" c="dimmed">Not saved</Text>
        }
        {github && (
          <Tooltip label={`${isSubAgent ? 'Sub' : 'Root'} agent: ${github.repository}/${github.path}`}>
            <Badge
              size="xs"
              variant={isSubAgent ? 'outline' : 'light'}
              color="gray"
              leftSection={<IconBrandGithub size={10} />}
            >
              {isSubAgent ? 'sub' : 'root'}
            </Badge>
          </Tooltip>
        )}
      </Group>

      <Group gap="xs" wrap="nowrap" ml="auto" style={{ flexShrink: 0 }}>
        <ActionIcon
          size="xs"
          variant="subtle"
          title='Save'
          loading={saving}
          onClick={onSave}
        >
          <IconDeviceFloppy size={16} />
        </ActionIcon>

      </Group>
    </Group>
  );
}
