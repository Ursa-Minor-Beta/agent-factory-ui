import { useEffect, useRef } from 'react';
import { Box, Menu } from '@mantine/core';
import { Link } from 'react-router-dom';
import { IconMessageCircle, IconSchema } from '@tabler/icons-react';
import type { Agent } from '../../types';
import { routes } from '../../config/routes';
import { AgentActionsMenuItems } from '../AgentsList/AgentActionsMenu';
import type { AgentCardProps } from '../AgentsList/types';

/** The agents list's agent actions, as on its cards */
export type CardActions = Omit<AgentCardProps, 'agent' | 'compact'>;

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
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on a press outside. Capture phase: React Flow's pan handler stops mousedown from reaching the document,
  // so Mantine's own click-outside never sees clicks on the canvas
  useEffect(() => {
    if (!menu) return;
    const handle = (event: PointerEvent) => {
      if (!dropdownRef.current?.contains(event.target as globalThis.Node)) onClose();
    };
    window.addEventListener('pointerdown', handle, true);
    return () => window.removeEventListener('pointerdown', handle, true);
  }, [menu, onClose]);

  return (
    <Menu opened={!!menu} onChange={(opened) => !opened && onClose()} position="bottom-start" withinPortal>
      <Menu.Target>
        {/* Invisible anchor at the click point */}
        <Box style={{ position: 'fixed', left: menu?.x ?? 0, top: menu?.y ?? 0, width: 0, height: 0 }} />
      </Menu.Target>
      {menu && (
        <Menu.Dropdown ref={dropdownRef}>
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
