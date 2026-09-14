import { useState, useRef, useEffect } from 'react';
import {
  Box,
  Text,
  Button,
  Group,
  Stack,
  ActionIcon,
  Paper,
  Loader,
  ScrollArea,
  Tooltip,
  Center,
  NavLink,
  Divider,
  TextInput,
} from '@mantine/core';
import { IconPlus, IconTrash, IconGhost, IconX, IconPencil, IconCheck } from '@tabler/icons-react';
import type { ChatSidebarProps } from './types';

function formatSessionTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (days === 1) {
    return 'Yesterday';
  } else if (days < 7) {
    return date.toLocaleDateString([], { weekday: 'short' });
  } else {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
}

interface SidebarContentProps extends ChatSidebarProps {}

function SessionItem({
  session,
  isActive,
  onSelect,
  onDelete,
  onRename,
}: {
  session: ChatSidebarProps['sessions'][0];
  isActive: boolean;
  onSelect: () => void;
  onDelete: (e: React.MouseEvent) => void;
  onRename: (title: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(session.title || '');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const handleSave = async () => {
    if (saving) return;
    const newTitle = title.trim();
    if (newTitle === (session.title || '')) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onRename(newTitle || '');
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const displayText = session.title || formatSessionTime(session.updatedAt);

  if (editing) {
    return (
      <Box px="sm" py={4}>
        <TextInput
          ref={inputRef}
          size="xs"
          value={title}
          onChange={(e) => setTitle(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') {
              setTitle(session.title || '');
              setEditing(false);
            }
          }}
          onBlur={handleSave}
          disabled={saving}
          rightSection={
            <ActionIcon size="xs" variant="subtle" onClick={handleSave} loading={saving}>
              <IconCheck size={12} />
            </ActionIcon>
          }
        />
      </Box>
    );
  }

  return (
    <NavLink
      active={isActive}
      label={
        <Group justify="space-between" wrap="nowrap" gap={4}>
          <Text size="sm" truncate style={{ flex: 1 }}>
            {displayText}
          </Text>
          <Group gap={2} wrap="nowrap">
            <ActionIcon
              size="xs"
              variant="subtle"
              title='Rename'
              onClick={(e) => {
                e.stopPropagation();
                setTitle(session.title || '');
                setEditing(true);
              }}
            >
              <IconPencil size={12} />
            </ActionIcon>
            <ActionIcon
              size="xs"
              variant="subtle"
              color="red"
              title="Remove"
              onClick={onDelete}
            >
              <IconTrash size={12} />
            </ActionIcon>
          </Group>
        </Group>
      }
      onClick={onSelect}
      style={{ borderRadius: 'var(--mantine-radius-md)' }}
    />
  );
}

function SidebarContent({
  sessions,
  currentSessionId,
  loading,
  onNewChat,
  onSelectSession,
  onDeleteSession,
  onRenameSession,
}: SidebarContentProps) {
  return (
    <Stack gap="xs" h="100%">
      <Group gap="xs">
        <Button
          fullWidth
          leftSection={<IconPlus size={16} />}
          onClick={() => onNewChat(false)}
          variant="light"
          style={{ flex: 1 }}
        >
          New Chat
        </Button>
        <Tooltip label="New incognito chat (not saved)">
          <ActionIcon
            variant="light"
            color="violet"
            size="lg"
            onClick={() => onNewChat(true)}
          >
            <IconGhost size={18} />
          </ActionIcon>
        </Tooltip>
      </Group>

      <Divider my="xs" />

      <Text size="xs" c="dimmed" fw={500} tt="uppercase">
        Conversations
      </Text>

      <ScrollArea style={{ flex: 1 }}>
        {loading ? (
          <Center py="md">
            <Loader size="sm" />
          </Center>
        ) : sessions.length === 0 ? (
          <Text size="sm" c="dimmed" ta="center" py="md">
            No conversations yet
          </Text>
        ) : (
          <Stack gap={4}>
            {sessions.map((session) => (
              <SessionItem
                key={session.id}
                session={session}
                isActive={currentSessionId === session.id}
                onSelect={() => onSelectSession(session)}
                onDelete={(e) => onDeleteSession(session.id, e)}
                onRename={(title) => onRenameSession(session.id, title)}
              />
            ))}
          </Stack>
        )}
      </ScrollArea>
    </Stack>
  );
}

interface ChatSidebarComponentProps extends ChatSidebarProps {
  isMobile: boolean;
  isOpen: boolean;
  onClose: () => void;
}

export function ChatSidebar({
  sessions,
  currentSessionId,
  loading,
  onNewChat,
  onSelectSession,
  onDeleteSession,
  onRenameSession,
  isMobile,
  isOpen,
  onClose,
}: ChatSidebarComponentProps) {
  const sidebarContent = (
    <SidebarContent
      sessions={sessions}
      currentSessionId={currentSessionId}
      loading={loading}
      onNewChat={(incognito) => {
        onNewChat(incognito);
        if (isMobile) onClose();
      }}
      onSelectSession={(session) => {
        onSelectSession(session);
        if (isMobile) onClose();
      }}
      onDeleteSession={onDeleteSession}
      onRenameSession={onRenameSession}
    />
  );

  // Desktop sidebar
  if (!isMobile) {
    return (
      <Paper
        withBorder
        p="md"
        style={{
          width: 260,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {sidebarContent}
      </Paper>
    );
  }

  // Mobile sidebar overlay
  if (!isOpen) return null;

  return (
    <Box
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 100,
      }}
      onClick={onClose}
    >
      <Paper
        p="md"
        style={{
          width: 280,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <Group justify="space-between" mb="md">
          <Text fw={600}>Conversations</Text>
          <ActionIcon variant="subtle" onClick={onClose}>
            <IconX size={18} />
          </ActionIcon>
        </Group>
        {sidebarContent}
      </Paper>
    </Box>
  );
}
