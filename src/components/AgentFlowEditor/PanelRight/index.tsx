import { useEffect, useState, useCallback, useRef, memo, lazy, Suspense } from 'react';
import { Box, Text, Group, ActionIcon, Tooltip, Modal, Button, Loader, Center } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconTrash, IconX } from '@tabler/icons-react';
import type { Node } from '@xyflow/react';
import type { NodeType } from '../../../api';

const NodeSettingsForm = lazy(() =>
  import('./NodeSettingsForm').then((m) => ({ default: m.NodeSettingsForm }))
);

const MIN_WIDTH = 200;
const MAX_WIDTH_RATIO = 0.7; // 40% of viewport
const STORAGE_KEY = 'agent-editor-panel-width';

interface PanelRightProps {
  node: Node;
  nodes: Node[];
  nodeTypes: NodeType[];
  isNodesDragging: boolean;
  onUpdate: (nodeId: string, data: Record<string, unknown>) => void;
  onReplace: (nodeId: string, data: Record<string, unknown>) => void;
  onRemove: (nodeId: string) => void;
  onClose: () => void;
}

export const PanelRight = memo( function({ node, nodes, nodeTypes, onUpdate, onReplace, onRemove, onClose }: PanelRightProps) {
  const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);
  const [width, setWidth] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? parseInt(saved, 10) : 280;
  });
  const resizingRef = useRef(false);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    resizingRef.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizingRef.current) return;
      const maxWidth = window.innerWidth * MAX_WIDTH_RATIO;
      const newWidth = window.innerWidth - e.clientX;
      setWidth(Math.max(MIN_WIDTH, Math.min(maxWidth, newWidth)));
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

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(width));
  }, [width]);

  return (
    <Box
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        zIndex: 100,
      }}
    >
      {/* Resize handle */}
      <Box
        onMouseDown={handleResizeStart}
        style={{
          width: 8,
          cursor: 'col-resize',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Box
          style={{
            width: 4,
            height: 40,
            borderRadius: 2,
            backgroundColor: 'var(--mantine-color-default-border)',
          }}
        />
      </Box>

      {/* Panel content */}
      <Box
        style={{
          width,
          height: '100%',
          background: 'var(--mantine-color-body)',
          borderLeft: '1px solid var(--mantine-color-default-border)',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
        }}
      >
        <Group p="md" justify="space-between" style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}>

          <Group gap="xs">
            <Text fw={600} size="sm">Node Settings. </Text>
            <Text size="xs" c="dimmed" >Type: {node.type?.toUpperCase()},</Text>
            <Text size="xs" c="dimmed" >Index: {nodes?.findIndex( n => n.id === node.id )}</Text>
          </Group>

          <Group gap="lg">
            <Tooltip label="Remove node">
              <ActionIcon size="xs" variant="subtle" color="red" onClick={openDeleteModal}>
                <IconTrash size={14} />
              </ActionIcon>
            </Tooltip>
            <ActionIcon size="xs" variant="subtle" onClick={onClose}>
              <IconX size={14} />
            </ActionIcon>
          </Group>
        </Group>

        <Suspense fallback={<Center h={200}><Loader size="sm" /></Center>}>
          <NodeSettingsForm
            node={node}
            nodes={nodes}
            nodeTypes={nodeTypes}
            onUpdate={onUpdate}
            onReplace={onReplace}
          />
        </Suspense>
      </Box>

      <Modal opened={deleteModalOpened} onClose={closeDeleteModal} title="Remove Node" centered size="sm">
        <Text size="sm" mb="lg">
          Are you sure you want to remove <strong>{node.id}</strong>? This action cannot be undone.
        </Text>
        <Group justify="flex-end">
          <Button variant="default" onClick={closeDeleteModal}>Cancel</Button>
          <Button color="red" onClick={() => { onRemove(node.id); closeDeleteModal(); }}>Remove</Button>
        </Group>
      </Modal>
    </Box>
  );
},
(prevProps, { isNodesDragging, ...rest }) => {  
  // Skip re-render while actively dragging nodes (performance optimization)
  if (isNodesDragging) return true
  // When not dragging, do shallow comparison of relevant props
  return Object.entries(rest).every( ([restKey, restVal]) => (
      restVal === prevProps[restKey as keyof typeof prevProps]
    ))
  }
);
