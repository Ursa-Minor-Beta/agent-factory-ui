import { memo } from 'react';
import { Select, Box, Text, Tooltip, Group, ThemeIcon } from '@mantine/core';
import { IconQuestionMark } from '@tabler/icons-react';

interface EnumInputProps {
  name: string;
  description?: string;
  value: string;
  values: string[];
  onChange: (value: string) => void;
}

export const EnumInput = memo(function EnumInput({ name, description, value, values, onChange }: EnumInputProps) {
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
