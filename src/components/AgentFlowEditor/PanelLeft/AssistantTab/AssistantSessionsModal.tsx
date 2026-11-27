import { useEffect, useState } from 'react';
import { ActionIcon, Badge, Center, Group, Loader, Modal, ScrollArea, Stack, Text, Tooltip, UnstyledButton } from '@mantine/core';
import { IconPencil } from '@tabler/icons-react';
import { sessionsApi } from '../../../../api';
import { SessionEditModal } from '../../../SessionEditModal';
import type { Session } from '../../../../types';

const SESSIONS_LIMIT = 50;

interface AssistantSessionsModalProps {
  opened: boolean;
  onClose: () => void;
  // Builder agent - its sessions are listed
  assistantAgentId: string | null;
  currentSessionId: string | null;
  onSelect: (sessionId: string) => void;
}

export function AssistantSessionsModal({ opened, onClose, assistantAgentId, currentSessionId, onSelect }: AssistantSessionsModalProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Session | null>(null);

  useEffect(() => {
    if (!opened || !assistantAgentId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    sessionsApi
      .list({ agentId: assistantAgentId, sortBy: 'updatedAt', sortOrder: 'desc', limit: SESSIONS_LIMIT })
      .then((data) => !cancelled && setSessions(data.items))
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : 'Failed to load sessions'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [opened, assistantAgentId]);

  return (
    <Modal opened={opened} onClose={onClose} title="Build sessions" centered size="md">
      {loading ? (
        <Center py="xl">
          <Loader size="sm" />
        </Center>
      ) : error ? (
        <Text size="sm" c="red" ta="center" py="xl">
          {error}
        </Text>
      ) : !sessions.length ? (
        <Text size="sm" c="dimmed" ta="center" py="xl">
          No sessions yet
        </Text>
      ) : (
        <ScrollArea.Autosize mah="60vh">
          <Stack gap={4}>
            {sessions.map((session) => {
              const current = session.id === currentSessionId;
              return (
                <Group
                  key={session.id}
                  wrap="nowrap"
                  gap={4}
                  style={{
                    borderRadius: 'var(--mantine-radius-md)',
                    background: current ? 'var(--mantine-color-dark-6)' : undefined,
                  }}
                >
                  <UnstyledButton
                    onClick={() => {
                      onSelect(session.id);
                      onClose();
                    }}
                    p="xs"
                    style={{ flex: 1, minWidth: 0 }}
                  >
                    <Group justify="space-between" wrap="nowrap" gap="xs">
                      <Text size="sm" truncate>
                        {session.title || 'Untitled session'}
                      </Text>
                      <Group gap={4} wrap="nowrap">
                        {session.status === 'archived' && (
                          <Badge size="xs" variant="light" color="gray">
                            Archived
                          </Badge>
                        )}
                        {current && (
                          <Badge size="xs" variant="light">
                            Current
                          </Badge>
                        )}
                      </Group>
                    </Group>
                    <Text size="xs" c="dimmed">
                      {new Date(session.updatedAt).toLocaleString()}
                    </Text>
                  </UnstyledButton>
                  <Tooltip label="Edit session">
                    <ActionIcon variant="subtle" size="sm" mr="xs" onClick={() => setEditing(session)}>
                      <IconPencil size={14} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              );
            })}
          </Stack>
        </ScrollArea.Autosize>
      )}

      <SessionEditModal
        opened={!!editing}
        onClose={() => setEditing(null)}
        session={editing}
        onSaved={(updated) => setSessions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))}
      />
    </Modal>
  );
}
