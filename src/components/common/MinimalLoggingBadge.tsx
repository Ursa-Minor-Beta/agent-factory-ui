import { Badge, Tooltip } from '@mantine/core';
import { IconEyeOff } from '@tabler/icons-react';

// Shown on agents with settings.minimalRunLogging
export function MinimalLoggingBadge() {
  return (
    <Tooltip label="Minimal run logging: runs store only statuses, inputs and outputs are not saved">
      <Badge size="xs" variant="outline" color="gray" leftSection={<IconEyeOff size={10} />}>
        minimal logs
      </Badge>
    </Tooltip>
  );
}
