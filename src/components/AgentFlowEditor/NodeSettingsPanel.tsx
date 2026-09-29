import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { Box, Text, TextInput as MantineTextInput, Stack, Badge, Divider, ScrollArea, Group, ActionIcon } from '@mantine/core';
import { IconX } from '@tabler/icons-react';
import type { Node } from '@xyflow/react';
import type { NodeType, NodeTypeOption } from '../../api';
import { StringInput, TextInput, EditorInput, NumberInput, EnumInput, MultiEnumInput } from './inputs';

const MIN_WIDTH = 200;
const MAX_WIDTH_RATIO = 0.4; // 40% of viewport
const STORAGE_KEY = 'agent-editor-panel-width';

interface NodeSettingsPanelProps {
  node: Node;
  nodeTypes: NodeType[];
  onUpdate: (nodeId: string, data: Record<string, unknown>) => void;
  onClose: () => void;
}

interface NodeFormData {
  label: string;
  [key: string]: unknown;
}

function renderFieldInput(
  key: string,
  nodeData: Record<string, unknown>,
  optionsMap: Record<string, NodeTypeOption>,
  nodeId: string,
  onUpdate: (nodeId: string, data: Record<string, unknown>) => void
) {
  const value = nodeData[key];
  const option = optionsMap[key];
  const fieldType = option?.type;

  // Multi-select enum type
  if (fieldType === 'enum[]' && option?.values) {
    const arrayValue = Array.isArray(value) ? value : (option?.default as string[] ?? []);
    return (
      <MultiEnumInput
        key={key}
        name={key}
        value={arrayValue}
        values={option.values}
        onChange={(newValue) => onUpdate(nodeId, { [key]: newValue })}
      />
    );
  }

  // Enum type - use select dropdown
  if (fieldType === 'enum' && option?.values) {
    return (
      <EnumInput
        key={key}
        name={key}
        value={String(value ?? option?.default ?? '')}
        values={option.values}
        onChange={(newValue) => onUpdate(nodeId, { [key]: newValue })}
      />
    );
  }

  // Number type
  if (fieldType === 'number') {
    return (
      <NumberInput
        key={key}
        name={key}
        value={typeof value === 'number' ? value : (option?.default as number | undefined)}
        onChange={(newValue) => onUpdate(nodeId, { [key]: newValue })}
      />
    );
  }

  // Text type (multiline with modal)
  if (fieldType === 'text') {
    return (
      <TextInput
        key={key}
        name={key}
        nodeLabel={(nodeData.label as string) || nodeId}
        value={String(value ?? option?.default ?? '')}
        onChange={(newValue) => onUpdate(nodeId, { [key]: newValue })}
      />
    );
  }

  // Code type (JSON editor with modal)
  if (fieldType === 'code') {
    return (
      <EditorInput
        key={key}
        name={key}
        nodeLabel={(nodeData.label as string) || nodeId}
        value={String(value ?? option?.default ?? '')}
        onChange={(newValue) => onUpdate(nodeId, { [key]: newValue })}
      />
    );
  }

  // Object or array type
  const isObject = fieldType === 'object' || fieldType === 'array' ||
    (typeof value === 'object' && value !== null);

  if (isObject) {
    return (
      <EditorInput
        key={key}
        name={key}
        nodeLabel={(nodeData.label as string) || nodeId}
        value={value ?? (fieldType === 'array' ? [] : {})}
        onChange={(newValue) => onUpdate(nodeId, { [key]: newValue })}
      />
    );
  }

  // String type (simple single-line) or fallback
  return (
    <StringInput
      key={key}
      name={key}
      nodeLabel={(nodeData.label as string) || nodeId}
      value={String(value ?? option?.default ?? '')}
      onChange={(newValue) => onUpdate(nodeId, { [key]: newValue })}
    />
  );
}

export function NodeSettingsPanel({ node, nodeTypes, onUpdate, onClose }: NodeSettingsPanelProps) {
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

  // Get options for this node type as a map by name
  const optionsMap = useMemo(() => {
    const nodeType = nodeTypes.find((nt) => nt.type === node.type);
    const map: Record<string, NodeTypeOption> = {};
    if (nodeType?.options) {
      for (const option of nodeType.options) {
        map[option.name] = option;
      }
    }
    return map;
  }, [nodeTypes, node.type]);

  // Merge option names with existing data keys (options first, then any extra data keys)
  const dataKeys = useMemo(() => {
    const optionNames = Object.keys(optionsMap);
    const existingKeys = Object.keys(nodeData).filter((k) => k !== 'label');
    const allKeys = new Set([...optionNames, ...existingKeys]);
    return Array.from(allKeys);
  }, [optionsMap, nodeData]);

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

            <MantineTextInput
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

            {dataKeys.map((key) => renderFieldInput(key, nodeData, optionsMap, node.id, onUpdate))}
          </Stack>
        </ScrollArea>
      </Box>
    </Box>
  );
}
