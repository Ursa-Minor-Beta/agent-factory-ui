import { useEffect, useState, useCallback, useRef, useMemo, memo } from 'react';
import { useForm, FormProvider, useFormContext } from 'react-hook-form';
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

// Memoized field input component to prevent unnecessary re-renders
const FieldInput = memo(function FieldInput({
  fieldKey,
  nodeData,
  option,
  nodeId,
  nodeLabel,
  onUpdate,
}: {
  fieldKey: string;
  nodeData: Record<string, unknown>;
  option: NodeTypeOption | undefined;
  nodeId: string;
  nodeLabel: string;
  onUpdate: (nodeId: string, data: Record<string, unknown>) => void;
}) {
  const value = nodeData[fieldKey];
  const fieldType = option?.type;
  const timeoutRef = useRef<number | undefined>(undefined);

  const handleChange = (newValue: unknown) => {
      onUpdate(nodeId, { [fieldKey]: newValue });
  }

  // Debounced onChange handler - prevents updates on every keystroke
  const handleChangeDebounced = useCallback(
    (newValue: unknown) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = window.setTimeout(() => {
        onUpdate(nodeId, { [fieldKey]: newValue });
      }, 300);
    },
    [nodeId, fieldKey, onUpdate]
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Multi-select enum type
  if (fieldType === 'enum[]' && option?.values) {
    const arrayValue = Array.isArray(value) ? value : (option?.default as string[] ?? []);
    return (
      <MultiEnumInput
        name={fieldKey}
        value={arrayValue}
        values={option.values}
        onChange={handleChange}
      />
    );
  }

  // Enum type - use select dropdown
  if (fieldType === 'enum' && option?.values) {
    return (
      <EnumInput
        name={fieldKey}
        value={String(value ?? option?.default ?? '')}
        values={option.values}
        onChange={handleChange}
      />
    );
  }

  // Number type
  if (fieldType === 'number') {
    return (
      <NumberInput
        name={fieldKey}
        value={typeof value === 'number' ? value : (option?.default as number | undefined)}
        onChange={handleChangeDebounced}
      />
    );
  }

  // Text type (multiline with modal)
  if (fieldType === 'text') {
    return (
      <TextInput
        name={fieldKey}
        nodeLabel={nodeLabel}
        value={String(value ?? option?.default ?? '')}
        onChange={handleChangeDebounced}
      />
    );
  }

  // Code type (JSON editor with modal)
  if (fieldType === 'code') {
    return (
      <EditorInput
        name={fieldKey}
        nodeLabel={nodeLabel}
        value={String(value ?? option?.default ?? '')}
        onChange={handleChangeDebounced}
      />
    );
  }

  // Object or array type
  const isObject = fieldType === 'object' || fieldType === 'array' ||
    (typeof value === 'object' && value !== null);

  if (isObject) {
    return (
      <EditorInput
        name={fieldKey}
        nodeLabel={nodeLabel}
        value={value ?? (fieldType === 'array' ? [] : {})}
        onChange={handleChangeDebounced}
      />
    );
  }

  // String type (simple single-line) or fallback
  return (
    <StringInput
      name={fieldKey}
      nodeLabel={nodeLabel}
      value={String(value ?? option?.default ?? '')}
      onChange={handleChangeDebounced}
    />
  );
});

export function NodeSettingsPanel({ node, nodeTypes, onUpdate, onClose }: NodeSettingsPanelProps) {
  const { register, reset, watch } = useForm<NodeFormData>();
  const [width, setWidth] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? parseInt(saved, 10) : 280;
  });
  const resizingRef = useRef(false);
  const updateTimeoutRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    reset({
      label: (node.data?.label as string) || '',
      ...(node.data as Record<string, unknown>),
    });
  }, [node.id, reset]);

  // Watch only the label field with debouncing
  const labelValue = watch('label');
  const prevLabelRef = useRef(labelValue);

  useEffect(() => {
    // Only trigger update if label actually changed
    if (labelValue !== prevLabelRef.current && labelValue !== undefined) {
      prevLabelRef.current = labelValue;

      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }

      updateTimeoutRef.current = window.setTimeout(() => {
        onUpdate(node.id, { label: labelValue });
      }, 300);
    }

    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [labelValue, node.id, onUpdate]);

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

  const nodeData = node.data as Record<string, unknown>;

  const nodeLabel = useMemo(() => (nodeData.label as string) || node.id, [nodeData.label, node.id]);

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

        <ScrollArea flex={1}>
          <Stack gap="md" p="lg">

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

            {dataKeys.map((key) => (
              <FieldInput
                key={key}
                fieldKey={key}
                nodeData={nodeData}
                option={optionsMap[key]}
                nodeId={node.id}
                nodeLabel={nodeLabel}
                onUpdate={onUpdate}
              />
            ))}
          </Stack>
        </ScrollArea>
      </Box>
    </Box>
  );
}
