import { memo, useRef, useEffect } from 'react';
import { NumberInput as MantineNumberInput, Box, Text } from '@mantine/core';

const DEBOUNCE_MS = 300;

interface NumberInputProps {
  name: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
}

export const NumberInput = memo(function NumberInput({ name, value, onChange }: NumberInputProps) {
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
      <Text size="xs" c="dimmed" mb={4}>{name}</Text>
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
