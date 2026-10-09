import { Link, useLocation, useNavigate } from 'react-router-dom';
import { NavLink, Tooltip, ActionIcon, AppShell, HoverCard, Stack } from '@mantine/core';
import { useLocalStorage } from '@mantine/hooks';
import { IconPlus } from '@tabler/icons-react';
import type { NavItem } from './types';

interface NavbarLinksProps {
  items: NavItem[];
  collapsed: boolean;
  closeMobile: () => void;
}

export function NavbarLinks({ items, collapsed, closeMobile }: NavbarLinksProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [openedItems, setOpenedItems] = useLocalStorage<string[]>({
    key: 'nav-opened-items',
    defaultValue: [],
  });

  const toggleItem = (path: string) => {
    setOpenedItems((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]
    );
  };

  const renderParentNavLink = (item: NavItem) => {
    const isActive = location.pathname.startsWith(item.path);

    const isOpened = openedItems.includes(item.path) || isActive;

    const navLinkContent = (
      <NavLink
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
        opened={isOpened}
        onChange={() => toggleItem(item.path)}
        active={collapsed && isActive}
        onClick={collapsed ? () => navigate(item.path) : undefined}
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
          item.children?.map((child) => (
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
    );

    // When collapsed, wrap with HoverCard to show children on hover
    if (collapsed && item.children && item.children.length > 0) {
      return (
        <HoverCard
          key={item.path}
          width={200}
          position="right-start"
          withArrow
          shadow="md"
          openDelay={100}
          closeDelay={100}
        >
          <HoverCard.Target>{navLinkContent}</HoverCard.Target>
          <HoverCard.Dropdown p="xs">
            <Stack gap={4}>
              {item.children.map((child) => (
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
                  }}
                />
              ))}
            </Stack>
          </HoverCard.Dropdown>
        </HoverCard>
      );
    }

    return <div key={item.path}>{navLinkContent}</div>;
  };

  return (
    <AppShell.Section grow>
      {items.map((item) =>
        item.children ? (
          renderParentNavLink(item)
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
  );
}
