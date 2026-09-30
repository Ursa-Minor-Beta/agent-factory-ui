import { memo, useRef, useEffect } from 'react';
import { Box, Text, Group, ActionIcon, Modal, Textarea } from '@mantine/core';
import { IconArrowsMaximize, IconList, IconListNumbers } from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';
import { TextEditorMarkdownRaw } from '../../TextEditorMarkdown/TextEditorMarkdown';

const DEBOUNCE_MS = 300;

interface TextInputProps {
  name: string;
  nodeLabel?: string;
  value: string;
  onChange: (value: string) => void;
}

export const TextInput = memo(function TextInput({ name, nodeLabel, value, onChange }: TextInputProps) {
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const onChangeRef = useRef(onChange);
  const debounceRef = useRef<number | null>(null);
  const lastEmittedRef = useRef<string | null>(null);

  onChangeRef.current = onChange;

  // Sync only on external value changes, not our own emitted changes
  useEffect(() => {
    if (lastEmittedRef.current === value) {
      return;
    }
    if (textareaRef.current && textareaRef.current.value !== value) {
      textareaRef.current.value = value;
    }
  }, [value]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current !== null) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // Debounced onChange
  const handleChange = () => {
    if (debounceRef.current !== null) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = window.setTimeout(() => {
      if (textareaRef.current) {
        lastEmittedRef.current = textareaRef.current.value;
        onChangeRef.current(textareaRef.current.value);
      }
    }, DEBOUNCE_MS);
  };

  // Emit final value immediately on blur
  const handleBlur = () => {
    if (debounceRef.current !== null) {
      clearTimeout(debounceRef.current);
    }
    if (textareaRef.current) {
      lastEmittedRef.current = textareaRef.current.value;
      onChangeRef.current(textareaRef.current.value);
    }
  };

  return (
    <Box>
      <Group justify="space-between" mb={4}>
        <Text size="xs" c="dimmed">{name}</Text>
        <ActionIcon size="xs" variant="subtle" onClick={openModal} title="Edit in modal">
          <IconArrowsMaximize size={12} />
        </ActionIcon>
      </Group>
      <Textarea
        ref={textareaRef}
        size="xs"
        defaultValue={value}
        onChange={handleChange}
        onBlur={handleBlur}
        minRows={3}
        maxRows={8}
        autosize
      />

      <Modal
        opened={modalOpened}
        onClose={closeModal}
        title={`${nodeLabel || 'Node'} / ${name}`}
        size="xl"
        fullScreen
        centered
        styles={{
          content: { height: '100vh', display: 'flex', flexDirection: 'column' },
          body: { 
            flex: 1, 
            padding: 0, 
            display: 'flex', 
            flexDirection: 'column', 
            overflow: 'hidden' 
          },
        }}
      >
        <TextEditorMarkdownRaw
          formFieldName={name}
          getValues={() => value}
          setValue={(_, newValue) => onChange(newValue)}
          toolbarFormatBtns={[
            {
              title: 'H1',
              tip: 'Heading H1',
              onClick: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
            },
            {
              title: 'B',
              tip: 'Bold',
              onClick: (editor) => editor.chain().focus().toggleBold().run(),
            },
            {
              Icon: IconList,
              tip: 'Unordered list',
              onClick: (editor) => editor.chain().focus().toggleBulletList().run(),
            },
            {
              Icon: IconListNumbers,
              tip: 'Ordered list',
              onClick: (editor) => editor.chain().focus().toggleOrderedList().run(),
            },
          ]}
        />
      </Modal>
    </Box>
  );
});
