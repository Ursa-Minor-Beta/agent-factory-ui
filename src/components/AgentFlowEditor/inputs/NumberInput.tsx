import { memo, useRef, useEffect } from 'react';
import { NumberInput as MantineNumberInput, Box, Text, Tooltip, Group, ThemeIcon } from '@mantine/core';
import { IconQuestionMark } from '@tabler/icons-react';

const DEBOUNCE_MS = 300;

interface NumberInputProps {
  name: string;
  description?: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
}

export const NumberInput = memo(function NumberInput({ name, description, value, onChange }: NumberInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const onChangeRef = useRef(onChange);
  const debounceRef = useRef<number | null>(null);
  const localValueRef = useRef(value);
  const lastEmittedRef = useRef<number | undefined | null>(null);

  onChangeRef.current = onChange;

  // Sync only on external value changes, not our own emitted changes
  useEffect(() => {
    if (lastEmittedRef.current === value) {
      return;
    }
    localValueRef.current = value;
    // Sync the input element
    if (inputRef.current) {
      inputRef.current.value = value !== undefined ? String(value) : '';
    }
  }, [value]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current !== null) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const handleChange = (val: number | string) => {
    const newValue = typeof val === 'number' ? val : undefined;
    localValueRef.current = newValue;

    if (debounceRef.current !== null) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = window.setTimeout(() => {
      lastEmittedRef.current = localValueRef.current;
      onChangeRef.current(localValueRef.current);
    }, DEBOUNCE_MS);
  };

  const handleBlur = () => {
    if (debounceRef.current !== null) {
      clearTimeout(debounceRef.current);
    }
    lastEmittedRef.current = localValueRef.current;
    onChangeRef.current(localValueRef.current);
  };

  return (
    <Box>
      <Group gap={4} mb={4} justify="space-between" >
        <Text size="xs" c="dimmed">{name}</Text>
        {description && (
          <Tooltip label={description} multiline maw={300}>
            <ThemeIcon size={14} radius="xl" color="gray" variant="light">
              <IconQuestionMark size={10} />
            </ThemeIcon>
          </Tooltip>
        )}
      </Group>
      <MantineNumberInput
        ref={inputRef}
        size="xs"
        defaultValue={value}
        onChange={handleChange}
        onBlur={handleBlur}
        allowDecimal
      />
    </Box>
  );
});
