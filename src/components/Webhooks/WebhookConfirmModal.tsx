import { useState } from 'react';
import { Button, Group, Modal, Stack, Text } from '@mantine/core';

interface WebhookConfirmModalProps {
  opened: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function WebhookConfirmModal({ opened, title, message, confirmLabel, onClose, onConfirm }: WebhookConfirmModalProps) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title={title} centered size="sm">
      <Stack>
        <Text size="sm">{message}</Text>
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>Cancel</Button>
          <Button color="red" loading={loading} onClick={handleConfirm}>{confirmLabel}</Button>
        </Group>
      </Stack>
    </Modal>
  );
}
