import { useEffect, useState } from 'react';
import { IconFolder, IconPlus } from '@tabler/icons-react';
import { createElement } from 'react';
import { workspacesApi } from '../api/workspaces';
import type { Workspace } from '../types/workspace';
import type { NavItem } from './types';
import { getBaseNavItems } from './navConfig';
import { routes } from '../config/routes';

export function useWorkspaceNav(onCreateWorkspace: () => void) {
  const [navItems, setNavItems] = useState<NavItem[]>(getBaseNavItems());

  const updateWorkspaceNav = (workspaces: Workspace[]) => {
    const baseItems = getBaseNavItems();
    const workspacesIndex = baseItems.findIndex(item => item.path === routes.workspaces());

    if (workspacesIndex !== -1) {
      const workspaceChildren: NavItem[] = workspaces.map(ws => ({
        label: ws.name,
        path: routes.workspace(ws.id),
        icon: createElement(IconFolder, { size: 18 }),
      }));
      workspaceChildren.push({
        label: 'New',
        path: routes.workspaceCreate(),
        icon: createElement(IconPlus, { size: 18 }),
        onClick: onCreateWorkspace,
      });

      baseItems[workspacesIndex] = {
        ...baseItems[workspacesIndex],
        children: workspaceChildren,
      };
    }

    setNavItems(baseItems);
  };

  // Workspace children currently in nav, excluding the '+ New' item
  const getWorkspaceChildren = () =>
    navItems
      .find(item => item.path === routes.workspaces())
      ?.children?.filter(child => child.path !== routes.workspaceCreate());

  // Load workspaces for navigation
  useEffect(() => {
    const loadWorkspaces = async () => {
      try {
        // Backend caps limit at 100
        const data = await workspacesApi.list({ limit: 100, sortBy: 'name', sortOrder: 'asc' });
        updateWorkspaceNav(data.workspaces);
      } catch (err) {
        console.error('Failed to load workspaces for navigation:', err);
      }
    };

    loadWorkspaces();
  }, []);

  // Listen for workspace changes and update nav without refetching
  useEffect(() => {
    const handleWorkspaceCreated = (event: Event) => {
      const { workspace } = (event as CustomEvent).detail;

      // Validate workspace has required fields
      if (!workspace?.id || !workspace?.name) {
        console.warn('workspace-created event missing id or name:', workspace);
        return;
      }

      const currentWorkspaces = getWorkspaceChildren()?.map(child => ({
        id: child.path.split('/').pop()!,
        name: child.label,
      })) || [];

      const updatedWorkspaces = [...currentWorkspaces, workspace]
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

      updateWorkspaceNav(updatedWorkspaces as Workspace[]);
    };

    const handleWorkspaceUpdated = (event: Event) => {
      const { workspace } = (event as CustomEvent).detail;

      // Validate workspace has required fields
      if (!workspace?.id || !workspace?.name) {
        console.warn('workspace-updated event missing id or name:', workspace);
        return;
      }

      const children = getWorkspaceChildren();

      if (children) {
        const updatedWorkspaces = children
          .map(child => {
            const wsId = child.path.split('/').pop();
            return wsId === workspace.id
              ? { id: workspace.id, name: workspace.name }
              : { id: wsId!, name: child.label };
          })
          .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

        updateWorkspaceNav(updatedWorkspaces as Workspace[]);
      }
    };

    const handleWorkspaceDeleted = (event: Event) => {
      const { workspaceId } = (event as CustomEvent).detail;
      const children = getWorkspaceChildren();

      if (children) {
        const updatedWorkspaces = children
          .filter(child => child.path !== routes.workspace(workspaceId))
          .map(child => ({
            id: child.path.split('/').pop()!,
            name: child.label,
          }));

        updateWorkspaceNav(updatedWorkspaces as Workspace[]);
      }
    };

    window.addEventListener('workspace-created', handleWorkspaceCreated);
    window.addEventListener('workspace-updated', handleWorkspaceUpdated);
    window.addEventListener('workspace-deleted', handleWorkspaceDeleted);

    return () => {
      window.removeEventListener('workspace-created', handleWorkspaceCreated);
      window.removeEventListener('workspace-updated', handleWorkspaceUpdated);
      window.removeEventListener('workspace-deleted', handleWorkspaceDeleted);
    };
  }, [navItems]);

  return navItems;
}
