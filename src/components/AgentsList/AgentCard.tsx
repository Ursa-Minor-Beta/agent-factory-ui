import { Link } from 'react-router-dom';
import { Card, Text, Group, Stack, ActionIcon, Tooltip, Box, Button, Badge, Flex } from '@mantine/core';
import { IconMessageCircle, IconChevronRight, IconSchema, IconBrandGithub } from '@tabler/icons-react';
import type { AgentCardProps } from './types';
import { AgentActionsMenu } from './AgentActionsMenu';
import { WorkspaceBadge } from '../Workspace';
import { routes } from '../../config/routes';

export function AgentCard({ agent, onEdit, onDelete, onClone, onWorkspace, onExport, compact, currentWorkspaceId }: AgentCardProps) {
  return (
    <Card
      withBorder
      padding={compact ? 'sm' : 'md'}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      <Stack gap="xs" style={{ flex: 1 }}>
        <Flex
          direction={compact ? 'column' : 'row'}
          justify={compact ? undefined : 'space-between'}
          align={compact ? 'center' : 'flex-start'}
          gap={compact ? 6 : 'md'}
          wrap="nowrap"
        >

          <Stack gap="xs" align={compact ? 'center' : undefined} style={compact ? { width: '100%', minWidth: 0 } : undefined}>
            <Group gap={6} wrap="nowrap" justify={compact ? 'center' : undefined} style={{ flex: 1, overflow: 'hidden', maxWidth: '100%' }}>
              <Text
                fw={600}
                style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {agent.name}
              </Text>

              {agent.defaultName && (
                <Tooltip label="Default agent automatically added for fast start, you can edit or restore from system settings">
                  <Text size="xs" c="dimmed">DEFAULT</Text>
                </Tooltip>
              )}
              {agent.systemName && (
                <Tooltip label="System agent automatically added, you can edit or restore from system settings. Used in internal functionality">
                  <Text size="xs" c="dimmed">SYSTEM</Text>
                </Tooltip>
              )}
            </Group>
            {!compact && (
              <Text size="xs" c="dimmed">
                {agent.nodesCount || 0} nodes
              </Text>
            )}
          </Stack>

          <Flex
            direction={compact ? 'row' : 'column'}
            gap="xs"
            align={compact ? 'center' : 'flex-end'}
            // Keep the row even without badges (hidden workspace badge) so graph cards stay the same height
            style={compact ? { alignSelf: 'flex-start', minHeight: 'var(--badge-height-xs, 16px)' } : undefined}
          >
            {(!currentWorkspaceId || agent.workspaceId !== currentWorkspaceId) && (
              <WorkspaceBadge workspaceName={agent.workspaceName} size="xs" />
            )}
            {agent.github && (
              <Tooltip label={`${agent.github.rootId ? 'Sub' : 'Root'} agent: ${agent.github.repository}/${agent.github.path}`}>
                <Badge
                  size="xs"
                  variant={agent.github.rootId ? "outline" : "light" }
                  color="gray"
                  leftSection={<IconBrandGithub size={12} />}
                  >
                  {agent.github.rootId ? 'sub' : 'root'}
                </Badge>
              </Tooltip>
            )}
          </Flex>

        </Flex>

        {!compact && (
          <Text
            size="sm"
            c="dimmed"
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              minHeight: '2.5em',
            }}
          >
            {agent.description || ''}
          </Text>
        )}
      </Stack>
      <Group mt={compact ? 'xs' : 'sm'} gap="xs" justify="space-between">
        <Box>
          <Button
            component={Link}
            size='xs'
            variant='subtle'
            to={routes.agentChat(agent.id)}
            style={{
              padding: '0 4px',
              color: 'var(--mantine-color-cyan-5)',
              textDecoration: 'none',
            }}
          >
            <IconMessageCircle size={16} />
            <Text size="sm" fw={500} c="cyan" ms={8}>Chat</Text>
            <IconChevronRight size={14} />
          </Button>
        </Box>

        <Group gap="xs">
          <Tooltip label="Visual Editor">
            <ActionIcon
              component={Link}
              variant='subtle'
              to={routes.agentEditor(agent.id)}
              title='Visual editor'
              style={{
                padding: '0 2px',
                color: 'var(--mantine-color-text)',
              }}
            >
              <IconSchema size={16} stroke={1} />
            </ActionIcon>
          </Tooltip>
          <AgentActionsMenu
            agent={agent}
            onEdit={onEdit}
            onDelete={onDelete}
            onClone={onClone}
            onWorkspace={onWorkspace}
            onExport={onExport}
          />
        </Group>
      </Group>

    </Card>
  );
}
