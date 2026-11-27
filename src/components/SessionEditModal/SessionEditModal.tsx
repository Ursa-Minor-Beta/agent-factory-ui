import { useEffect, useState } from 'react';
import { Button, Group, Modal, Stack, Switch, Text, TextInput } from '@mantine/core';
import { Controller, useForm } from 'react-hook-form';
import { sessionsApi } from '../../api';
import type { Session } from '../../types';

interface SessionEditForm {
  title: string;
  archived: boolean;
}

interface SessionEditModalProps {
  opened: boolean;
  onClose: () => void;
  session: Session | null;
  // Called with the updated session after save
  onSaved: (session: Session) => void;
}

export function SessionEditModal({ opened, onClose, session, onSaved }: SessionEditModalProps) {
  const { register, control, handleSubmit, reset } = useForm<SessionEditForm>({
    defaultValues: { title: '', archived: false },
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!opened || !session) return;
    reset({ title: session.title ?? '', archived: session.status === 'archived' });
    setError(null);
  }, [opened, session, reset]);

  const onSubmit = async (values: SessionEditForm) => {
    if (!session) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await sessionsApi.update(session.id, {
        title: values.title.trim() || null,
        status: values.archived ? 'archived' : 'active',
      });
      onSaved(updated);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update session');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Edit session" centered size="sm">
      <form onSubmit={handleSubmit(onSubmit)}>
        <Stack>
          <TextInput label="Title" placeholder="Untitled session" data-autofocus {...register('title')} />
          <Controller
            name="archived"
            control={control}
            render={({ field }) => (
              <Switch label="Archived" checked={field.value} onChange={(e) => field.onChange(e.currentTarget.checked)} />
            )}
          />
          {error && (
            <Text size="sm" c="red">
              {error}
            </Text>
          )}
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              Save
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
