import { Link } from 'react-router-dom';
import { Card, Text, Group, Stack, ActionIcon, Tooltip, Menu, Button, Box } from '@mantine/core';
import {
  IconTrash,
  IconMessageCircle,
  IconChevronRight,
  IconCopy,
  IconSchema,
  IconCode,
  IconFolder,
  IconDotsVertical,
  IconUpload,
  IconBrandGithub,
} from '@tabler/icons-react';
import type { AgentCardProps } from './types';
import { WorkspaceBadge } from '../Workspace';

export function AgentCard({ agent, onEdit, onDelete, onClone, onWorkspace, onExport }: AgentCardProps) {
  return (
    <Card
      withBorder
      padding="md"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      <Stack gap="xs" style={{ flex: 1 }}>
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <Group gap={6} wrap="nowrap" style={{ flex: 1, overflow: 'hidden' }}>
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

            <Group gap="xs">
              {agent.githubRepository && (
                <Tooltip label={`Linked to: ${agent.githubRepository}/${agent.githubPath || ''}`}>
                  <IconBrandGithub size={16} style={{ color: 'var(--mantine-color-dimmed)' }} />
                </Tooltip>
              )}
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

          </Group>
          <WorkspaceBadge workspaceName={agent.workspaceName} size="xs" />
        </Group>
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
          {agent.description || 'No description'}
        </Text>
      </Stack>
      <Group mt="sm" gap="xs" justify="space-between">
        <Box>
          <Button
            component='a'
            size='xs'
            variant='subtle'
            href={`/agents/${agent.id}/chat`}
            style={{
              padding: '0 4px',
              color: 'var(--mantine-color-cyan-5)',
              textDecoration: 'none',
            }}
          >
            <IconMessageCircle size={16} />
            <Text size="sm" fw={500} c="cyan" ms={2}>Chat</Text>
            <IconChevronRight size={14} />
          </Button>
        </Box>

        <Group gap="xs">
          <Tooltip label="Visual Editor">
            <ActionIcon
              component='a'
              variant='subtle'
              href={`/agents/${agent.id}/editor`}
              title='Visual editor'
              style={{
                padding: '0 2px',
                color: 'var(--mantine-color-text)',
              }}
            >
              <IconSchema size={16} stroke={1} />
            </ActionIcon>
          </Tooltip>
          <Menu position="bottom-end" withinPortal>
            <Menu.Target>
              <ActionIcon variant="subtle">
                <IconDotsVertical size={18} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item leftSection={<IconCode size={16} />} onClick={() => onEdit(agent)}>
                JSON Editor
              </Menu.Item>
              <Menu.Item leftSection={<IconCopy size={16} />} onClick={() => onClone(agent)}>
                Clone
              </Menu.Item>
              <Menu.Item leftSection={<IconUpload size={16} />} onClick={() => onExport(agent)}>
                Export
              </Menu.Item>
              <Menu.Item leftSection={<IconFolder size={16} />} onClick={() => onWorkspace(agent)}>
                Manage workspace
              </Menu.Item>
              <Menu.Divider />
              <Menu.Item leftSection={<IconTrash size={16} />} color="red" onClick={() => onDelete(agent)}>
                Delete
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </Group>

    </Card>
  );
}
