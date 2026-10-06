import { Link } from 'react-router-dom';
import { Card, Text, Group, Stack, ActionIcon, Tooltip, Badge } from '@mantine/core';
import {
  IconTrash,
  IconMessageCircle,
  IconChevronRight,
  IconCopy,
  IconSchema,
  IconCode,
  IconFolder,
} from '@tabler/icons-react';
import type { AgentCardProps } from './types';
import { WorkspaceBadge } from '../../components/Workspace';

export function AgentCard({ agent, onEdit, onDelete, onClone, onWorkspace }: AgentCardProps) {
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

            <Group>
              {agent.defaultName && (
                <Tooltip label="Default agent automatically added for fast start, you can edit or restore from system settings">
                  {/* <Text fz='xs' style={{ cursor: 'help' }}>Default agent</Text> */}
                  <Badge size="xs" color="blue" variant="outline" style={{ flexShrink: 0 }}>D</Badge>
                </Tooltip>
              )}
              {agent.systemName && (
                <Tooltip label="System agent automatically added, you can edit or restore from system settings. Used in internal functionality">
                  {/* <Text fz='xs' style={{ cursor: 'help' }}>System agent</Text> */}
                  <Badge size="xs" color="dark" variant="outline" style={{ flexShrink: 0 }}>S</Badge>
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
        <Group gap="md">
          <Link
            to={`/agents/${agent.id}/chat`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              color: 'var(--mantine-color-cyan-5)',
              textDecoration: 'none',
            }}
          >
            <IconMessageCircle size={16} />
            <Text size="sm" fw={500} c="cyan">Chat</Text>
            <IconChevronRight size={14} />
          </Link>
        </Group>
        <Group gap="xs">
          <Tooltip label="Visual Editor">
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
          <ActionIcon
              variant="subtle"
              title='JSON Editor'
              onClick={() => onEdit(agent)}
              >
              <IconCode size={18} />
            </ActionIcon>
          <Tooltip label="Clone">
            <ActionIcon
              variant="subtle"
              onClick={() => onClone(agent)}
            >
              <IconCopy size={18} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Manage workspace">
            <ActionIcon
              variant="subtle"
              color="cyan"
              onClick={() => onWorkspace(agent)}
            >
              <IconFolder size={18} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Delete">
            <ActionIcon
              variant="subtle"
              color="red"
              onClick={() => onDelete(agent)}
            >
              <IconTrash size={18} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>

    </Card>
  );
}
