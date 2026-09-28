import { useEffect, useState, useCallback, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { Box, Text, TextInput, Stack, Badge, Divider, ScrollArea, Group, ActionIcon } from '@mantine/core';
import { IconX } from '@tabler/icons-react';
import type { Node } from '@xyflow/react';
import { StringInput, ObjectInput } from './inputs';

const MIN_WIDTH = 200;
const MAX_WIDTH_RATIO = 0.4; // 40% of viewport
const STORAGE_KEY = 'agent-editor-panel-width';

interface NodeSettingsPanelProps {
  node: Node;
  onUpdate: (nodeId: string, data: Record<string, unknown>) => void;
  onClose: () => void;
}

interface NodeFormData {
  label: string;
  [key: string]: unknown;
}

export function NodeSettingsPanel({ node, onUpdate, onClose }: NodeSettingsPanelProps) {
  const { register, reset, watch } = useForm<NodeFormData>();
  const [width, setWidth] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? parseInt(saved, 10) : 280;
  });
  const resizingRef = useRef(false);

  // Reset form when node changes
  useEffect(() => {
    reset({
      label: (node.data?.label as string) || '',
      ...(node.data as Record<string, unknown>),
    });
  }, [node.id, reset]);

  // Watch for changes and update node
  const formValues = watch();

  useEffect(() => {
    if (formValues.label !== undefined) {
      const timeoutId = setTimeout(() => {
        onUpdate(node.id, formValues);
      }, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [formValues, node.id, onUpdate]);

  // Resize handler
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

  // Persist width to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(width));
  }, [width]);

  const nodeData = node.data as Record<string, unknown>;
  const dataKeys = Object.keys(nodeData).filter((k) => k !== 'label');

  return (
    <Box style={{
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      display: 'flex',
      zIndex: 5,
    }}>
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

        <ScrollArea flex={1} p="md">
          <Stack gap="md" pb="xl">

            <TextInput
              label="Label"
              size="xs"
              {...register('label')}
            />

            <Group gap="xs">
              <Text size="xs" c="dimmed">ID:</Text>
              <Text size="xs" ff="monospace">{node.id}</Text>
            </Group>

            <Group gap="xs">
              <Text size="xs" c="dimmed" mb={4}>Type</Text>
              <Badge size="sm" variant="light">
                {node.type}
              </Badge>
            </Group>

            <Divider />

            {dataKeys.length > 0 && (
              <>
                <Divider label="Data" labelPosition="left" />
                {dataKeys.map((key) => {
                  const value = nodeData[key];
                  if (typeof value === 'string' || typeof value === 'number') {
                    return (
                      <StringInput
                        key={key}
                        name={key}
                        nodeLabel={(nodeData.label as string) || node.id}
                        value={String(value)}
                        onChange={(newValue) => onUpdate(node.id, { [key]: newValue })}
                      />
                    );
                  }
                  if (typeof value === 'object' && value !== null) {
                    return (
                      <ObjectInput
                        key={key}
                        name={key}
                        nodeLabel={(nodeData.label as string) || node.id}
                        value={value}
                        onChange={(newValue) => onUpdate(node.id, { [key]: newValue })}
                      />
                    );
                  }
                  return null;
                })}
              </>
            )}
          </Stack>
        </ScrollArea>
      </Box>
    </Box>
  );
}
