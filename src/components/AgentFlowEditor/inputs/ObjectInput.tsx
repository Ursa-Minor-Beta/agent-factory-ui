import { useState, useCallback, useRef, useEffect, memo } from 'react';
import { Box, Text, Group, ActionIcon, Modal } from '@mantine/core';
import { IconArrowsMaximize } from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';
import { JsonEditor } from '../../JsonEditor';

const MIN_HEIGHT = 100;
const MAX_HEIGHT = 400;
const STORAGE_KEY_PREFIX = 'agent-editor-object-height-';
const DEBOUNCE_MS = 300;

interface ObjectInputProps {
  name: string;
  nodeLabel?: string;
  value: unknown;
  onChange: (value: unknown) => void;
}

export const ObjectInput = memo(function ObjectInput({ name, nodeLabel, value, onChange }: ObjectInputProps) {
  const storageKey = STORAGE_KEY_PREFIX + name;
  const [height, setHeight] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    return saved ? parseInt(saved, 10) : MIN_HEIGHT;
  });
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);
  const resizingRef = useRef(false);
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);
  const onChangeRef = useRef(onChange);
  const debounceRef = useRef<number | null>(null);
  const pendingValueRef = useRef<unknown>(null);

  onChangeRef.current = onChange;

  useEffect(() => {
    localStorage.setItem(storageKey, String(height));
  }, [height, storageKey]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current !== null) {
        clearTimeout(debounceRef.current);
        // Emit pending value on unmount
        if (pendingValueRef.current !== null) {
          onChangeRef.current(pendingValueRef.current);
        }
      }
    };
  }, []);

  const handleEditorChange = useCallback((newValue: unknown, isValid: boolean) => {
    if (!isValid) return;

    pendingValueRef.current = newValue;

    if (debounceRef.current !== null) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = window.setTimeout(() => {
      if (pendingValueRef.current !== null) {
        onChangeRef.current(pendingValueRef.current);
        pendingValueRef.current = null;
      }
    }, DEBOUNCE_MS);
  }, []);

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
          onChange={handleEditorChange}
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
          onChange={handleEditorChange}
        />
      </Modal>
    </Box>
  );
});
