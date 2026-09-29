import { useEffect, useRef, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { TextInput as MantineTextInput, Stack, Badge, Divider, ScrollArea, Group, Text } from '@mantine/core';
import type { Node } from '@xyflow/react';
import type { NodeType, NodeTypeOption } from '../../../api';
import { FieldInput } from './FieldInput';

interface NodeSettingsFormProps {
  node: Node;
  nodeTypes: NodeType[];
  onUpdate: (nodeId: string, data: Record<string, unknown>) => void;
}

interface NodeFormData {
  label: string;
  [key: string]: unknown;
}

export function NodeSettingsForm({ node, nodeTypes, onUpdate }: NodeSettingsFormProps) {
  const { register, reset, watch } = useForm<NodeFormData>();
  const updateTimeoutRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    reset({
      label: (node.data?.label as string) || '',
      ...(node.data as Record<string, unknown>),
    });
  }, [node.id, reset, node.data]);

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
  );
}
