import { memo } from 'react';
import { Select, Box, Text } from '@mantine/core';

interface EnumInputProps {
  name: string;
  value: string;
  values: string[];
  onChange: (value: string) => void;
}

export const EnumInput = memo(function EnumInput({ name, value, values, onChange }: EnumInputProps) {
  return (
    <Box>
      <Text size="xs" c="dimmed" mb={4}>{name}</Text>
      <Select
        size="xs"
        value={value}
        data={values}
        onChange={(val) => val && onChange(val)}
        allowDeselect={false}
      />
    </Box>
  );
});
