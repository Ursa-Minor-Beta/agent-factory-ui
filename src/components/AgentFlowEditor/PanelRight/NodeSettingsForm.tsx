import { useEffect, useRef, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { TextInput as MantineTextInput, Stack, Divider, ScrollArea, Group, Text, ActionIcon, Tooltip, ThemeIcon } from '@mantine/core';
import { IconPencil, IconQuestionMark } from '@tabler/icons-react';
import type { Node } from '@xyflow/react';
import type { NodeType, NodeTypeOption } from '../../../api';
import type { NodeMetadata, TemplateRefs } from '../inputs/templateUtils';
import { FieldInput } from './FieldInput';
import { InputNodeEditor } from './InputNodeEditor';
import { OutputNodeEditor } from './OutputNodeEditor';
import { BooleanInput, MultiEnumInput } from '../inputs';
import { canRunAfter, getRunAfter, DISABLED_KEY, RUN_AFTER_KEY } from '../utils/converters';

interface NodeSettingsFormProps {
  node: Node;
  nodes: Node[];
  nodeTypes: NodeType[];
  templateRefs: TemplateRefs;
  onUpdate: (nodeId: string, data: Record<string, unknown>) => void;
  onUpdateId: (oldId: string, newId: string) => void;
  onReplace: (nodeId: string, data: Record<string, unknown>) => void;
}

interface NodeFormData {
  label: string;
  [key: string]: unknown;
}

const DEBOUNCE_MS = 300;

// HTTP node fields interpolated with secrets: url, every header value, body
const SECRET_FIELDS: Record<string, string[]> = {
  http: ['url', 'headers', 'body'],
};

export function NodeSettingsForm({ node, nodes, nodeTypes, templateRefs, onUpdate, onUpdateId, onReplace }: NodeSettingsFormProps) {
  const { register, reset, watch } = useForm<NodeFormData>();
  const updateTimeoutRef = useRef<number | undefined>(undefined);

  // ID editing state - renamed on blur
  const [idValue, setIdValue] = useState(node.id);
  const [idEditEnabled, setIdEditEnabled] = useState(false);

  useEffect(() => {
    reset({
      label: (node.data?.label as string) || '',
      ...(node.data as Record<string, unknown>),
    });
  }, [node.id, reset, node.data]);

  // Sync ID input when node changes (e.g., selecting different node)
  useEffect(() => {
    setIdValue(node.id);
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

  // ID validation: required and unique among the agent's nodes
  const trimmedId = idValue.trim();
  const idError = !trimmedId
    ? 'ID is required'
    : trimmedId !== node.id && nodes.some((n) => n.id === trimmedId)
      ? 'A node with this ID already exists'
      : null;

  const handleIdBlur = () => {
    if (idError || trimmedId === node.id) {
      setIdValue(node.id); // Invalid or unchanged - restore the current ID
      return;
    }
    onUpdateId(node.id, trimmedId);
  };

  const nodeData = node.data as Record<string, unknown>;
  const nodeLabel = useMemo(() => (nodeData.label as string) || node.id, [nodeData.label, node.id]);

  // Handle schema changes for input nodes
  const handleSchemaChange = (newSchema: Record<string, unknown>) => {
    onUpdate(node.id, { schema: newSchema });
  };

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

  // Top-level node fields (e.g. runAfter), rendered separately from data options
  const nodeFields = useMemo(
    () => nodeTypes.find((nt) => nt.type === node.type)?.nodeFields ?? [],
    [nodeTypes, node.type]
  );

  // Nodes selectable in node[] fields - input/output don't take part in ordering
  const orderableNodeIds = useMemo(
    () => nodes.filter((n) => n.id !== node.id && canRunAfter(n.type)).map((n) => n.id),
    [nodes, node.id]
  );

  // Merge option names with existing data keys (options first, then any extra data keys)
  const dataKeys = useMemo(() => {
    const optionNames = Object.keys(optionsMap);
    // Node fields are rendered above, not as data options
    const nodeFieldNames = new Set([RUN_AFTER_KEY, DISABLED_KEY, ...nodeFields.map((f) => f.name)]);
    const existingKeys = Object.keys(nodeData).filter((k) => k !== 'label' && !nodeFieldNames.has(k));
    const allKeys = new Set([...optionNames, ...existingKeys]);
    return Array.from(allKeys);
  }, [optionsMap, nodeData, nodeFields]);

  // Create node metadata with outputs for template suggestions
  const nodesMetadata = useMemo((): NodeMetadata[] => {
    if (!nodes || nodes.length === 0) return [];

    // Exclude the current node - it can't reference its own outputs
    return nodes.filter(n => n.id !== node.id && n.type !== 'output' ).map(n => {
      // Find the node type definition for this node's type
      const nodeTypeDef = nodeTypes.find(nt => nt.type === n.type);

      // If node has a schema (input nodes), use schema fields as outputs
      if (n.data?.schema && typeof n.data.schema === 'object') {
        const schema = n.data.schema as Record<string, unknown>;
        const schemaFields = Object.keys(schema);

        if (schemaFields.length > 0) {
          return {
            id: n.id,
            outputs: schemaFields,
          };
        }
      }

      // If node is an output node, use its data field names as outputs (excluding special fields)
      if (n.type === 'output' && n.data) {
        const dataKeys = Object.keys(n.data).filter(key =>
          key !== 'label' && key !== 'schema' && key !== 'outputFields'
        );
        if (dataKeys.length > 0) {
          return {
            id: n.id,
            outputs: dataKeys,
          };
        }
      }

      // Fallback to node type outputs
      return {
        id: n.id,
        outputs: nodeTypeDef?.outputs,
      };
    });
  }, [nodes, nodeTypes, node.id]);

  // Variables are allowed everywhere, secrets only in fields listed in SECRET_FIELDS
  const variableRefs = useMemo((): TemplateRefs => ({ variables: templateRefs.variables }), [templateRefs.variables]);
  const getFieldRefs = (key: string) =>
    SECRET_FIELDS[node.type ?? '']?.includes(key) ? templateRefs : variableRefs;

  return (
    <ScrollArea flex={1}>
      <Stack gap="lg" p="lg">
        <MantineTextInput
          label="Label"
          size="xs"
          {...register('label')}
        />

        <MantineTextInput
          labelProps={{ style: {width: '100%'} }}
          label={
            <Group gap="xs" justify="space-between">
              <Text size="xs" fw={500}>ID</Text>
              <Group gap={4}>
                <Tooltip label="Renaming updates references to this node in other nodes ({{node: id...}} templates, branch targets, run after). References from other agents or outside the editor are not updated" multiline maw={300}>
                  <ThemeIcon size={14} radius="xl" color="gray" variant="light">
                    <IconQuestionMark size={10} />
                  </ThemeIcon>
                </Tooltip>
                <ActionIcon
                  size="xs"
                  variant="subtle"
                  onClick={() => setIdEditEnabled( prev => !prev )}
                  title="Edit ID"
                >
                  <IconPencil size={12} />
                </ActionIcon>
              </Group>
            </Group>
          }
          size="xs"
          value={idValue}
          error={idEditEnabled && idError}
          styles={{ input: { fontFamily: 'monospace' } }}
          onChange={(e) => setIdValue(e.currentTarget.value)}
          onBlur={handleIdBlur}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
            if (e.key === 'Escape') setIdValue(node.id);
          }}
          disabled={!idEditEnabled}
        />

        <Divider />

        {/* Schema editor for input nodes, output fields editor for output nodes, regular fields for everything else */}
        {node.type === 'input' ? (
          <InputNodeEditor
            schema={(nodeData.schema as Record<string, any>) || {}}
            onChange={handleSchemaChange}
          />
        ) : node.type === 'output' ? (
          <OutputNodeEditor
            nodeId={node.id}
            nodeLabel={nodeLabel}
            nodeData={nodeData}
            nodes={nodesMetadata}
            refs={variableRefs}
            onUpdate={onUpdate}
            onReplace={onReplace}
          />
        ) : (
          <>
          {nodeFields.map((field) => {
            const key = `${node.id}:${field.name}`;
            switch (field.type) {
              case 'node[]':
                return (
                  <MultiEnumInput
                    key={key}
                    name={field.name}
                    description={field.description}
                    value={field.name === RUN_AFTER_KEY ? getRunAfter(nodeData) : ((nodeData[field.name] as string[]) ?? [])}
                    values={orderableNodeIds}
                    onChange={(value) => onUpdate(node.id, { [field.name]: value })}
                  />
                );
              case 'boolean':
                return (
                  <BooleanInput
                    key={key}
                    name={field.name}
                    description={field.description}
                    value={nodeData[field.name] === true}
                    onChange={(value) => onUpdate(node.id, { [field.name]: value })}
                  />
                );
              default:
                return null;
            }
          })}
          {nodeFields.length > 0 && <Divider />}
          {dataKeys.map(key => (
            <FieldInput
              // Node id in key: remount per node so no input state leaks between nodes
              key={`${node.id}:${key}`}
              fieldKey={key}
              nodeData={nodeData}
              option={optionsMap[key]}
              nodeId={node.id}
              nodeLabel={nodeLabel}
              nodes={nodesMetadata}
              refs={getFieldRefs(key)}
              onUpdate={onUpdate}
            />
          ))}
          </>
        )}
      </Stack>
    </ScrollArea>
  );
}
