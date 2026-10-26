import { memo } from 'react';
import { Switch, Box, Text, Tooltip, Group, ThemeIcon } from '@mantine/core';
import { IconQuestionMark } from '@tabler/icons-react';

interface BooleanInputProps {
  name: string;
  description?: string;
  value: boolean;
  onChange: (value: boolean) => void;
}

export const BooleanInput = memo(function BooleanInput({ name, description, value, onChange }: BooleanInputProps) {
  return (
    <Box w="100%">
      <Group gap="xs" w="100%" justify="space-between">
        <Text size="xs" c="dimmed">{name}</Text>
        {description && (
          <Tooltip label={description} multiline maw={300}>
            <ThemeIcon size={14} radius="xl" color="gray" variant="light">
              <IconQuestionMark size={10} />
            </ThemeIcon>
          </Tooltip>
        )}
      </Group>
      <Switch
        size="xs"
        checked={value}
        onChange={(e) => onChange(e.currentTarget.checked)}
      />
    </Box>
  );
});
