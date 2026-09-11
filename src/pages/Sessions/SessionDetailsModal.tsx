import { useState, useEffect } from 'react';
import {
  Modal,
  Text,
  Card,
  Group,
  Badge,
  Stack,
  Code,
  ScrollArea,
  Paper,
  SimpleGrid,
  Box,
  CopyButton,
  ActionIcon,
  Tooltip,
  Loader,
  Center,
  Alert,
  Textarea,
} from '@mantine/core';
import {
  IconCheck,
  IconCopy,
  IconAlertCircle,
  IconUser,
  IconRobot,
  IconEyeOff,
} from '@tabler/icons-react';
import { sessionsApi } from '../../api';
import type { Message } from '../../types';
import type { SessionDetailsModalProps } from './types';
import { statusColors, formatDate } from './types';

export function SessionDetailsModal({ session, opened, onClose }: SessionDetailsModalProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (session && opened) {
      loadMessages();
    }
  }, [session, opened]);

  const loadMessages = async () => {
    if (!session) return;
    try {
      setLoading(true);
      setError('');
      const data = await sessionsApi.getMessages(session.id, 20);
      setMessages(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  if (!session) return null;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="sm">
          <Text fw={600}>Session Details</Text>
          <Badge color={statusColors[session.status]} variant="light">
            {session.status}
          </Badge>
          {session.incognito && (
            <Tooltip label="Incognito session">
              <Badge color="violet" variant="light" leftSection={<IconEyeOff size={12} />}>
                Incognito
              </Badge>
            </Tooltip>
          )}
        </Group>
      }
      fullScreen
    >
      <Stack gap="lg">
        {/* Header Info Card */}
        <Card withBorder padding="md">
          <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="lg">
            <Box>
              <Text size="xs" c="dimmed" tt="uppercase" fw={500}>
                Title
              </Text>
              <Text size="sm" fw={500}>{session.title || 'Untitled'}</Text>
            </Box>
            <Box>
              <Text size="xs" c="dimmed" tt="uppercase" fw={500}>
                Agent ID
              </Text>
              <Group gap="xs">
                <Code fz="xs">{session.agentId}</Code>
                <CopyButton value={session.agentId}>
                  {({ copied, copy }) => (
                    <Tooltip label={copied ? 'Copied' : 'Copy'}>
                      <ActionIcon variant="subtle" size="xs" onClick={copy}>
                        {copied ? <IconCheck size={12} /> : <IconCopy size={12} />}
                      </ActionIcon>
                    </Tooltip>
                  )}
                </CopyButton>
              </Group>
            </Box>
            <Box>
              <Text size="xs" c="dimmed" tt="uppercase" fw={500}>
                Created
              </Text>
              <Text size="sm">{formatDate(session.createdAt)}</Text>
            </Box>
            <Box>
              <Text size="xs" c="dimmed" tt="uppercase" fw={500}>
                Session ID
              </Text>
              <Group gap="xs">
                <Code fz="xs">{session.id.slice(0, 12)}...</Code>
                <CopyButton value={session.id}>
                  {({ copied, copy }) => (
                    <Tooltip label={copied ? 'Copied' : 'Copy'}>
                      <ActionIcon variant="subtle" size="xs" onClick={copy}>
                        {copied ? <IconCheck size={12} /> : <IconCopy size={12} />}
                      </ActionIcon>
                    </Tooltip>
                  )}
                </CopyButton>
              </Group>
            </Box>
          </SimpleGrid>
        </Card>

        {/* Agent Notes */}
        <Card withBorder padding="md">
          <Text size="xs" c="dimmed" tt="uppercase" fw={500} mb="xs">
            Agent Notes
          </Text>
          <Textarea
            value={session.agentNotes || ''}
            readOnly
            autosize
            minRows={2}
            maxRows={10}
            styles={{
              input: {
                backgroundColor: 'var(--mantine-color-dark-7)',
                cursor: 'default',
              },
            }}
          />
        </Card>

        {/* Messages */}
        <Card withBorder padding="md">
          <Text size="xs" c="dimmed" tt="uppercase" fw={500} mb="md">
            Last 20 messages
          </Text>

          {error && (
            <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light" mb="md">
              {error}
            </Alert>
          )}

          {loading ? (
            <Center py="xl">
              <Loader />
            </Center>
          ) : (
            <ScrollArea.Autosize mah={500}>
              <Stack gap="sm">
                {messages.map((message) => (
                  <Paper
                    key={message.id}
                    p="sm"
                    radius="sm"
                    withBorder
                    style={{
                      borderLeftWidth: 3,
                      borderLeftColor: message.role === 'user'
                        ? 'var(--mantine-color-blue-6)'
                        : message.role === 'assistant'
                        ? 'var(--mantine-color-green-6)'
                        : 'var(--mantine-color-gray-6)',
                    }}
                  >
                    <Group gap="xs" mb="xs">
                      {message.role === 'user' ? (
                        <IconUser size={14} />
                      ) : message.role === 'assistant' ? (
                        <IconRobot size={14} />
                      ) : null}
                      <Text size="xs" fw={500} tt="capitalize">
                        {message.role}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {formatDate(message.createdAt)}
                      </Text>
                    </Group>
                    <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                      {message.content}
                    </Text>
                    {message.toolCalls && message.toolCalls.length > 0 && (
                      <Box mt="sm">
                        <Text size="xs" c="dimmed" fw={500} mb={4}>
                          Tool Calls
                        </Text>
                        <Code block style={{ fontSize: 11 }}>
                          {JSON.stringify(message.toolCalls, null, 2)}
                        </Code>
                      </Box>
                    )}
                  </Paper>
                ))}
                {messages.length === 0 && (
                  <Text ta="center" c="dimmed" py="md">
                    No messages in this session
                  </Text>
                )}
              </Stack>
            </ScrollArea.Autosize>
          )}
        </Card>
      </Stack>
    </Modal>
  );
}
