import {
  Box,
  Text,
  Button,
  Group,
  Stack,
  Modal,
  Badge,
} from '@mantine/core';
import type { MemorySchema, MemoryRecord } from '../../types';
import { JsonEditor } from '../../components/JsonEditor';

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
  const handleTextChange = (text: string) => {
    onFormChange({ data: text });
    onValidateJson(text);
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={record ? 'Edit Record' : 'Add Record'}
      size="xl"
      styles={{
        content: { height: '90vh', display: 'flex', flexDirection: 'column' },
        body: { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' },
      }}
    >
      <Stack style={{ flex: 1, minHeight: 0 }}>
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

        <Box style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <JsonEditor
            label="Fields"
            value={{}}
            text={formData.data}
            onTextChange={handleTextChange}
            height="100%"
          />
          {dataError && (
            <Text size="sm" c="red" mt="xs">{dataError}</Text>
          )}
        </Box>

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
