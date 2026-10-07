import { useEffect, useState } from 'react';
import { IconFolder } from '@tabler/icons-react';
import { createElement } from 'react';
import { workspacesApi } from '../api/workspaces';
import type { Workspace } from '../types/workspace';
import type { NavItem } from './types';
import { getBaseNavItems } from './navConfig';

export function useWorkspaceNav() {
  const [navItems, setNavItems] = useState<NavItem[]>(getBaseNavItems());

  const updateWorkspaceNav = (workspaces: Workspace[]) => {
    const baseItems = getBaseNavItems();
    const workspacesIndex = baseItems.findIndex(item => item.path === '/workspaces');

    if (workspacesIndex !== -1 && workspaces.length > 0) {
      const workspaceChildren: NavItem[] = workspaces.map(ws => ({
        label: ws.name,
        path: `/workspaces/${ws.id}`,
        icon: createElement(IconFolder, { size: 18 }),
      }));

      baseItems[workspacesIndex] = {
        ...baseItems[workspacesIndex],
        children: workspaceChildren,
      };
    }

    setNavItems(baseItems);
  };

  // Load workspaces for navigation
  useEffect(() => {
    const loadWorkspaces = async () => {
      try {
        const data = await workspacesApi.list({ limit: 10, sortBy: 'name', sortOrder: 'asc' });
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

      const currentWorkspacesItem = navItems.find(item => item.path === '/workspaces');
      const currentWorkspaces = currentWorkspacesItem?.children?.map(child => ({
        id: child.path.split('/').pop()!,
        name: child.label,
      })) || [];

      const updatedWorkspaces = [...currentWorkspaces, workspace]
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
        .slice(0, 10);

      updateWorkspaceNav(updatedWorkspaces as Workspace[]);
    };

    const handleWorkspaceUpdated = (event: Event) => {
      const { workspace } = (event as CustomEvent).detail;

      // Validate workspace has required fields
      if (!workspace?.id || !workspace?.name) {
        console.warn('workspace-updated event missing id or name:', workspace);
        return;
      }

      const currentWorkspacesItem = navItems.find(item => item.path === '/workspaces');

      if (currentWorkspacesItem?.children) {
        const updatedWorkspaces = currentWorkspacesItem.children
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
      const currentWorkspacesItem = navItems.find(item => item.path === '/workspaces');

      if (currentWorkspacesItem?.children) {
        const updatedWorkspaces = currentWorkspacesItem.children
          .filter(child => child.path !== `/workspaces/${workspaceId}`)
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
