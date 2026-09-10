import { Link } from 'react-router-dom';
import { Card, Text, Group, Stack, ActionIcon, Badge } from '@mantine/core';
import {
  IconTrash,
  IconEdit,
  IconMessageCircle,
  IconChevronRight,
  IconCode,
} from '@tabler/icons-react';
import type { AgentCardProps } from './types';

export function AgentCard({ agent, isAdmin, onEdit, onDelete, onViewJson }: AgentCardProps) {
  return (
    <Card
      withBorder
      padding="md"
      style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
    >
      <Stack gap="xs" style={{ flex: 1 }}>
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <Text
            fw={600}
            style={{
              flex: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {agent.name}
          </Text>
          {isAdmin && agent.isSystem && (
            <Badge color="cyan" size="xs">System</Badge>
          )}
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
        <Text size="xs" c="dimmed">
          {agent.nodes.length} nodes
        </Text>
      </Stack>
      <Group mt="sm" gap="xs" justify="space-between">
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
        <Group gap="xs">
          <ActionIcon
            variant="subtle"
            onClick={() => onViewJson(agent)}
            title="View JSON"
          >
            <IconCode size={18} />
          </ActionIcon>
          <ActionIcon
            variant="subtle"
            onClick={() => onEdit(agent)}
          >
            <IconEdit size={18} />
          </ActionIcon>
          {!agent.isSystem && (
            <ActionIcon
              variant="subtle"
              color="red"
              onClick={() => onDelete(agent)}
            >
              <IconTrash size={18} />
            </ActionIcon>
          )}
        </Group>
      </Group>
    </Card>
  );
}
