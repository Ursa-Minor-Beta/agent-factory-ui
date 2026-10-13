import { Group, Text, ActionIcon, Badge, Tooltip } from '@mantine/core';
import { IconDeviceFloppy, IconPlayerPlay, IconLayoutSidebar, IconBrandGithub } from '@tabler/icons-react';
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
  onRun: () => void;
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
  onRun,
  onTogglePalette,
}: EditorToolbarProps) {
  const isSubAgent = github?.rootId && github.rootId !== agentId;
  return (
    <>
      {/* Left toggle button - only show when palette is closed */}
      {!isPaletteOpen && (
        <ActionIcon
          size="md"
          variant='subtle'
          title="Show Nodes Palette"
          onClick={onTogglePalette}
          style={{
            position: 'absolute',
            top: 16,
            left: 16,
            zIndex: 10,
            ...glassStyle,
          }}
        >
          <IconLayoutSidebar size={16} />
        </ActionIcon>
      )}

      {/* Center toolbar - use fixed positioning to stay centered on viewport */}
      <Group
        gap="md"
        style={{
          position: 'fixed',
          top: 16,
          left: '50vw',
          transform: 'translateX(-50%)',
          zIndex: 10,
          padding: '8px 16px',
          ...glassStyle,
        }}
      >
        <Text fw={600} size="sm">
          {agentName || 'Untitled Agent'}
        </Text>

        <Group gap='xs'>
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

          <ActionIcon
            size="xs"
            variant="subtle"
            color="green"
            title='Run'
            onClick={onRun}
          >
            <IconPlayerPlay size={16} />
          </ActionIcon>
        </Group>
      </Group>
    </>
  );
}
