import {
  Box,
  Text,
  Button,
  Group,
  Stack,
  Modal,
  NumberInput,
  JsonInput,
  TagsInput,
  Badge,
} from '@mantine/core';
import type { MemorySchema, MemoryRecord } from '../../types';

interface RecordForm {
  data: string;
  importance: number;
  tags: string[];
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

        <JsonInput
          label="Data"
          description="JSON object matching the schema fields"
          placeholder='{"field": "value"}'
          formatOnBlur
          autosize
          minRows={6}
          maxRows={15}
          value={formData.data}
          onChange={(value) => {
            onFormChange({ ...formData, data: value });
            if (value) onValidateJson(value);
          }}
          error={dataError}
        />

        <NumberInput
          label="Importance"
          description="Value between 0 and 1"
          min={0}
          max={1}
          step={0.1}
          decimalScale={2}
          value={formData.importance}
          onChange={(value) => onFormChange({ ...formData, importance: typeof value === 'number' ? value : 0.5 })}
        />

        <TagsInput
          label="Tags"
          placeholder="Add tags..."
          value={formData.tags}
          onChange={(value) => onFormChange({ ...formData, tags: value })}
        />

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
