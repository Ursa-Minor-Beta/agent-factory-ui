import { TextInput as MantineTextInput, Box, Text } from '@mantine/core';

interface StringInputProps {
  name: string;
  nodeLabel?: string;
  value: string;
  onChange: (value: string) => void;
}

export function StringInput({ name, value, onChange }: StringInputProps) {
  return (
    <Box>
      <Text size="xs" c="dimmed" mb={4}>{name}</Text>
      <MantineTextInput
        size="xs"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </Box>
  );
}
