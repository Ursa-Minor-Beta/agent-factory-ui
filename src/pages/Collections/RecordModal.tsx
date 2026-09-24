import {
  Box,
  Text,
  Button,
  Group,
  Stack,
  Modal,
  TextInput,
  NumberInput,
  Switch,
  JsonInput,
  TagsInput,
  Badge,
} from '@mantine/core';
import type { MemorySchema, MemoryRecord, MemorySchemaField } from '../../types';

interface RecordForm {
  data: string; // JSON string of user fields
}

interface RecordModalProps {
  opened: boolean;
  onClose: () => void;
  record: MemoryRecord | null;
  schema: MemorySchema;
  formData: RecordForm;
  onFormChange: (data: RecordForm) => void;
  dataError: string;
  onValidateJson: (value: string) => boolean;
  onSave: () => Promise<void>;
  saving: boolean;
}

// Helper to get parsed form data
function getFormValues(formData: RecordForm): Record<string, unknown> {
  try {
    return JSON.parse(formData.data);
  } catch {
    return {};
  }
}

// Helper to update a single field in form data
function updateFormField(
  formData: RecordForm,
  fieldName: string,
  value: unknown,
  onFormChange: (data: RecordForm) => void
) {
  const values = getFormValues(formData);
  values[fieldName] = value;
  onFormChange({ data: JSON.stringify(values, null, 2) });
}

// Render input for a single schema field
function FieldInput({
  field,
  value,
  onChange,
}: {
  field: MemorySchemaField;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  switch (field.type) {
    case 'string':
      return (
        <TextInput
          label={field.name}
          description={field.description}
          placeholder={`Enter ${field.name}...`}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.currentTarget.value)}
          required={field.required}
        />
      );

    case 'number':
      return (
        <NumberInput
          label={field.name}
          description={field.description}
          placeholder={`Enter ${field.name}...`}
          value={typeof value === 'number' ? value : undefined}
          onChange={(val) => onChange(typeof val === 'number' ? val : 0)}
          required={field.required}
        />
      );

    case 'boolean':
      return (
        <Switch
          label={field.name}
          description={field.description}
          checked={Boolean(value)}
          onChange={(e) => onChange(e.currentTarget.checked)}
        />
      );

    case 'date':
      return (
        <TextInput
          label={field.name}
          description={field.description || 'ISO date string (e.g., 2024-01-15T10:30:00Z)'}
          placeholder="YYYY-MM-DDTHH:mm:ssZ"
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.currentTarget.value)}
          required={field.required}
        />
      );

    case 'array':
      // For simple string arrays, use TagsInput
      if (field.items === 'string' || !field.items) {
        return (
          <TagsInput
            label={field.name}
            description={field.description}
            placeholder={`Add ${field.name}...`}
            value={Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []}
            onChange={onChange}
          />
        );
      }
      // For other array types, use JsonInput
      return (
        <JsonInput
          label={field.name}
          description={field.description || `Array of ${field.items}`}
          placeholder="[]"
          value={typeof value === 'string' ? value : JSON.stringify(value ?? [], null, 2)}
          onChange={(val) => {
            try {
              onChange(JSON.parse(val));
            } catch {
              // Keep as string if invalid JSON
            }
          }}
          formatOnBlur
          autosize
          minRows={2}
          maxRows={6}
        />
      );

    case 'object':
      return (
        <JsonInput
          label={field.name}
          description={field.description}
          placeholder="{}"
          value={typeof value === 'string' ? value : JSON.stringify(value ?? {}, null, 2)}
          onChange={(val) => {
            try {
              onChange(JSON.parse(val));
            } catch {
              // Keep as string if invalid JSON
            }
          }}
          formatOnBlur
          autosize
          minRows={2}
          maxRows={6}
        />
      );

    default:
      return (
        <TextInput
          label={field.name}
          description={field.description}
          value={String(value ?? '')}
          onChange={(e) => onChange(e.currentTarget.value)}
        />
      );
  }
}

export function RecordModal({
  opened,
  onClose,
  record,
  schema,
  formData,
  onFormChange,
  dataError,
  onValidateJson,
  onSave,
  saving,
}: RecordModalProps) {
  const formValues = getFormValues(formData);

  // Validate JSON whenever form changes
  const handleFieldChange = (fieldName: string, value: unknown) => {
    updateFormField(formData, fieldName, value, (newData) => {
      onFormChange(newData);
      onValidateJson(newData.data);
    });
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={record ? 'Edit Record' : 'Add Record'}
      size="lg"
    >
      <Stack>
        <Box>
          <Text size="sm" fw={500} mb="xs">Schema Fields</Text>
          <Group gap={4} mb="sm">
            {schema.fields.map((field) => (
              <Badge key={field.name} size="xs" variant="light">
                {field.name}: {field.type}
                {field.required && '*'}
              </Badge>
            ))}
          </Group>
        </Box>

        {schema.fields.map((field) => (
          <FieldInput
            key={field.name}
            field={field}
            value={formValues[field.name]}
            onChange={(value) => handleFieldChange(field.name, value)}
          />
        ))}

        {dataError && (
          <Text size="sm" c="red">{dataError}</Text>
        )}

        <Group justify="flex-end" mt="md">
          <Button variant="subtle" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onSave} loading={saving}>
            {record ? 'Save' : 'Create'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
