import { useEffect, useRef, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { TextInput as MantineTextInput, Stack, Badge, Divider, ScrollArea, Group, Text, ActionIcon } from '@mantine/core';
import { IconPencil } from '@tabler/icons-react';
import type { Node } from '@xyflow/react';
import type { NodeType, NodeTypeOption } from '../../../api';
import type { NodeMetadata } from '../inputs/templateUtils';
import { FieldInput } from './FieldInput';

interface NodeSettingsFormProps {
  node: Node;
  nodes: Node[];
  nodeTypes: NodeType[];
  nodeIds?: string[];
  onUpdate: (nodeId: string, data: Record<string, unknown>) => void;
}

interface NodeFormData {
  label: string;
  [key: string]: unknown;
}

const DEBOUNCE_MS = 300;

export function NodeSettingsForm({ node, nodes, nodeTypes, nodeIds, onUpdate }: NodeSettingsFormProps) {
  const { register, reset, watch } = useForm<NodeFormData>();
  const updateTimeoutRef = useRef<number | undefined>(undefined);

  // ID editing state
  const idInputRef = useRef<HTMLInputElement>(null);
  const idDebounceRef = useRef<number | null>(null);
  const lastEmittedIdRef = useRef<string | null>(null);
  const onUpdateRef = useRef(onUpdate);
  const [idEditEnabled, setIdEditEnabled] = useState(false);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    reset({
      label: (node.data?.label as string) || '',
      ...(node.data as Record<string, unknown>),
    });
  }, [node.id, reset, node.data]);

  // Sync ID input when node changes (e.g., selecting different node)
  useEffect(() => {
    if (lastEmittedIdRef.current === node.id) {
      return;
    }
    if (idInputRef.current && idInputRef.current.value !== node.id) {
      idInputRef.current.value = node.id;
    }
  }, [node.id]);

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
      }, DEBOUNCE_MS);
    }

    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [labelValue, node.id, onUpdate]);

  // ID change handlers
  const handleIdChange = () => {
    if (idDebounceRef.current !== null) {
      clearTimeout(idDebounceRef.current);
    }
    idDebounceRef.current = window.setTimeout(() => {
      if (idInputRef.current) {
        const newId = idInputRef.current.value.trim();
        if (newId && newId !== node.id) {
          lastEmittedIdRef.current = newId;
          onUpdateRef.current(node.id, { id: newId });
        }
      }
    }, DEBOUNCE_MS);
  };

  const handleIdBlur = () => {
    if (idDebounceRef.current !== null) {
      clearTimeout(idDebounceRef.current);
    }
    if (idInputRef.current) {
      const newId = idInputRef.current.value.trim();
      if (newId && newId !== node.id) {
        lastEmittedIdRef.current = newId;
        onUpdateRef.current(node.id, { id: newId });
      }
    }
  };

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

  // Create node metadata with outputs for template suggestions
  const nodesMetadata = useMemo((): NodeMetadata[] => {
    if (!nodes || nodes.length === 0) return [];

    // Create a map of nodeId -> node type for quick lookup
    const nodeTypeMap = new Map<string, string>();
    nodes.forEach(n => {
      nodeTypeMap.set(n.id, n.type || 'default');
    });

    return nodes.map(n => {
      // Find the node type definition for this node's type
      const nodeTypeDef = nodeTypes.find(nt => nt.type === n.type);

      // Special handling for input nodes - use schema fields as outputs
      if (n.type === 'input' && n.data?.schema && typeof n.data.schema === 'object') {
        const schemaFields = Object.keys(n.data.schema as Record<string, unknown>);
        return {
          id: n.id,
          outputs: schemaFields,
        };
      }

      return {
        id: n.id,
        outputs: nodeTypeDef?.outputs,
      };
    });
  }, [nodes, nodeTypes]);

  return (
    <ScrollArea flex={1}>
      <Stack gap="md" p="lg">
        <MantineTextInput
          label="Label"
          size="xs"
          {...register('label')}
        />

        <MantineTextInput
          ref={idInputRef}
          label={
            <Group gap={4}>
              <Text size="xs" fw={500}>ID</Text>
              <ActionIcon
                size="xs"
                variant="subtle"
                onClick={() => setIdEditEnabled( prev => !prev )}
                title="Edit ID"
              >
                <IconPencil size={12} />
              </ActionIcon>
            </Group>
          }
          size="xs"
          defaultValue={node.id}
          styles={{ input: { fontFamily: 'monospace' } }}
          onChange={handleIdChange}
          onBlur={handleIdBlur}
          disabled={!idEditEnabled}
        />

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
            nodes={nodesMetadata}
            nodeIds={nodeIds}
            onUpdate={onUpdate}
          />
        ))}
      </Stack>
    </ScrollArea>
  );
}
