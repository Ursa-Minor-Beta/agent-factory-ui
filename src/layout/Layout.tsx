import { Suspense } from 'react';
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
} from '@tabler/icons-react';
import { useAuth } from '../contexts/AuthContext';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { label: 'Agents', path: '/agents', icon: <IconRobot size={20} /> },
  { label: 'Providers', path: '/providers', icon: <IconSettings size={20} /> },
  { label: 'Secrets', path: '/secrets', icon: <IconLock size={20} /> },
  { label: 'Sessions', path: '/sessions', icon: <IconMessages size={20} /> },
  { label: 'Runs', path: '/runs', icon: <IconHistory size={20} /> },
  { label: 'Files', path: '/files', icon: <IconFiles size={20} /> },
  { label: 'Users', path: '/users', icon: <IconUsers size={20} />, adminOnly: true },
  { label: 'API Keys', path: '/api-keys', icon: <IconKey size={20} /> },
  { label: 'Settings', path: '/settings', icon: <IconTool size={20} />, adminOnly: true },
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

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const filteredNavItems = navItems.filter(
    (item) => !item.adminOnly || user?.role === 'admin'
  );

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
          {filteredNavItems.map((item) => (
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
          ))}
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
    </AppShell>
  );
}
