import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  Button,
  Group,
  Stack,
  Modal,
  TextInput,
  Textarea,
  Text,
  Divider,
} from '@mantine/core';
import type { Workspace } from '../../types/workspace';

interface WorkspaceForm {
  name: string;
  description: string;
}

interface WorkspaceModalProps {
  opened: boolean;
  onClose: () => void;
  workspace: Workspace | null;
  onSave: (data: WorkspaceForm) => Promise<void>;
  saving: boolean;
}

export function WorkspaceModal({ opened, onClose, workspace, onSave, saving }: WorkspaceModalProps) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<WorkspaceForm>({
    defaultValues: {
      name: '',
      description: '',
    },
  });

  useEffect(() => {
    if (opened) {
      if (workspace) {
        reset({
          name: workspace.name,
          description: workspace.description || '',
        });
      } else {
        reset({
          name: '',
          description: '',
        });
      }
    }
  }, [opened, workspace, reset]);

  const handleClose = () => {
    reset({
      name: '',
      description: '',
    });
    onClose();
  };

  const onSubmit = async (data: WorkspaceForm) => {
    await onSave(data);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={workspace ? 'Edit Workspace' : 'Create Workspace'}
      size="md"
      centered
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        <Stack>
          <TextInput
            label="Name"
            placeholder="Enter workspace name"
            error={errors.name?.message}
            {...register('name', {
              required: 'Name is required',
              minLength: { value: 1, message: 'Name must not be empty' },
              maxLength: { value: 255, message: 'Name is too long' },
            })}
          />
          <Textarea
            label="Description"
            placeholder="Enter description (optional)"
            rows={3}
            maxLength={1000}
            {...register('description', {
              maxLength: { value: 1000, message: 'Description is too long' },
            })}
          />

          {workspace && (
            <>
              <Divider />
              <Group>
                <Text fz="xs">Created:</Text>
                <Text fz="xs" c="dimmed">{formatDate(workspace.createdAt)}</Text>
              </Group>
              <Group>
                <Text fz="xs">Updated:</Text>
                <Text fz="xs" c="dimmed">{formatDate(workspace.updatedAt)}</Text>
              </Group>
            </>
          )}

          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={handleClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {workspace ? 'Save' : 'Create'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
