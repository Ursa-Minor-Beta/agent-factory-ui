import { Group, Burger, Text, ActionIcon, Tooltip, AppShell, Divider } from '@mantine/core';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';

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
    </>
  );
}
