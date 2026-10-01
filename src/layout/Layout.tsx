import { Suspense, useEffect, useState, lazy } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import {
  AppShell,
  Burger,
  Group,
  NavLink,
  Text,
  ActionIcon,
  Avatar,
  Menu,
  Divider,
  Tooltip,
  Box,
  Center,
  Loader,
  useMantineColorScheme,
} from '@mantine/core';
import { useDisclosure, useLocalStorage } from '@mantine/hooks';
import {
  IconRobot,
  IconSettings,
  IconKey,
  IconLock,
  IconHistory,
  IconMessages,
  IconUsers,
  IconLogout,
  IconChevronLeft,
  IconChevronRight,
  IconFiles,
  IconSun,
  IconMoon,
  IconTool,
  IconDatabase,
  IconFolders,
  IconFolder,
  IconList,
  IconPlus,
} from '@tabler/icons-react';
import { useAuth } from '../contexts/AuthContext';
import { workspacesApi } from '../api/workspaces';
import type { Workspace } from '../types/workspace';

// Lazy load global modals
const RunDetailsModal = lazy(() =>
  import('../components/RunDetailsModal').then((module) => ({
    default: module.RunDetailsModal,
  }))
);

const AgentModalWrapper = lazy(() =>
  import('../components/AgentCreateModal').then((module) => ({
    default: module.AgentModalWrapper,
  }))
);

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
  children?: NavItem[];
}

