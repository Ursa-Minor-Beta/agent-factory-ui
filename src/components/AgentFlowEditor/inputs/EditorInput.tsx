import { useState, useCallback, useRef, useEffect } from 'react';
import { Box, Text, Group, ActionIcon, Modal } from '@mantine/core';
import { IconArrowsMaximize } from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';
import { JsonEditor } from '../../JsonEditor';

const MIN_HEIGHT = 100;
const MAX_HEIGHT = 400;
const STORAGE_KEY_PREFIX = 'agent-editor-editor-height-';

interface EditorInputProps {
  name: string;
  nodeLabel?: string;
  value: unknown;
  onChange: (value: unknown) => void;
}

export function EditorInput({ name, nodeLabel, value, onChange }: EditorInputProps) {
  const storageKey = STORAGE_KEY_PREFIX + name;
  const [height, setHeight] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    return saved ? parseInt(saved, 10) : MIN_HEIGHT;
  });
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);
  const resizingRef = useRef(false);
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);

  useEffect(() => {
    localStorage.setItem(storageKey, String(height));
  }, [height, storageKey]);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    resizingRef.current = true;
    startYRef.current = e.clientY;
    startHeightRef.current = height;
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizingRef.current) return;
      const delta = e.clientY - startYRef.current;
      const newHeight = startHeightRef.current + delta;
      setHeight(Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, newHeight)));
    };

    const handleMouseUp = () => {
      resizingRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [height]);

  return (
    <Box>
      <Group justify="space-between" mb={4}>
        <Text size="xs" c="dimmed">{name}</Text>
        <ActionIcon size="xs" variant="subtle" onClick={openModal} title="Edit in modal">
          <IconArrowsMaximize size={12} />
        </ActionIcon>
      </Group>
      <Box style={{ position: 'relative' }}>
        <JsonEditor
          value={value}
          height={height}
          mode="javascript"
          onChange={(newValue, isValid) => {
            if (isValid) {
              onChange(newValue);
            }
          }}
        />
        {/* Resize handle */}
        <Box
          onMouseDown={handleResizeStart}
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 8,
            cursor: 'row-resize',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Box
            style={{
              width: 40,
              height: 4,
              borderRadius: 2,
              backgroundColor: 'var(--mantine-color-default-border)',
            }}
          />
        </Box>
      </Box>

      <Modal opened={modalOpened} onClose={closeModal} title={`${nodeLabel || 'Node'} / ${name}`} size="xl" fullScreen centered>
        <JsonEditor
          value={value}
          height="calc(100vh - 100px)"
          mode="javascript"
          onChange={(newValue, isValid) => {
            if (isValid) {
              onChange(newValue);
            }
          }}
        />
      </Modal>
    </Box>
  );
}
