import type { InputSchema } from '../../../types';

type FieldSchema = InputSchema[string];

// Required only when it has no default value
export const isRequiredField = (schema: FieldSchema) => !!schema.required && schema.default === undefined;

// "user_name" / "userName" -> "User name"
export const formatFieldLabel = (key: string) =>
  key
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();

export const hasMissingRequired = (schema: InputSchema, values: Record<string, string>) =>
  Object.entries(schema).some(([key, field]) => isRequiredField(field) && !values[key]?.trim());

// Form string values -> agent run input, typed by the schema; empty fields are skipped (backend applies defaults)
export function buildAgentInput(schema: InputSchema, values: Record<string, string>): Record<string, unknown> {
  const input: Record<string, unknown> = {};
  for (const [key, field] of Object.entries(schema)) {
    const value = values[key];
    if (!value) continue;
    if (field.type === 'number') input[key] = Number(value);
    else if (field.type === 'boolean') input[key] = value.toLowerCase() === 'true';
    else input[key] = value;
  }
  return input;
}
