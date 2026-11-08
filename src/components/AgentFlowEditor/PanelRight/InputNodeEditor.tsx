import { useState } from 'react';
import { Stack, Group, Text, Button, TextInput, Select, Checkbox, ActionIcon, TagsInput, Card, Box, Modal } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconPlus, IconTrash, IconPencil } from '@tabler/icons-react';

type FieldType = 'string' | 'number' | 'boolean' | 'enum';

interface SchemaField {
  type: FieldType;
  options?: string[];
  required: boolean;
  default?: string | number | boolean;
}

interface SchemaEditorProps {
  schema: Record<string, SchemaField>;
  onChange: (schema: Record<string, SchemaField>) => void;
}

interface EditingField {
  name: string;
  type: FieldType;
  options: string[];
  required: boolean;
  default: string;
  isNew: boolean;
  originalName?: string;
}

export function InputNodeEditor({ schema, onChange }: SchemaEditorProps) {
  const [editingField, setEditingField] = useState<EditingField | null>(null);
  const [fieldToDelete, setFieldToDelete] = useState<string | null>(null);
  const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);

  const handleAddField = () => {
    setEditingField({
      name: '',
      type: 'string',
      options: [],
      required: false,
      default: '',
      isNew: true,
    });
  };

  const handleEditField = (fieldName: string) => {
    const field = schema[fieldName];
    setEditingField({
      name: fieldName,
      type: field.type,
      options: field.options ?? [],
      required: field.required,
      default: String(field.default ?? ''),
      isNew: false,
      originalName: fieldName,
    });
  };

  const handleOpenDeleteModal = (fieldName: string) => {
    setFieldToDelete(fieldName);
    openDeleteModal();
  };

  const handleConfirmDelete = () => {
    if (!fieldToDelete) return;
    const newSchema = { ...schema };
    delete newSchema[fieldToDelete];
    onChange(newSchema);
    setFieldToDelete(null);
    closeDeleteModal();
  };

  const handleSaveField = () => {
    if (!editingField || !editingField.name.trim()) return;

    const newSchema = { ...schema };

    // If editing an existing field with a name change, delete the old one
    if (!editingField.isNew && editingField.originalName && editingField.originalName !== editingField.name) {
      delete newSchema[editingField.originalName];
    }

    // Parse default value based on type
    let defaultValue: string | number | boolean | undefined = undefined;
    if (editingField.default) {
      if (editingField.type === 'number') {
        const num = parseFloat(editingField.default);
        defaultValue = isNaN(num) ? undefined : num;
      } else if (editingField.type === 'boolean') {
        defaultValue = editingField.default === 'true';
      } else {
        defaultValue = editingField.default;
      }
    }

    newSchema[editingField.name] = {
      type: editingField.type,
      ...(editingField.type === 'enum' && { options: editingField.options }),
      required: editingField.required,
      ...(defaultValue !== undefined && { default: defaultValue }),
    };

    onChange(newSchema);
    setEditingField(null);
  };

  const handleCancelEdit = () => {
    setEditingField(null);
  };

  const renderFieldForm = (title: string) => {
    if (!editingField) return null;
    const isEnum = editingField.type === 'enum';

    return (
      <Card padding="md" withBorder style={{ backgroundColor: 'var(--mantine-color-default-hover)' }}>
        <Stack gap="sm">
          <Text size="sm" fw={500}>{title}</Text>

          <TextInput
            label="Field Name"
            placeholder="e.g., url, apiKey, timeout"
            size="xs"
            value={editingField.name}
            onChange={(e) => setEditingField({ ...editingField, name: e.target.value })}
            styles={{ input: { fontFamily: 'monospace' } }}
          />

          <Select
            label="Type"
            size="xs"
            value={editingField.type}
            onChange={(value) => setEditingField({ ...editingField, type: value as FieldType, default: '' })}
            data={[
              { value: 'string', label: 'String' },
              { value: 'number', label: 'Number' },
              { value: 'boolean', label: 'Boolean' },
              { value: 'enum', label: 'Enum' },
            ]}
          />

          {isEnum && (
            <TagsInput
              label="Options"
              description="Press Enter to add an option"
              placeholder="e.g., low, medium, high"
              size="xs"
              value={editingField.options}
              onChange={(options) =>
                setEditingField({
                  ...editingField,
                  options,
                  default: options.includes(editingField.default) ? editingField.default : '',
                })
              }
            />
          )}

          <Checkbox
            label="Required"
            size="xs"
            checked={editingField.required}
            onChange={(e) => setEditingField({ ...editingField, required: e.target.checked })}
          />

          {isEnum ? (
            <Select
              label="Default Value (optional)"
              size="xs"
              data={editingField.options}
              value={editingField.default || null}
              onChange={(value) => setEditingField({ ...editingField, default: value ?? '' })}
              clearable
            />
          ) : (
            <TextInput
              label="Default Value (optional)"
              placeholder={
                editingField.type === 'boolean'
                  ? 'true or false'
                  : editingField.type === 'number'
                  ? 'e.g., 42'
                  : 'e.g., https://example.com'
              }
              size="xs"
              value={editingField.default}
              onChange={(e) => setEditingField({ ...editingField, default: e.target.value })}
            />
          )}

          <Group gap="xs" mt="xs">
            <Button size="xs" onClick={handleSaveField} disabled={isEnum && editingField.options.length === 0}>
              Save
            </Button>
            <Button size="xs" variant="subtle" onClick={handleCancelEdit}>
              Cancel
            </Button>
          </Group>
        </Stack>
      </Card>
    );
  };

  return (
    <Stack gap="sm">
      <Group justify="space-between">
        <Text size="sm" fw={500}>Schema Fields</Text>
        <Button size="xs" leftSection={<IconPlus size={14} />} onClick={handleAddField}>
          Add Field
        </Button>
      </Group>

      {/* Existing fields */}
      <Stack gap="xs">
        {Object.entries(schema).map(([fieldName, field]) => {
          // Show edit form in place of the field if this field is being edited
          const isEditing = editingField && !editingField.isNew && editingField.originalName === fieldName;

          if (isEditing) return <Box key={fieldName}>{renderFieldForm('Edit Field')}</Box>;

          return (
            <Card key={fieldName} padding="xs" withBorder>
              <Group justify="space-between">
                <Box style={{ flex: 1 }}>
                  <Group gap="xs">
                    <Text size="xs" fw={500} ff="monospace">{fieldName}</Text>
                    <Text size="xs" c="dimmed">{field.type}</Text>
                    {field.required && (
                      <Text size="xs" c="red">*required</Text>
                    )}
                  </Group>
                  {field.type === 'enum' && field.options && (
                    <Text size="xs" c="dimmed" mt={2}>
                      Options: {field.options.join(', ')}
                    </Text>
                  )}
                  {field.default !== undefined && (
                    <Text size="xs" c="dimmed" mt={2}>
                      Default: {String(field.default)}
                    </Text>
                  )}
                </Box>
                <Group gap={4}>
                  <ActionIcon
                    size="sm"
                    variant="subtle"
                    onClick={() => handleEditField(fieldName)}
                    title="Edit field"
                  >
                    <IconPencil size={14} />
                  </ActionIcon>
                  <ActionIcon
                    size="sm"
                    variant="subtle"
                    color="red"
                    onClick={() => handleOpenDeleteModal(fieldName)}
                    title="Delete field"
                  >
                    <IconTrash size={14} />
                  </ActionIcon>
                </Group>
              </Group>
            </Card>
          );
        })}

        {/* New field form */}
        {editingField?.isNew && renderFieldForm('New Field')}

        {Object.keys(schema).length === 0 && !editingField && (
          <Text size="xs" c="dimmed" ta="center" py="md">
            No schema fields defined. Click "Add Field" to create one.
          </Text>
        )}
      </Stack>

      {/* Delete confirmation modal */}
      <Modal
        opened={deleteModalOpened}
        onClose={closeDeleteModal}
        title="Delete Field"
        size="sm"
        centered
      >
        <Stack gap="md">
          <Text size="sm">
            Are you sure you want to delete the field <strong>{fieldToDelete}</strong>?
          </Text>
          <Text size="xs">
            Note: Other nodes may reference this field. Please check for broken references.
          </Text>
          <Group justify="flex-end" gap="xs">
            <Button variant="subtle" onClick={closeDeleteModal}>
              Cancel
            </Button>
            <Button color="red" onClick={handleConfirmDelete}>
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
