import { memo, useRef } from 'react';
import { TextInput, Box, Text, Tooltip, Group, ThemeIcon, Menu, ActionIcon, ScrollArea } from '@mantine/core';
import { IconQuestionMark, IconChevronDown, IconCheck } from '@tabler/icons-react';
import { TemplateInputWrapper } from './TemplateInputWrapper';
import type { NodeMetadata, TemplateRefs } from './templateUtils';

interface EnumInputProps {
  name: string;
  description?: string;
  value: string;
  values: string[];
  nodes?: NodeMetadata[];
  refs?: TemplateRefs;
  onChange: (value: string) => void;
}

export const EnumInput = memo(function EnumInput({ name, description, value, values, nodes, refs, onChange }: EnumInputProps) {
  const highlightRef = useRef<HTMLDivElement>(null);

  // Options picker in the right section; typing "{{" opens template suggestions
  const optionsMenu = (
    <Menu position="bottom-end" withinPortal>
      <Menu.Target>
        <ActionIcon size="sm" variant="subtle" color="gray">
          <IconChevronDown size={14} />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        <ScrollArea.Autosize mah={240}>
          {values.map((option) => (
            <Menu.Item
              key={option}
              onClick={() => onChange(option)}
              rightSection={option === value ? <IconCheck size={12} /> : null}
            >
              <Text size="xs">{option}</Text>
            </Menu.Item>
          ))}
        </ScrollArea.Autosize>
      </Menu.Dropdown>
    </Menu>
  );

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
      <TemplateInputWrapper
        value={value}
        nodes={nodes}
        refs={refs}
        onChange={onChange}
        highlightRef={highlightRef}
        highlightStyle={{
          padding: '0 10px',
          right: 30,
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
            onScroll={(e) => {
              if (highlightRef.current) highlightRef.current.scrollLeft = e.currentTarget.scrollLeft;
            }}
            rightSection={optionsMenu}
            rightSectionPointerEvents="all"
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
