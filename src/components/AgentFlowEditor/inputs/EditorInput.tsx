import { useState, useCallback, useRef, useEffect, memo } from 'react';
import { Box, Text, Group, ActionIcon, Modal } from '@mantine/core';
import { IconArrowsMaximize } from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';
import { JsonEditor } from '../../JsonEditor';

const MIN_HEIGHT = 100;
const MAX_HEIGHT = 600;
const STORAGE_KEY_PREFIX = 'agent-editor-editor-height-';
const DEBOUNCE_MS = 300;

interface EditorInputProps {
  nodeId: string;
  name: string;
  nodeLabel?: string;
  value: unknown;
  mode: "javascript" | "json";
  onChange: (value: unknown) => void;
}

export const EditorInput = memo(function EditorInput({ nodeId, name, nodeLabel, value, mode, onChange }: EditorInputProps) {
  const storageKey = STORAGE_KEY_PREFIX + name;
  const [height, setHeight] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    return saved ? parseInt(saved, 10) : MIN_HEIGHT;
  });
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);
  const [editorKey, setEditorKey] = useState(0);
  const resizingRef = useRef(false);
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);
  const heightRef = useRef(height);
  const onChangeRef = useRef(onChange);
  const debounceRef = useRef<number | null>(null);
  const pendingValueRef = useRef<unknown>(null);

  onChangeRef.current = onChange;

  // Flush pending changes when modal closes and remount inline editor
  const handleCloseModal = useCallback(() => {
    if (debounceRef.current !== null) {
      clearTimeout(debounceRef.current);
      if (pendingValueRef.current !== null) {
        onChangeRef.current(pendingValueRef.current);
        pendingValueRef.current = null;
      }
    }
    closeModal();
    // Force inline editor to remount after parent updates
    setTimeout(() => {
      setEditorKey((prev) => prev + 1);
    }, 0);
  }, [closeModal]);

  useEffect(() => {
    setEditorKey((p) => p + 1);
  }, [nodeId]);

  // Keep heightRef in sync with height state
  useEffect(() => {
    heightRef.current = height;
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

  const handleEditorChange = useCallback((newValue: unknown, valid: boolean) => {
    if (!valid) return;

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

  // No dependencies - capture current height via heightRef
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    resizingRef.current = true;
    startYRef.current = e.clientY;
    startHeightRef.current = heightRef.current;
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
  }, []);

  return (
    <Box>
      <Group justify="space-between" mb={4}>
        <Group gap={6}>
          <Text size="xs" c="dimmed">{name}</Text>
        </Group>
        <ActionIcon size="xs" variant="subtle" onClick={openModal} title="Edit in modal">
          <IconArrowsMaximize size={12} />
        </ActionIcon>
      </Group>
      <Box style={{ position: 'relative' }}>
        <JsonEditor
          key={editorKey}
          value={value}
          height={height}
          mode={mode}
          showLineNumbers={false}
          fontSize={12}
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

      <Modal 
        opened={modalOpened} 
        onClose={handleCloseModal} 
        title={`${nodeLabel || 'Node'} / ${name}`} size="xl" 
        fullScreen 
        centered
        >
        <Box onKeyDown={(e) => e.stopPropagation()}>
          <JsonEditor
            value={value}
            height="calc(100vh - 100px)"
            mode={mode}
            onChange={handleEditorChange}
          />
        </Box>
      </Modal>
    </Box>
  );
});
