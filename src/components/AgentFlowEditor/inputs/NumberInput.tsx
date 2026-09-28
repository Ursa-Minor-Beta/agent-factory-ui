import { NumberInput as MantineNumberInput, Box, Text } from '@mantine/core';

interface NumberInputProps {
  name: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
}

export function NumberInput({ name, value, onChange }: NumberInputProps) {
  return (
    <Box>
      <Text size="xs" c="dimmed" mb={4}>{name}</Text>
      <MantineNumberInput
        size="xs"
        value={value}
        onChange={(val) => onChange(typeof val === 'number' ? val : undefined)}
        allowDecimal
      />
    </Box>
  );
}
