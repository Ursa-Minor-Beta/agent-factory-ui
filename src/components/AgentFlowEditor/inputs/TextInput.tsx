import { memo, useRef, useEffect } from 'react';
import { Box, Text, Group, ActionIcon, Modal, Textarea } from '@mantine/core';
import { IconArrowsMaximize, IconList, IconListNumbers } from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';
import { TextEditorMarkdownRaw } from '../../TextEditorMarkdown/TextEditorMarkdown';

interface TextInputProps {
  name: string;
  nodeLabel?: string;
  value: string;
  onChange: (value: string) => void;
}

export const TextInput = memo(function TextInput({ name, nodeLabel, value, onChange }: TextInputProps) {
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync native textarea when external value changes
  useEffect(() => {
    if (textareaRef.current && textareaRef.current.value !== value) {
      textareaRef.current.value = value;
    }
  }, [value]);

  // Call onChange on every keystroke, parent will debounce
  const handleChange = () => {
    if (textareaRef.current) {
      onChange(textareaRef.current.value);
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
