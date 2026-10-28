import { memo, useRef, useCallback, lazy, Suspense } from 'react';
import { Box, Text, Group, ActionIcon, Modal, Textarea, Tooltip, ThemeIcon, Loader, Center } from '@mantine/core';
import { IconArrowsMaximize, IconList, IconListNumbers, IconQuestionMark } from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';
import { TemplateInputWrapper } from '../TemplateInputWrapper';
import type { NodeMetadata } from '../templateUtils';
import { useScrollMemory } from '../scrollMemory';

const TemplateTextEditorFull = lazy(() =>
  import('./TemplateTextEditorFull').then((m) => ({ default: m.TemplateTextEditorFull }))
);

interface TextInputProps {
  name: string;
  description?: string;
  nodeLabel?: string;
  /** Enables scroll position memory per agent/node/input */
  nodeId?: string;
  value: string;
  nodes?: NodeMetadata[];
  onChange: (value: string) => void;
}

export const TextInput = memo(function TextInput({ name, description, nodeLabel, nodeId: scrollNodeId, value, nodes, onChange }: TextInputProps) {
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);
  const highlightRef = useRef<HTMLDivElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const saveScroll = useScrollMemory(textAreaRef, scrollNodeId, name, [highlightRef]);

  // Sync scroll between textarea and highlight layer
  const handleScroll = useCallback((e: React.UIEvent<HTMLTextAreaElement>) => {
    if (highlightRef.current) {
      highlightRef.current.scrollTop = e.currentTarget.scrollTop;
      highlightRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
    saveScroll(e.currentTarget.scrollTop);
  }, [saveScroll]);

  return (
    <Box>
      <Group justify="space-between" mb={4}>
          <Text size="xs" c="dimmed">{name}</Text>
        <Group gap={4} >
          {description && (
            <Tooltip label={description} multiline maw={300}>
              <ThemeIcon size={14} radius="xl" color="gray" variant="light">
                <IconQuestionMark size={10} />
              </ThemeIcon>
            </Tooltip>
          )}
          <ActionIcon size="xs" variant="subtle" onClick={openModal} title="Edit in modal">
            <IconArrowsMaximize size={12} />
          </ActionIcon>
        </Group>
      </Group>

      <TemplateInputWrapper
        value={value}
        nodes={nodes}
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
            ref={(el) => {
              (inputRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = el;
              textAreaRef.current = el;
            }}
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
        
      {modalOpened && <Box onKeyDown={(e) => e.stopPropagation()} style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
        <Suspense fallback={<Center h="100%"><Loader /></Center>}>
          <TemplateTextEditorFull
            formFieldName={name}
            getValues={() => value}
            setValue={(_, newValue) => onChange(newValue)}
            nodes={nodes}
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
        </Suspense>
        </Box>}
      </Modal>
    </Box>
  );
});