const getBaseNavItems = (): NavItem[] => [
  { label: 'Agents', path: '/agents', icon: <IconRobot size={20} /> },
  { label: 'Workspaces', path: '/workspaces', icon: <IconFolders size={20} /> }, // Will be populated dynamically
  { label: 'Providers', path: '/providers', icon: <IconSettings size={20} /> },
  { label: 'Secrets', path: '/secrets', icon: <IconLock size={20} /> },
  { label: 'Collections', path: '/collections', icon: <IconDatabase size={20} /> },
  { label: 'Sessions', path: '/sessions', icon: <IconMessages size={20} /> },
  { label: 'Runs', path: '/runs', icon: <IconHistory size={20} /> },
  { label: 'Files', path: '/files', icon: <IconFiles size={20} /> },
  {
    label: 'Settings',
    path: '/settings',
    icon: <IconTool size={20} />,
    children: [
      { label: 'Users', path: '/settings/users', icon: <IconUsers size={18} />, adminOnly: true },
      { label: 'API Keys', path: '/settings/api-keys', icon: <IconKey size={18} /> },
      { label: 'System', path: '/settings/system', icon: <IconSettings size={18} />, adminOnly: true },
    ],
  },
];

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpened, { toggle: toggleMobile, close: closeMobile }] = useDisclosure();
  const [collapsed, setCollapsed] = useLocalStorage({
    key: 'nav-sidebar-collapsed',
    defaultValue: true,
  });
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const [navItems, setNavItems] = useState<NavItem[]>(getBaseNavItems());

  // Helper to update workspace children in nav
  const updateWorkspaceNav = (workspaces: Workspace[]) => {
    const baseItems = getBaseNavItems();
    const workspacesIndex = baseItems.findIndex(item => item.path === '/workspaces');

    if (workspacesIndex !== -1 && workspaces.length > 0) {
      const workspaceChildren: NavItem[] = workspaces.map(ws => ({
        label: ws.name,
        path: `/workspaces/${ws.id}`,
        icon: <IconFolder size={18} />,
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
      const currentWorkspacesItem = navItems.find(item => item.path === '/workspaces');
      const currentWorkspaces = currentWorkspacesItem?.children?.map(child => ({
        id: child.path.split('/').pop()!,
        name: child.label,
      })) || [];

      // Add new workspace and sort by name
      const updatedWorkspaces = [...currentWorkspaces, workspace]
        .sort((a, b) => a.name.localeCompare(b.name))
        .slice(0, 10); // Keep only top 10

      updateWorkspaceNav(updatedWorkspaces as Workspace[]);
    };

    const handleWorkspaceUpdated = (event: Event) => {
      const { workspace } = (event as CustomEvent).detail;
      const currentWorkspacesItem = navItems.find(item => item.path === '/workspaces');

      if (currentWorkspacesItem?.children) {
        const updatedWorkspaces = currentWorkspacesItem.children
          .map(child => {
            const wsId = child.path.split('/').pop();
            return wsId === workspace.id
              ? { id: workspace.id, name: workspace.name }
              : { id: wsId!, name: child.label };
          })
          .sort((a, b) => a.name.localeCompare(b.name));

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

  // Update browser tab title based on current page
  useEffect(() => {
    const findLabel = (items: NavItem[], path: string): string | null => {
      for (const item of items) {
        if (item.children) {
          const childLabel = findLabel(item.children, path);
          if (childLabel) return childLabel;
        }
        if (path === item.path || path.startsWith(item.path + '/')) {
          return item.label;
        }
      }
      return null;
    };

    const pageLabel = findLabel(navItems, location.pathname);
    document.title = pageLabel ? `Agent Factory | ${pageLabel}` : 'Agent Factory';
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const filterNavItems = (items: NavItem[]): NavItem[] => {
    return items
      .map((item) => {
        if (item.children) {
          const filteredChildren = filterNavItems(item.children);
          if (filteredChildren.length === 0) return null;
          return { ...item, children: filteredChildren };
        }
        if (item.adminOnly && user?.role !== 'admin') return null;
        return item;
      })
      .filter((item): item is NavItem => item !== null);
  };

  const filteredNavItems = filterNavItems(navItems);

  const navbarWidth = collapsed ? 64 : 240;

  return (
    <AppShell
      navbar={{
        width: navbarWidth,
        breakpoint: 'sm',
        collapsed: { mobile: !mobileOpened },
      }}
      padding="md"
    >
      <AppShell.Navbar
        p="xs"
        style={{
          backgroundColor: 'var(--mantine-color-body)',
          borderRight: '1px solid var(--mantine-color-default-border)',
          transition: 'width 200ms ease',
        }}
      >
        <AppShell.Section>
          <Group justify={collapsed ? 'center' : 'space-between'} px={collapsed ? 0 : 'xs'} py="xs">
            {!collapsed && (
              <Text fw={600} size="lg">Agent Factory</Text>
            )}
            <Group gap="xs">
              <Burger
                opened={mobileOpened}
                onClick={toggleMobile}
                hiddenFrom="sm"
                size="sm"
              />
              <Tooltip label={collapsed ? 'Expand' : 'Collapse'} position="right">
                <ActionIcon
                  variant="subtle"
                  onClick={() => setCollapsed(!collapsed)}
                  visibleFrom="sm"
                >
                  {collapsed ? <IconChevronRight size={18} /> : <IconChevronLeft size={18} />}
                </ActionIcon>
              </Tooltip>
            </Group>
          </Group>
        </AppShell.Section>

        <Divider mb="xs" />

        <AppShell.Section grow>
          {filteredNavItems.map((item) =>
            item.children ? (
              <NavLink
                key={item.path}
                label={collapsed ? '' : item.label}
                leftSection={item.icon}
                rightSection={
                  !collapsed && item.path === '/workspaces' ? (
                    <Tooltip label="Create workspace" position="right">
                      <ActionIcon
                        size="xs"
                        variant="subtle"
                        color="cyan"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate('/workspaces?create=true');
                          closeMobile();
                        }}
                      >
                        <IconPlus size={14} />
                      </ActionIcon>
                    </Tooltip>
                  ) : undefined
                }
                defaultOpened={location.pathname.startsWith(item.path)}
                style={{
                  borderRadius: 'var(--mantine-radius-md)',
                  marginBottom: 4,
                }}
                styles={{
                  root: {
                    justifyContent: collapsed ? 'center' : 'flex-start',
                  },
                  body: {
                    display: collapsed ? 'none' : undefined,
                  },
                  section: {
                    marginRight: collapsed ? 0 : undefined,
                  },
                }}
              >
                {!collapsed &&
                  item.children.map((child) => (
                    <NavLink
                      key={child.path}
                      component={Link}
                      to={child.path}
                      active={location.pathname === child.path}
                      label={child.label}
                      leftSection={child.icon}
                      onClick={closeMobile}
                      style={{
                        borderRadius: 'var(--mantine-radius-md)',
                        marginBottom: 2,
                      }}
                    />
                  ))}
              </NavLink>
            ) : (
              <Tooltip
                key={item.path}
                label={item.label}
                position="right"
                disabled={!collapsed}
              >
                <NavLink
                  component={Link}
                  to={item.path}
                  active={location.pathname === item.path}
                  label={collapsed ? '' : item.label}
                  leftSection={item.icon}
                  onClick={closeMobile}
                  style={{
                    borderRadius: 'var(--mantine-radius-md)',
                    marginBottom: 4,
                  }}
                  styles={{
                    root: {
                      justifyContent: collapsed ? 'center' : 'flex-start',
                    },
                    body: {
                      display: collapsed ? 'none' : undefined,
                    },
                    section: {
                      marginRight: collapsed ? 0 : undefined,
                    },
                  }}
                />
              </Tooltip>
            )
          )}
        </AppShell.Section>

        <Divider my="xs" />

        {/* User section at bottom */}
        <AppShell.Section>
          <Menu shadow="md" width={200} position="right-end">
            <Menu.Target>
              <Box
                style={{
                  padding: collapsed ? '8px' : '8px 12px',
                  borderRadius: 'var(--mantine-radius-md)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  justifyContent: collapsed ? 'center' : 'flex-start',
                }}
                className="user-menu-trigger"
              >
                <Avatar color="cyan" radius="xl" size="sm">
                  {user?.name?.charAt(0).toUpperCase()}
                </Avatar>
                {!collapsed && (
                  <Box style={{ flex: 1, overflow: 'hidden' }}>
                    <Text size="sm" fw={500} truncate>
                      {user?.name}
                    </Text>
                    <Text size="xs" c="dimmed" truncate>
                      {user?.email}
                    </Text>
                  </Box>
                )}
              </Box>
            </Menu.Target>

            <Menu.Dropdown>
              <Menu.Label>{user?.email}</Menu.Label>
              <Divider />
              <Menu.Item
                leftSection={colorScheme === 'dark' ? <IconSun size={16} /> : <IconMoon size={16} />}
                onClick={toggleColorScheme}
              >
                {colorScheme === 'dark' ? 'Light mode' : 'Dark mode'}
              </Menu.Item>
              <Menu.Item
                leftSection={<IconLogout size={16} />}
                onClick={handleLogout}
                color="red"
              >
                Logout
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main
        style={{
          minHeight: '100vh',
        }}
      >
        <Suspense fallback={<Center style={{ height: '100%', minHeight: 400 }}><Loader /></Center>}>
          <Outlet />
        </Suspense>
      </AppShell.Main>

      {/* Global modals - read state from URL */}
      <Suspense fallback={null}>
        <RunDetailsModal />
        <AgentModalWrapper />
      </Suspense>
    </AppShell>
  );
}
