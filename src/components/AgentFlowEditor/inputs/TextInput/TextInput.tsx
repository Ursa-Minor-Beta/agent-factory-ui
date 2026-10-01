import { memo, useRef, useCallback } from 'react';
import { Box, Text, Group, ActionIcon, Modal, Textarea } from '@mantine/core';
import { IconArrowsMaximize, IconList, IconListNumbers } from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';
import { TemplateInputWrapper } from '../TemplateInputWrapper';
import { TemplateTextEditorFull } from './TemplateTextEditorFull';

interface TextInputProps {
  name: string;
  nodeLabel?: string;
  value: string;
  nodeIds?: string[];
  onChange: (value: string) => void;
}

export const TextInput = memo(function TextInput({ name, nodeLabel, value, nodeIds, onChange }: TextInputProps) {
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);
  const highlightRef = useRef<HTMLDivElement>(null);

  // Sync scroll between textarea and highlight layer
  const handleScroll = useCallback((e: React.UIEvent<HTMLTextAreaElement>) => {
    if (highlightRef.current) {
      highlightRef.current.scrollTop = e.currentTarget.scrollTop;
      highlightRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  }, []);

  return (
    <Box>
      <Group justify="space-between" mb={4}>
        <Text size="xs" c="dimmed">{name}</Text>
        <ActionIcon size="xs" variant="subtle" onClick={openModal} title="Edit in modal">
          <IconArrowsMaximize size={12} />
        </ActionIcon>
      </Group>

      <TemplateInputWrapper
        value={value}
        nodeIds={nodeIds}
        onChange={onChange}
        highlightRef={highlightRef}
        highlightStyle={{
          padding: '4px 12px',
          lineHeight: 1.55,
          whiteSpace: 'pre-wrap',
          wordWrap: 'break-word',
          display: 'block',
          alignItems: undefined,
        }}
      >
        {({ inputRef, defaultValue, handleChange, handleBlur, handleClick, handleKeyDown }) => (
          <Textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            size="xs"
            defaultValue={defaultValue}
            onChange={handleChange}
            onBlur={handleBlur}
            onClick={handleClick}
            onScroll={handleScroll}
            onKeyDown={handleKeyDown}
            minRows={3}
            maxRows={8}
            autosize
            styles={{
              input: {
                backgroundColor: 'transparent',
              },
            }}
          />
        )}
      </TemplateInputWrapper>

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
        <TemplateTextEditorFull
          formFieldName={name}
          getValues={() => value}
          setValue={(_, newValue) => onChange(newValue)}
          nodeIds={nodeIds}
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
