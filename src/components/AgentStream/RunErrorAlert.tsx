import { Alert, Button, Group, Text, type AlertProps } from '@mantine/core';
import { IconAlertCircle, IconListDetails, IconRefresh } from '@tabler/icons-react';
import { useRunDetailsModal } from '../RunDetailsModal';

interface RunErrorAlertProps extends Omit<AlertProps, 'children' | 'onClose'> {
  error: string;
  runId?: string | null;
  onRetry?: () => void;
  onClose?: () => void;
  size?: 'xs' | 'sm';
}

// Failed run: message + Run Details / Retry
export function RunErrorAlert({ error, runId, onRetry, onClose, size = 'sm', ...props }: RunErrorAlertProps) {
  const { openRunDetails } = useRunDetailsModal();
  const iconSize = size === 'xs' ? 14 : 16;
  return (
    <Alert
      icon={<IconAlertCircle size={iconSize} />}
      color="red"
      p={size === 'xs' ? 'xs' : undefined}
      withCloseButton={!!onClose}
      onClose={onClose}
      {...props}
    >
      <Group justify="space-between" align="center" gap="xs">
        <Text size={size}>{error}</Text>
        {(runId || onRetry) && (
          <Group gap="xs">
            {runId && (
              <Button size="xs" variant="light" color="red" leftSection={<IconListDetails size={14} />} onClick={() => openRunDetails(runId)}>
                Run Details
              </Button>
            )}
            {onRetry && (
              <Button size="xs" variant="light" color="red" leftSection={<IconRefresh size={14} />} onClick={onRetry}>
                Retry
              </Button>
            )}
          </Group>
        )}
      </Group>
    </Alert>
  );
}
