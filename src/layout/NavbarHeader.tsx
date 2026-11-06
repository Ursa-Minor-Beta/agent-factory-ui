import { Group, Burger, Text, ActionIcon, Tooltip, AppShell } from '@mantine/core';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { config } from '../config';
import classes from './NavbarHeader.module.css';

interface NavbarHeaderProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  mobileOpened: boolean;
  toggleMobile: () => void;
}

export function NavbarHeader({ collapsed, setCollapsed, mobileOpened, toggleMobile }: NavbarHeaderProps) {
  return (
    <>
      <AppShell.Section>
        <Group
          justify={collapsed ? 'center' : 'space-between'}
          px={collapsed ? 0 : 'xs'}
          py="xs"
          className={classes.header}
          onClick={() => setCollapsed(!collapsed)}
        >
          {!collapsed && (
            <Text fw={600} size="lg">{config.appName}</Text>
          )}
          <Group gap="xs">
            <Burger
              opened={mobileOpened}
              onClick={(e) => {
                e.stopPropagation();
                toggleMobile();
              }}
              hiddenFrom="sm"
              size="sm"
            />
            <Tooltip label={collapsed ? 'Expand' : 'Collapse'} position="right">
              <ActionIcon
                variant="subtle"
                className={classes.toggle}
                visibleFrom="sm"
              >
                {collapsed ? <IconChevronRight size={18} /> : <IconChevronLeft size={18} />}
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>
      </AppShell.Section>
    </>
  );
}
