import { memo, useRef, useEffect } from 'react';
import { TextInput as MantineTextInput, Box, Text } from '@mantine/core';

interface StringInputProps {
  name: string;
  nodeLabel?: string;
  value: string;
  onChange: (value: string) => void;
}

export const StringInput = memo(function StringInput({ name, value, onChange }: StringInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync native input when external value changes (e.g., node switch)
  useEffect(() => {
    if (inputRef.current && inputRef.current.value !== value) {
      inputRef.current.value = value;
    }
  }, [value]);

  // Call onChange on every keystroke, parent will debounce
  const handleChange = () => {
    if (inputRef.current) {
      onChange(inputRef.current.value);
    }
  };

  return (
    <Box>
      <Text size="xs" c="dimmed" mb={4}>{name}</Text>
      <MantineTextInput
        ref={inputRef}
        size="xs"
        defaultValue={value}
        onChange={handleChange}
      />
    </Box>
  );
});
