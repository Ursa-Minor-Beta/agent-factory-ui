import { Group, Text, ActionIcon, Badge, Tooltip } from '@mantine/core';
import { IconDeviceFloppy, IconLayoutSidebar, IconBrandGithub, IconPlayerPlay, IconArrowBackUp, IconArrowForwardUp } from '@tabler/icons-react';
import { WorkspaceBadge } from '../Workspace';
import type { AgentGitHubInfo } from '../../types/agent';

interface EditorToolbarProps {
  agentName: string;
  agentId?: string;
  workspaceId?: string | null;
  workspaceName?: string | null;
  github?: AgentGitHubInfo | null;
  saving: boolean;
  isPaletteOpen: boolean;
  onSave: () => void;
  onTogglePalette: () => void;
  running?: boolean;
  onRun?: () => void;
  canSave?: boolean;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
const modKey = isMac ? '⌘' : 'Ctrl+';

const glassStyle = {
  background: 'rgba(255, 255, 255, 0.1)',
  backdropFilter: 'blur(8px)',
  borderRadius: 'var(--mantine-radius-md)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
};

export function EditorToolbar({
  agentName,
  agentId,
  workspaceId,
  workspaceName,
  github,
  saving,
  isPaletteOpen,
  onSave,
  onTogglePalette,
  running,
  onRun,
  canSave = true,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: EditorToolbarProps) {
  const isSubAgent = github?.rootId && github.rootId !== agentId;
  return (
    <Group
      gap="sm"
      wrap="nowrap"
      style={isPaletteOpen
        ? { padding: '12px 12px 8px', minWidth: 0 }
        : { position: 'absolute', top: 8, left: 8, zIndex: 10, padding: '4px 12px 4px 4px', ...glassStyle }
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
          ? <WorkspaceBadge workspaceId={workspaceId} workspaceName={workspaceName} size="xs" />
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

      <Group gap="xs" wrap="nowrap" style={{ flexShrink: 0 }}>
        {onUndo && (
          <ActionIcon
            size="xs"
            variant="subtle"
            title={`Undo (${modKey}Z)`}
            disabled={!canUndo}
            onClick={onUndo}
          >
            <IconArrowBackUp size={16} />
          </ActionIcon>
        )}
        {onRedo && (
          <ActionIcon
            size="xs"
            variant="subtle"
            title={`Redo (${modKey}${isMac ? '⇧Z' : 'Y'})`}
            disabled={!canRedo}
            onClick={onRedo}
          >
            <IconArrowForwardUp size={16} />
          </ActionIcon>
        )}
        <ActionIcon
          size="xs"
          variant="subtle"
          title={saving ? 'Saving...' : canSave ? 'Save' : 'No changes'}
          loading={saving}
          // Settings save instantly without graph changes - keep it enabled so the spinner shows
          disabled={!canSave && !saving}
          onClick={onSave}
        >
          <IconDeviceFloppy size={16} />
        </ActionIcon>
        {!!agentId && onRun && (
          <ActionIcon
            size="xs"
            variant="subtle"
            color="cyan"
            title="Run"
            loading={running}
            onClick={onRun}
          >
            <IconPlayerPlay size={16} />
          </ActionIcon>
        )}
      </Group>
      
    </Group>
  );
}
