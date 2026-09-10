import { useState, useRef, useEffect, useMemo } from 'react';
import { Box, Card, Stack, Group, Textarea, ActionIcon, Text, UnstyledButton } from '@mantine/core';
import { IconSend, IconChevronDown, IconChevronRight } from '@tabler/icons-react';
import type { ChatInputProps } from './types';

export function ChatInput({ onSend, sending, inputSchema }: ChatInputProps) {
  const fields = useMemo(() => Object.entries(inputSchema), [inputSchema]);
  const requiredFields = useMemo(() => fields.filter(([, schema]) => schema.required), [fields]);
  const optionalFields = useMemo(() => fields.filter(([, schema]) => !schema.required), [fields]);

  const isSingleField = fields.length === 1;
  const hasOptionalFields = optionalFields.length > 0;

  // Track values for each field
  const [values, setValues] = useState<Record<string, string>>({});
  const [optionalOpen, setOptionalOpen] = useState(false);
  const inputRefs = useRef<Record<string, HTMLInputElement | HTMLTextAreaElement | null>>({});

  // Reset values when schema changes
  useEffect(() => {
    setValues({});
  }, [inputSchema]);

  const handleChange = (field: string, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && isSingleField) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    const input: Record<string, unknown> = {};
    let hasAllRequired = true;

    for (const [key, schema] of fields) {
      const value = values[key]?.trim() || '';
      if (schema.required && !value) {
        hasAllRequired = false;
        break;
      }
      if (value) {
        if (schema.type === 'number') {
          input[key] = Number(value);
        } else if (schema.type === 'boolean') {
          input[key] = value.toLowerCase() === 'true';
        } else {
          input[key] = value;
        }
      }
    }

    if (!hasAllRequired || sending) return;

    onSend(input);
    setValues({});
    Object.values(inputRefs.current).forEach((ref) => {
      if (ref) ref.value = '';
    });
  };

  const hasRequiredContent = requiredFields.every(([key]) => !!values[key]?.trim());

  const formatLabel = (key: string) => {
    return key
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  };

  const renderField = (key: string, _schema: { type: string; required?: boolean }) => {
    return <Textarea
              key={key}
              ref={(el) => { inputRefs.current[key] = el; }}
              label={!isSingleField ? formatLabel(key) : undefined}
              placeholder={isSingleField ? `Enter ${formatLabel(key).toLowerCase()}...` : undefined}
              value={values[key] || ''}
              onChange={(e) => handleChange(key, e.currentTarget.value)}
              onKeyDown={handleKeyDown}
              autosize
              minRows={isSingleField ? 2 : 1}
              maxRows={6}
              disabled={sending}
            />
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
        <Group align="flex-end" gap="sm" wrap="nowrap">
          <Stack gap="xs" style={{ flex: 1 }}>
            {requiredFields.map(([key, schema]) => renderField(key, schema))}

            {hasOptionalFields && (
              <>
                <UnstyledButton onClick={() => setOptionalOpen(!optionalOpen)}>
                  <Group gap={4}>
                    {optionalOpen ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
                    <Text size="xs" c="dimmed">
                      {optionalFields.length} optional field{optionalFields.length > 1 ? 's' : ''}
                    </Text>
                  </Group>
                </UnstyledButton>
                {optionalOpen && (
                  <Stack gap="xs">
                    {optionalFields.map(([key, schema]) => renderField(key, schema))}
                  </Stack>
                )}
              </>
            )}
          </Stack>

          <ActionIcon
            size="lg"
            variant="filled"
            onClick={handleSend}
            disabled={!hasRequiredContent || sending}
            title={isSingleField ? 'Press Enter to send' : 'Fill required fields'}
          >
            <IconSend size={18} />
          </ActionIcon>
        </Group>
      </Card>
    </Box>
  );
}
