import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Box, Card, Stack, Group, Textarea, ActionIcon, Text, UnstyledButton, Button } from '@mantine/core';
import { useDebouncedCallback } from '@mantine/hooks';
import { IconSend, IconChevronDown, IconChevronRight, IconPlayerPlay } from '@tabler/icons-react';
import type { ChatInputProps } from './types';

const DRAFT_DEBOUNCE_MS = 3000;

export function ChatInput({ onSend, sending, inputSchema, draftKey }: ChatInputProps) {
  const fields = useMemo(() => Object.entries(inputSchema), [inputSchema]);
  const fieldKeys = useMemo(() => new Set(fields.map(([k]) => k)), [fields]);
  // Field is truly required only if required=true AND no default value
  const requiredFields = useMemo(() => fields.filter(([, schema]) => schema.required && schema.default === undefined), [fields]);
  const optionalFields = useMemo(() => fields.filter(([, schema]) => !schema.required || schema.default !== undefined), [fields]);
  const hasNoInputs = fields.length === 0;

  const isSingleField = fields.length === 1;
  const hasOptionalFields = optionalFields.length > 0;

  // Track values for each field
  const [values, setValues] = useState<Record<string, string>>({});
  const [optionalOpen, setOptionalOpen] = useState(false);
  const inputRefs = useRef<Record<string, HTMLInputElement | HTMLTextAreaElement | null>>({});

  // Debounced save to localStorage
  const saveDraft = useDebouncedCallback((draft: Record<string, string>) => {
    const hasContent = Object.values(draft).some((v) => v.trim());
    if (hasContent) {
      localStorage.setItem(draftKey, JSON.stringify(draft));
    } else {
      localStorage.removeItem(draftKey);
    }
  }, DRAFT_DEBOUNCE_MS);

  // Clear draft from localStorage
  const clearDraft = useCallback(() => {
    localStorage.removeItem(draftKey);
    saveDraft.cancel();
  }, [draftKey, saveDraft]);

  // Flush draft on blur (save immediately)
  const flushDraft = useCallback(() => {
    saveDraft.flush();
  }, [saveDraft]);

  // Load draft on mount or when draftKey/schema changes
  // Only load fields that exist in current schema
  useEffect(() => {
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        const parsed = JSON.parse(saved) as Record<string, string>;
        // Filter to only include fields in current schema
        const filtered: Record<string, string> = {};
        for (const [key, value] of Object.entries(parsed)) {
          if (fieldKeys.has(key)) {
            filtered[key] = value;
          }
        }
        setValues(filtered);
      } else {
        setValues({});
      }
    } catch {
      setValues({});
    }
  }, [draftKey, fieldKeys]);

  const handleChange = (field: string, value: string) => {
    setValues((prev) => {
      const updated = { ...prev, [field]: value };
      saveDraft(updated);
      return updated;
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    const input: Record<string, unknown> = {};
    let hasAllRequired = true;

    for (const [key, schema] of fields) {
      const value = values[key]?.trim() || '';
      // Field is truly required only if required=true AND no default
      const isTrulyRequired = schema.required && schema.default === undefined;
      if (isTrulyRequired && !value) {
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

    if (!hasAllRequired || sending) {
      console.warn('Cannot send:', { hasAllRequired, sending });
      return;
    }

    onSend(input);
    setValues({});
    clearDraft();
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

  const renderField = (key: string, schema: { type: string; required?: boolean; default?: unknown }) => {
    const hasDefault = schema.default !== undefined;
    const defaultStr = hasDefault ? String(schema.default) : '';
    const truncatedDefault = defaultStr.length > 50 ? `${defaultStr.slice(0, 50)}...` : defaultStr;
    const defaultPlaceholder = hasDefault ? `Default: ${truncatedDefault}` : undefined;

    return <Textarea
              key={key}
              ref={(el) => { inputRefs.current[key] = el; }}
              label={!isSingleField ? formatLabel(key) : undefined}
              placeholder={defaultPlaceholder}
              value={values[key] || ''}
              onChange={(e) => handleChange(key, e.currentTarget.value)}
              onKeyDown={handleKeyDown}
              onBlur={flushDraft}
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
        {hasNoInputs ? (
          <Group justify="center">
            <Button
              leftSection={<IconPlayerPlay size={18} />}
              onClick={handleSend}
              loading={sending}
            >
              Run
            </Button>
          </Group>
        ) : (
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
        )}
      </Card>
    </Box>
  );
}
