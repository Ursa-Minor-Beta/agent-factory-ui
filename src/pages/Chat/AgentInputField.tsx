import { Textarea, type TextareaProps } from '@mantine/core';
import type { InputSchema } from '../../types';
import { formatFieldLabel } from './models/agentInput';

interface AgentInputFieldProps extends Omit<TextareaProps, 'value' | 'onChange'> {
  fieldKey: string;
  schema: InputSchema[string];
  value: string;
  onChange: (key: string, value: string) => void;
  withLabel?: boolean;
}

const MAX_DEFAULT_LENGTH = 50;

// One field of an agent input schema - Chat input and the editor Run tab
export function AgentInputField({ fieldKey, schema, value, onChange, withLabel = true, ...props }: AgentInputFieldProps) {
  const defaultStr = schema.default !== undefined ? String(schema.default) : '';
  const placeholder = defaultStr
    ? `Default: ${defaultStr.length > MAX_DEFAULT_LENGTH ? `${defaultStr.slice(0, MAX_DEFAULT_LENGTH)}...` : defaultStr}`
    : undefined;

  return (
    <Textarea
      label={withLabel ? formatFieldLabel(fieldKey) : undefined}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(fieldKey, e.currentTarget.value)}
      autosize
      {...props}
    />
  );
}
