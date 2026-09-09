import { Box, Card, Group, ActionIcon, Text, Tooltip } from '@mantine/core';
import { IconArrowLeft, IconMenu2, IconGhost } from '@tabler/icons-react';
import type { ChatHeaderProps } from './types';

export function ChatHeader({
  agent,
  isIncognito,
  isMobile,
  onBack,
  onOpenSidebar,
}: ChatHeaderProps) {
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
          backgroundColor: 'rgba(28, 28, 34, 0.85)',
          backdropFilter: 'blur(12px)',
          border: '1px solid var(--mantine-color-dark-4)',
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
        </Group>
      </Card>
    </Box>
  );
}
