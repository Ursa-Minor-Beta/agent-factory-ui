import { memo } from 'react';
import { TextInput, Box, Text, Tooltip, Group, ThemeIcon } from '@mantine/core';
import { IconQuestionMark } from '@tabler/icons-react';
import { TemplateInputWrapper } from './TemplateInputWrapper';
import type { NodeMetadata } from './templateUtils';

interface StringInputProps {
  name: string;
  description?: string;
  nodeLabel?: string;
  value: string;
  /** @deprecated Use nodes instead */
  nodeIds?: string[];
  nodes?: NodeMetadata[];
  onChange: (value: string) => void;
}

export const StringInput = memo(function StringInput({ name, description, value, nodes, onChange }: StringInputProps) {
  return (
    <Box>
      <Group gap="md" mb="xs" justify="space-between">
        <Text size="xs" c="dimmed">{name}</Text>
        {description && (
          <Tooltip label={description} multiline maw={300}>
            <ThemeIcon size={14} radius="xl" color="gray" variant="light">
              <IconQuestionMark size={10} />
            </ThemeIcon>
          </Tooltip>
        )}
      </Group>
      <TemplateInputWrapper
        value={value}
        nodes={nodes}
        onChange={onChange}
        highlightStyle={{
          padding: '0 10px',
          display: 'flex',
          alignItems: 'center',
          whiteSpace: 'pre',
        }}
      >
        {({ inputRef, defaultValue, handleChange, handleBlur, handleClick, handleKeyDown }) => (
          <TextInput
            ref={inputRef as React.RefObject<HTMLInputElement>}
            size="xs"
            defaultValue={defaultValue}
            onChange={handleChange}
            onBlur={handleBlur}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            styles={{
              input: {
                backgroundColor: 'transparent',
              },
            }}
          />
        )}
      </TemplateInputWrapper>
    </Box>
  );
});
