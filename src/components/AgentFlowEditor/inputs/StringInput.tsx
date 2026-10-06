import { memo } from 'react';
import { TextInput, Box, Text } from '@mantine/core';
import { TemplateInputWrapper } from './TemplateInputWrapper';
import type { NodeMetadata } from './templateUtils';

interface StringInputProps {
  name: string;
  nodeLabel?: string;
  value: string;
  /** @deprecated Use nodes instead */
  nodeIds?: string[];
  nodes?: NodeMetadata[];
  onChange: (value: string) => void;
}

export const StringInput = memo(function StringInput({ name, value, nodes, onChange }: StringInputProps) {
  return (
    <Box>
      <Text size="xs" c="dimmed" mb={4}>{name}</Text>
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
