import { memo, useState } from 'react';
import { ActionIcon, Box, Group, Textarea, Tooltip } from '@mantine/core';
import { IconArrowUp, IconPlayerStop } from '@tabler/icons-react';

interface AssistantInputProps {
  disabled: boolean;
  sending: boolean;
  onSend: (text: string) => void;
  onCancel: () => void;
}

// Own component so typing re-renders only the input, not the message list
export const AssistantInput = memo(function AssistantInput({ disabled, sending, onSend, onCancel }: AssistantInputProps) {
  const [draft, setDraft] = useState('');

  const handleSend = () => {
    if (!draft.trim() || sending || disabled) return;
    onSend(draft);
    setDraft('');
  };

  return (
    <Box p="xs" style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}>
      <Group gap={6} align="flex-end" wrap="nowrap">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder={disabled ? 'Select a builder agent first' : 'Ask the assistant...'}
          disabled={disabled}
          autosize
          minRows={1}
          maxRows={8}
          size="sm"
          style={{ flex: 1 }}
        />
        {sending ? (
          <Tooltip label="Stop">
            <ActionIcon size="lg" variant="light" color="red" onClick={onCancel}>
              <IconPlayerStop size={16} />
            </ActionIcon>
          </Tooltip>
        ) : (
          <Tooltip label="Send (Enter)">
            <ActionIcon size="lg" variant="filled" onClick={handleSend} disabled={!draft.trim() || disabled}>
              <IconArrowUp size={16} />
            </ActionIcon>
          </Tooltip>
        )}
      </Group>
    </Box>
  );
});
