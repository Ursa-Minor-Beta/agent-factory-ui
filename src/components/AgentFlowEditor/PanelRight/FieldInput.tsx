import { useEffect, useRef, useCallback, memo } from 'react';
import type { NodeTypeOption } from '../../../api';
import type { NodeMetadata } from '../inputs/templateUtils';
import { StringInput, TextInput, EditorInput, NumberInput, BooleanInput, EnumInput, MultiEnumInput } from '../inputs';

interface FieldInputProps {
  fieldKey: string;
  nodeData: Record<string, unknown>;
  option: NodeTypeOption | undefined;
  nodeId: string;
  nodeLabel: string;
  nodes?: NodeMetadata[];
  onUpdate: (nodeId: string, data: Record<string, unknown>) => void;
}

// Memoized field input component to prevent unnecessary re-renders
export const FieldInput = memo(function FieldInput({
  fieldKey,
  nodeData,
  option,
  nodeId,
  nodeLabel,
  nodes,
  onUpdate,
}: FieldInputProps) {
  const value = nodeData[fieldKey];
  const fieldType = option?.type;
  const timeoutRef = useRef<number | undefined>(undefined);
  const flushRef = useRef<(() => void) | null>(null);

  const handleChange = (newValue: unknown) => {
    onUpdate(nodeId, { [fieldKey]: newValue });
  };

  // Debounced onChange handler - prevents updates on every keystroke
  const handleChangeDebounced = useCallback(
    (newValue: unknown) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      flushRef.current = () => onUpdate(nodeId, { [fieldKey]: newValue });
      timeoutRef.current = window.setTimeout(() => {
        timeoutRef.current = undefined;
        flushRef.current?.();
        flushRef.current = null;
      }, 300);
    },
    [nodeId, fieldKey, onUpdate]
  );

  // Flush pending update on unmount (e.g. switching nodes) instead of dropping it
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        flushRef.current?.();
      }
    };
  }, []);

  // Multi-select enum type
  if (fieldType === 'enum[]' && option?.values) {
    const arrayValue = Array.isArray(value) ? value : (option?.default as string[] ?? []);
    return (
      <MultiEnumInput
        name={fieldKey}
        description={option.description}
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
        description={option.description}
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
        description={option?.description}
        value={typeof value === 'number' ? value : (option?.default as number | undefined)}
        onChange={handleChangeDebounced}
      />
    );
  }

  // Boolean type
  if (fieldType === 'boolean') {
    return (
      <BooleanInput
        name={fieldKey}
        description={option?.description}
        value={typeof value === 'boolean' ? value : (option?.default as boolean ?? false)}
        onChange={handleChange}
      />
    );
  }

  // Text type (multiline with modal)
  if (fieldType === 'text') {
    return (
      <TextInput
        name={fieldKey}
        description={option?.description}
        nodeLabel={nodeLabel}
        nodeId={nodeId}
        value={String(value ?? option?.default ?? '')}
        nodes={nodes}
        onChange={handleChangeDebounced}
      />
    );
  }

  // Code type (JSON editor with modal)
  if (fieldType === 'code') {
    return (
      <EditorInput
        mode='javascript'
        nodeId={nodeId}
        name={fieldKey}
        description={option?.description}
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
        mode='json'
        nodeId={nodeId}
        name={fieldKey}
        description={option?.description}
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
      description={option?.description}
      nodeLabel={nodeLabel}
      value={String(value ?? option?.default ?? '')}
      nodes={nodes}
      onChange={handleChangeDebounced}
    />
  );
});
