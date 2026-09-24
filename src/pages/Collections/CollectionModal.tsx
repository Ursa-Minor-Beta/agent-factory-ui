import { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import {
  Box,
  Text,
  Button,
  Card,
  Group,
  Stack,
  ActionIcon,
  Modal,
  TextInput,
  Textarea,
  Select,
  Checkbox,
} from '@mantine/core';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import type { MemorySchema, MemorySchemaField, MemoryFieldType } from '../../types';

interface SchemaForm {
  name: string;
  description: string;
  fields: MemorySchemaField[];
}

interface CollectionModalProps {
  opened: boolean;
  onClose: () => void;
  collection: MemorySchema | null;
  onSave: (data: SchemaForm) => Promise<void>;
  saving: boolean;
}

const fieldTypes: { value: MemoryFieldType; label: string }[] = [
  { value: 'string', label: 'String' },
  { value: 'number', label: 'Number' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'date', label: 'Date' },
  { value: 'array', label: 'Array' },
  { value: 'object', label: 'Object' },
];

const defaultField: MemorySchemaField = {
  name: '',
  type: 'string',
  required: false,
  index: false,
  description: '',
};

export function CollectionModal({ opened, onClose, collection, onSave, saving }: CollectionModalProps) {
  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<SchemaForm>({
    defaultValues: {
      name: '',
      description: '',
      fields: [{ ...defaultField }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'fields',
  });

  useEffect(() => {
    if (opened) {
      if (collection) {
        reset({
          name: collection.name,
          description: collection.description || '',
          fields: collection.fields.length > 0 ? collection.fields : [{ ...defaultField }],
        });
      } else {
        reset({
          name: '',
          description: '',
          fields: [{ ...defaultField }],
        });
      }
    }
  }, [opened, collection, reset]);

  const handleClose = () => {
    reset({
      name: '',
      description: '',
      fields: [{ ...defaultField }],
    });
    onClose();
  };

  const onSubmit = async (data: SchemaForm) => {
    await onSave(data);
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={collection ? 'Edit Collection' : 'Add Collection'}
      size="xl"
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        <Stack>
          <TextInput
            label="Name"
            placeholder="e.g., user_memories"
            description="Alphanumeric and underscore only"
            error={errors.name?.message}
            {...register('name', {
              required: 'Name is required',
              pattern: {
                value: /^[a-zA-Z_][a-zA-Z0-9_]*$/,
                message: 'Invalid name format',
              },
            })}
          />
          <Textarea
            label="Description"
            placeholder="Optional description"
            rows={2}
            {...register('description')}
          />

          <Box>
            <Group justify="space-between" mb="xs">
              <Text size="sm" fw={500}>Fields</Text>
              <Button
                size="xs"
                variant="light"
                leftSection={<IconPlus size={14} />}
                onClick={() => append({ ...defaultField })}
              >
                Add Field
              </Button>
            </Group>
            <Stack gap="xs">
              {fields.map((field, index) => (
                <Card key={field.id} withBorder p="xs">
                  <Group gap="xs" align="flex-start">
                    <TextInput
                      placeholder="Field name"
                      style={{ flex: 1 }}
                      size="xs"
                      error={errors.fields?.[index]?.name?.message}
                      {...register(`fields.${index}.name`, {
                        required: index === 0 ? 'At least one field is required' : false,
                      })}
                    />
                    <Select
                      placeholder="Type"
                      data={fieldTypes}
                      style={{ width: 120 }}
                      size="xs"
                      {...register(`fields.${index}.type`)}
                      defaultValue={field.type}
                      onChange={(value) => {
                        if (value) {
                          const event = { target: { value, name: `fields.${index}.type` } };
                          register(`fields.${index}.type`).onChange(event);
                        }
                      }}
                    />
                    <Checkbox
                      label="Required"
                      size="xs"
                      {...register(`fields.${index}.required`)}
                    />
                    <Checkbox
                      label="Index"
                      size="xs"
                      {...register(`fields.${index}.index`)}
                    />
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      size="sm"
                      onClick={() => fields.length > 1 && remove(index)}
                      disabled={fields.length <= 1}
                    >
                      <IconTrash size={14} />
                    </ActionIcon>
                  </Group>
                  <TextInput
                    placeholder="Field description (optional)"
                    size="xs"
                    mt="xs"
                    {...register(`fields.${index}.description`)}
                  />
                </Card>
              ))}
            </Stack>
          </Box>

          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {collection ? 'Save' : 'Create'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
