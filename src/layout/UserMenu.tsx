import { useNavigate } from 'react-router-dom';
import {
  Menu,
  Box,
  Avatar,
  Text,
  Divider,
  AppShell,
  useMantineColorScheme,
} from '@mantine/core';
import { IconSun, IconMoon, IconLogout } from '@tabler/icons-react';
import { useAuth } from '../contexts/AuthContext';

interface UserMenuProps {
  collapsed: boolean;
}

export function UserMenu({ collapsed }: UserMenuProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
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
  );
}
