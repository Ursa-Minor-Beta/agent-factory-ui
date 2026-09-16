import { Box, Card, Group, ActionIcon, Text, Tooltip, useMantineColorScheme } from '@mantine/core';
import { IconMenu2, IconGhost, IconPencil, IconCode } from '@tabler/icons-react';
import type { ChatHeaderProps } from './types';

export function ChatHeader({
  agent,
  isIncognito,
  isMobile,
  onOpenSidebar,
  onEditAgent,
  onEditJson,
}: ChatHeaderProps) {
  const { colorScheme } = useMantineColorScheme();
  const glassBg = colorScheme === 'dark' ? 'rgba(28, 28, 34, 0.85)' : 'rgba(255, 255, 255, 0.85)';

  return (
    <Box
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        pointerEvents: 'none',
      }}
    >
      <Card
        p="sm"
        radius="lg"
        mr="lg"
        style={{
          backgroundColor: glassBg,
          backdropFilter: 'blur(12px)',
          border: '1px solid var(--mantine-color-default-border)',
          pointerEvents: 'auto',
        }}
      >
        <Group justify="space-between">
          <Group gap="sm">
            {isMobile && (
              <ActionIcon variant="subtle" onClick={onOpenSidebar}>
                <IconMenu2 size={18} />
              </ActionIcon>
            )}
            <Text fw={600}>{agent.name}</Text>
            {isIncognito && (
              <Tooltip label="Incognito mode - messages won't be saved">
                <IconGhost size={18} color="var(--mantine-color-violet-5)" />
              </Tooltip>
            )}
          </Group>
          <Group gap="xs">
            <Tooltip label="Edit JSON">
              <ActionIcon variant="subtle" onClick={onEditJson}>
                <IconCode size={18} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Edit agent">
              <ActionIcon variant="subtle" onClick={onEditAgent}>
                <IconPencil size={18} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>
      </Card>
    </Box>
  );
}
