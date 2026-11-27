import { Box, Menu } from '@mantine/core';
import { Link } from 'react-router-dom';
import { IconMessageCircle, IconSchema } from '@tabler/icons-react';
import type { Agent } from '../../types';
import { routes } from '../../config/routes';
import { AgentActionsMenuItems } from '../AgentsList/AgentActionsMenu';
import type { CardActions } from './nodes/AgentCardNode';

export interface AgentContextMenuState {
  agent: Agent;
  x: number; // Viewport coordinates of the click
  y: number;
}

interface AgentContextMenuProps {
  menu: AgentContextMenuState | null;
  actions: CardActions;
  onClose: () => void;
}

// Right-click menu on a graph agent: the card's links and actions
export function AgentContextMenu({ menu, actions, onClose }: AgentContextMenuProps) {
  return (
    <Menu opened={!!menu} onChange={(opened) => !opened && onClose()} position="bottom-start" withinPortal>
      <Menu.Target>
        {/* Invisible anchor at the click point */}
        <Box style={{ position: 'fixed', left: menu?.x ?? 0, top: menu?.y ?? 0, width: 0, height: 0 }} />
      </Menu.Target>
      {menu && (
        <Menu.Dropdown>
          <Menu.Label>{menu.agent.name}</Menu.Label>
          <Menu.Item component={Link} to={routes.agentChat(menu.agent.id)} leftSection={<IconMessageCircle size={16} />}>
            Chat
          </Menu.Item>
          <Menu.Item component={Link} to={routes.agentEditor(menu.agent.id)} leftSection={<IconSchema size={16} />}>
            Visual Editor
          </Menu.Item>
          <Menu.Divider />
          <AgentActionsMenuItems agent={menu.agent} {...actions} />
        </Menu.Dropdown>
      )}
    </Menu>
  );
}
