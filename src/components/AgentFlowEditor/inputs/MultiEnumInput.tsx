import { memo } from 'react';
import { MultiSelect, Box, Text, Tooltip, Group, ThemeIcon } from '@mantine/core';
import { IconQuestionMark } from '@tabler/icons-react';

interface MultiEnumInputProps {
  name: string;
  description?: string;
  value: string[];
  values: string[];
  onChange: (value: string[]) => void;
}

export const MultiEnumInput = memo(function MultiEnumInput({ name, description, value, values, onChange }: MultiEnumInputProps) {
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
