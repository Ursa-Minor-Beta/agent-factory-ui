import { Box, Card, Group, ActionIcon, Text, Tooltip, Badge, useMantineColorScheme } from '@mantine/core';
import { IconMenu2, IconGhost, IconCode, IconSchema, IconFolder } from '@tabler/icons-react';
import type { ChatHeaderProps } from './types';
import { Link } from 'react-router-dom';

export function ChatHeader({
  agent,
  workspaceName,
  isIncognito,
  isMobile,
  onOpenSidebar,
  onEditAgent,
}: ChatHeaderProps) {
  const { colorScheme } = useMantineColorScheme();
  const glassBg = colorScheme === 'dark' ? 'rgba(28, 28, 34, 0.85)' : 'rgba(255, 255, 255, 0.85)';

  return (
    <Box
      style={{
        position: 'absolute',
        top: 'var(--app-shell-padding)',
        left: isMobile ? 0 : 'var(--app-shell-padding)',
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
            {workspaceName && agent.workspaceId && (
              <Link to={`/workspaces/${agent.workspaceId}`} style={{ textDecoration: 'none' }}>
                <Badge
                  variant="light"
                  color="gray"
                  size="sm"
                  leftSection={<IconFolder size={12} />}
                  style={{ cursor: 'pointer' }}
                >
                  {workspaceName}
                </Badge>
              </Link>
            )}
            {isIncognito && (
              <Tooltip label="Incognito mode - messages won't be saved">
                <IconGhost size={18} color="var(--mantine-color-violet-5)" />
              </Tooltip>
            )}
          </Group>
          <Group gap="xs">
            <Tooltip label="Visual editor">
              <Link
                to={`/agents/${agent.id}/editor`}
                title='Visual editor'
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  color: 'var(--mantine-color-violet-5)',
                  textDecoration: 'none',
                }}
              >
                <IconSchema size={16} />
              </Link>
            </Tooltip>
            <Tooltip label="JSON editor">
              <ActionIcon variant="subtle" onClick={onEditAgent}>
                <IconCode size={18} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>
      </Card>
    </Box>
  );
}
