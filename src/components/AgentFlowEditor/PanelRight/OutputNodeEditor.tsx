import { useState } from 'react';
import { Stack, Group, Text, Button, TextInput, Card, Box, ActionIcon, Modal } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconPlus, IconPencil, IconTrash } from '@tabler/icons-react';
import type { NodeMetadata } from '../inputs/templateUtils';
import { StringInput } from '../inputs/StringInput';
import { FieldInput } from './FieldInput';

interface OutputFieldsEditorProps {
  nodeId: string;
  nodeLabel: string;
  nodeData: Record<string, unknown>;
  nodes?: NodeMetadata[];
  onUpdate: (nodeId: string, data: Record<string, unknown>) => void;
  onReplace: (nodeId: string, data: Record<string, unknown>) => void;
}

export function OutputNodeEditor({
  nodeId,
  nodeLabel,
  nodeData,
  nodes,
  onUpdate,
  onReplace,
}: OutputFieldsEditorProps) {
  const [showAddFieldForm, setShowAddFieldForm] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldValue, setNewFieldValue] = useState('');
  const [editingFieldKey, setEditingFieldKey] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [fieldToDelete, setFieldToDelete] = useState<string | null>(null);
  const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);

  // Get field keys excluding special fields
  const fieldKeys = Object.keys(nodeData).filter(
    key => key !== 'label' && key !== 'schema' && key !== 'outputFields'
  );

  // Handle adding a new field
  const handleAddField = () => {
    if (!newFieldName.trim()) return;
    onUpdate(nodeId, { [newFieldName]: newFieldValue });
    setNewFieldName('');
    setNewFieldValue('');
    setShowAddFieldForm(false);
  };

  // Handle opening delete confirmation
  const handleOpenDeleteModal = (fieldKey: string) => {
    setFieldToDelete(fieldKey);
    openDeleteModal();
  };

  // Handle confirming delete
  const handleConfirmDelete = () => {
    if (!fieldToDelete) return;
    const newData = { ...nodeData };
    delete newData[fieldToDelete];
    onReplace(nodeId, newData);
    setFieldToDelete(null);
    closeDeleteModal();
  };

  // Handle renaming a field
  const handleRenameField = (oldKey: string, newKey: string) => {
    if (oldKey === newKey) return;
    const newData = { ...nodeData };
    newData[newKey] = newData[oldKey];
    delete newData[oldKey];
    // Replace entire node data
    onReplace(nodeId, newData);
  };

  // Handle starting rename
  const handleStartRename = (fieldKey: string) => {
    setEditingFieldKey(fieldKey);
    setRenameValue(fieldKey);
  };

  // Handle saving rename
  const handleSaveRename = (oldKey: string) => {
    if (renameValue.trim() && renameValue !== oldKey) {
      handleRenameField(oldKey, renameValue);
    }
    setEditingFieldKey(null);
  };

  // Handle canceling rename
  const handleCancelRename = () => {
    setEditingFieldKey(null);
    setRenameValue('');
  };

  return (
    <Stack gap="sm">
      <Group justify="space-between">
        <Text size="sm" fw={500}>Fields</Text>
        <Button
          size="xs"
          leftSection={<IconPlus size={14} />}
          onClick={() => setShowAddFieldForm(true)}
          disabled={showAddFieldForm}
        >
          Add Field
        </Button>
      </Group>

      {/* Add field form */}
      {showAddFieldForm && (
        <Card padding="md" withBorder style={{ backgroundColor: 'var(--mantine-color-default-hover)' }}>
          <Stack gap="sm">
            <TextInput
              label="Field Name"
              placeholder="e.g., response, data, status"
              size="xs"
              value={newFieldName}
              onChange={(e) => setNewFieldName(e.target.value)}
              styles={{ input: { fontFamily: 'monospace' } }}
              autoFocus
            />

            <Box>
              <Text size="xs" fw={500} mb={4}>Value (can use template references)</Text>
              <StringInput
                name="value"
                nodeLabel={nodeLabel}
                value={newFieldValue}
                nodes={nodes}
                onChange={setNewFieldValue}
              />
            </Box>

            <Group gap="xs" mt="xs">
              <Button size="xs" onClick={handleAddField} disabled={!newFieldName.trim()}>
                Add Field
              </Button>
              <Button size="xs" variant="subtle" onClick={() => setShowAddFieldForm(false)}>
                Cancel
              </Button>
            </Group>
          </Stack>
        </Card>
      )}

      {/* Field list */}
      <Stack gap="xs">
        {fieldKeys.length > 0 ? (
          fieldKeys.map(key => {
            // Check if this field is being renamed
            if (editingFieldKey === key) {
              return (
                <Card key={key} padding="md" withBorder style={{ backgroundColor: 'var(--mantine-color-default-hover)' }}>
                  <Stack gap="sm">
                    <Text size="sm" fw={500}>Rename Field</Text>
                    <TextInput
                      label="Field Name"
                      size="xs"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      styles={{ input: { fontFamily: 'monospace' } }}
                      autoFocus
                    />
                    <Group gap="xs">
                      <Button size="xs" onClick={() => handleSaveRename(key)} disabled={!renameValue.trim()}>
                        Save
                      </Button>
                      <Button size="xs" variant="subtle" onClick={handleCancelRename}>
                        Cancel
                      </Button>
                    </Group>
                  </Stack>
                </Card>
              );
            }

            // Normal display mode
            return (
              <Box key={key}>
                <Group justify="space-between" mb={4} wrap="nowrap" align="stretch">
                  <Box style={{ flex: 1 }}>
                    <FieldInput
                      fieldKey={key}
                      nodeData={nodeData}
                      option={undefined}
                      nodeId={nodeId}
                      nodeLabel={nodeLabel}
                      nodes={nodes}
                      onUpdate={onUpdate}
                    />
                  </Box>
                  <Group gap={4} style={{ flexShrink: 0, alignSelf: 'flex-end', paddingBottom: '.25rem' }}>
                    <ActionIcon
                      size="sm"
                      variant="subtle"
                      onClick={() => handleStartRename(key)}
                      title="Rename field"
                    >
                      <IconPencil size={14} />
                    </ActionIcon>
                    <ActionIcon
                      size="sm"
                      variant="subtle"
                      color="red"
                      onClick={() => handleOpenDeleteModal(key)}
                      title="Delete field"
                    >
                      <IconTrash size={14} />
                    </ActionIcon>
                  </Group>
                </Group>
              </Box>
            );
          })
        ) : (
          !showAddFieldForm && (
            <Text size="xs" c="dimmed" ta="center" py="md">
              No fields defined. Click "Add Field" to create one.
            </Text>
          )
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
          <Text size="xs" c="dimmed">
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
