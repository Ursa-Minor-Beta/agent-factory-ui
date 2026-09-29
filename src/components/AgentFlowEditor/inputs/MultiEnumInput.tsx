import { memo } from 'react';
import { MultiSelect, Box, Text } from '@mantine/core';

interface MultiEnumInputProps {
  name: string;
  value: string[];
  values: string[];
  onChange: (value: string[]) => void;
}

export const MultiEnumInput = memo(function MultiEnumInput({ name, value, values, onChange }: MultiEnumInputProps) {
  return (
    <Box>
      <Text size="xs" c="dimmed" mb={4}>{name}</Text>
      <MultiSelect
        size="xs"
        value={value}
        data={values}
        onChange={onChange}
        clearable
        searchable
      />
    </Box>
  );
});
