import { useEffect, useState, useCallback, useRef } from 'react';
import { Box, Text, Group, ActionIcon } from '@mantine/core';
import { IconX } from '@tabler/icons-react';
import type { Node } from '@xyflow/react';
import type { NodeType } from '../../../api';
import { NodeSettingsForm } from './NodeSettingsForm';

const MIN_WIDTH = 200;
const MAX_WIDTH_RATIO = 0.4; // 40% of viewport
const STORAGE_KEY = 'agent-editor-panel-width';

interface PanelRightProps {
  node: Node;
  nodeTypes: NodeType[];
  nodeIds?: string[];
  onUpdate: (nodeId: string, data: Record<string, unknown>) => void;
  onClose: () => void;
}

export function PanelRight({ node, nodeTypes, nodeIds, onUpdate, onClose }: PanelRightProps) {
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
        zIndex: 5,
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
          <Text fw={600} size="sm">Node Settings</Text>
          <ActionIcon size="xs" variant="subtle" onClick={onClose}>
            <IconX size={14} />
          </ActionIcon>
        </Group>

        <NodeSettingsForm node={node} nodeTypes={nodeTypes} nodeIds={nodeIds} onUpdate={onUpdate} />
      </Box>
    </Box>
  );
}
