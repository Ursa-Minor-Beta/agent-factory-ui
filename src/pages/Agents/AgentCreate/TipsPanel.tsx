import { useRef, useEffect } from 'react';
import { Paper, Group, Text, ActionIcon, Stack, Code } from '@mantine/core';
import { IconGripHorizontal, IconX } from '@tabler/icons-react';
import { TIPS_POSITION_KEY, clampToViewport, type TipsPosition } from './agentCreate.types';

interface TipsPanelProps {
  position: TipsPosition;
  onPositionChange: (pos: TipsPosition) => void;
  onClose: () => void;
}

export function TipsPanel({ position, onPositionChange, onClose }: TipsPanelProps) {
  const dragRef = useRef<{ startX: number; startY: number; isDragging: boolean }>({
    startX: 0,
    startY: 0,
    isDragging: false,
  });

  // Clamp position to viewport on mount
  useEffect(() => {
    onPositionChange(clampToViewport(position));
  }, []);

  // Save position to localStorage when it changes
  useEffect(() => {
    localStorage.setItem(TIPS_POSITION_KEY, JSON.stringify(position));
  }, [position]);

  return (
    <Paper
      shadow="lg"
      withBorder
      p={0}
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        zIndex: 1000,
        width: 320,
        backgroundColor: 'var(--mantine-color-default)',
      }}
      onMouseMove={(e) => {
        if (!dragRef.current.isDragging) return;
        const dx = e.clientX - dragRef.current.startX;
        const dy = e.clientY - dragRef.current.startY;
        onPositionChange({
          x: Math.max(0, position.x + dx),
          y: Math.max(0, position.y + dy),
        });
        dragRef.current.startX = e.clientX;
        dragRef.current.startY = e.clientY;
      }}
      onMouseUp={() => {
        dragRef.current.isDragging = false;
      }}
      onMouseLeave={() => {
        dragRef.current.isDragging = false;
      }}
    >
      <Group
        justify="space-between"
        px="sm"
        py="xs"
        style={{
          cursor: 'grab',
          backgroundColor: 'var(--mantine-color-default-hover)',
          borderBottom: '1px solid var(--mantine-color-default-border)',
        }}
        onMouseDown={(e) => {
          dragRef.current.isDragging = true;
          dragRef.current.startX = e.clientX;
          dragRef.current.startY = e.clientY;
        }}
      >
        <Group gap="xs">
          <IconGripHorizontal size={14} style={{ color: 'var(--mantine-color-dimmed)' }} />
          <Text size="sm" fw={600}>
            Tips
          </Text>
        </Group>
        <ActionIcon variant="subtle" size="xs" onClick={onClose}>
          <IconX size={14} />
        </ActionIcon>
      </Group>
      <Stack gap="xs" p="sm">
        <Text size="xs">
          Use <Code fz="xs">{'{{variable}}'}</Code> to reference variables.
        </Text>
        <Text size="xs">
          Use <Code fz="xs">{'{{secret:NAME}}'}</Code> for secrets.
        </Text>
        <Text size="xs">
          Use <Code fz="xs">{'{{node-id.output}}'}</Code> to reference outputs from other nodes.
        </Text>
      </Stack>
    </Paper>
  );
}
