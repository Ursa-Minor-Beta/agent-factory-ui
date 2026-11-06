import { Badge } from '@mantine/core';
import { IconCheck, IconClock, IconPlayerPlay, IconX } from '@tabler/icons-react';
import { nodeStatusColors, statusColors, type NodeStatus, type RunStatus } from '../../types';

const statusIcon = (status: string) =>
  status === 'completed' ? <IconCheck size={10} /> :
  status === 'failed' ? <IconX size={10} /> :
  status === 'running' ? <IconPlayerPlay size={10} /> :
  <IconClock size={10} />;

// Run or node status
export function RunStatusBadge({ status, size = 'sm', withIcon = true }: { status: RunStatus | NodeStatus; size?: 'sm' | 'md'; withIcon?: boolean }) {
  const color = statusColors[status as RunStatus] ?? nodeStatusColors[status as NodeStatus];
  return (
    <Badge size={size} color={color} variant="light" leftSection={withIcon ? statusIcon(status) : undefined}>
      {status}
    </Badge>
  );
}
