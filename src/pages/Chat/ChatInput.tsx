import { useState } from 'react';
import { Box, Card, Group, Textarea, ActionIcon, Text } from '@mantine/core';
import { IconSend } from '@tabler/icons-react';
import type { ChatInputProps } from './types';

export function ChatInput({
  onSend,
  sending,
  inputRef,
}: ChatInputProps) {
  const [hasContent, setHasContent] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    const value = inputRef.current?.value?.trim();
    if (!value || sending) return;
    onSend(value);
    if (inputRef.current) {
      inputRef.current.value = '';
      setHasContent(false);
    }
  };

  return (
    <Box
      style={{
        position: 'absolute',
        bottom: 0,
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
        <Group gap="sm" align="flex-end">
          <Textarea
            ref={inputRef}
            placeholder="Type a message..."
            onChange={(e) => setHasContent(!!e.currentTarget.value.trim())}
            onKeyDown={handleKeyDown}
            autosize
            minRows={2}
            maxRows={10}
            style={{ flex: 1 }}
            disabled={sending}
          />
          <ActionIcon
            size="lg"
            variant="filled"
            onClick={handleSend}
            disabled={!hasContent || sending}
            title='Press Enter to send, Shift+Enter for new line'
          >
            <IconSend size={18} />
          </ActionIcon>
        </Group>
      </Card>
    </Box>
  );
}
