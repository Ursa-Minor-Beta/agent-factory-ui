import { ActionIcon, Menu } from '@mantine/core';
import {
  IconCode,
  IconCopy,
  IconDotsVertical,
  IconFolder,
  IconTrash,
  IconUpload,
} from '@tabler/icons-react';
import type { AgentCardProps } from './types';

type AgentActionsMenuProps = Pick<AgentCardProps, 'agent' | 'onEdit' | 'onDelete' | 'onClone' | 'onWorkspace' | 'onExport'>;

/** "More" menu shared by the agent card and the agents table */
export function AgentActionsMenu({ agent, onEdit, onDelete, onClone, onWorkspace, onExport }: AgentActionsMenuProps) {
  return (
    <Menu position="bottom-end" withinPortal>
      <Menu.Target>
        <ActionIcon variant="subtle">
          <IconDotsVertical size={18} />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item leftSection={<IconCode size={16} />} onClick={() => onEdit(agent)}>
          JSON Editor
        </Menu.Item>
        <Menu.Item leftSection={<IconCopy size={16} />} onClick={() => onClone(agent)}>
          Clone
        </Menu.Item>
        <Menu.Item leftSection={<IconUpload size={16} />} onClick={() => onExport(agent)}>
          Export
        </Menu.Item>
        <Menu.Item leftSection={<IconFolder size={16} />} onClick={() => onWorkspace(agent)}>
          Manage workspace
        </Menu.Item>
        <Menu.Divider />
        <Menu.Item leftSection={<IconTrash size={16} />} color="red" onClick={() => onDelete(agent)}>
          Delete
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
