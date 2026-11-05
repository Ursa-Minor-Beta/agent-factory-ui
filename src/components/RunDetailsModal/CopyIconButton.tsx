import { ActionIcon, CopyButton, Tooltip } from '@mantine/core';
import { IconCheck, IconCopy } from '@tabler/icons-react';

interface CopyIconButtonProps {
  value: string;
  label?: string;
  size?: 'xs' | 'sm';
  iconSize?: number;
  color?: string;
}

export function CopyIconButton({ value, label = 'Copy', size = 'xs', iconSize = 12, color }: CopyIconButtonProps) {
  return (
    <CopyButton value={value}>
      {({ copied, copy }) => (
        <Tooltip label={copied ? 'Copied' : label}>
          <ActionIcon variant="subtle" size={size} color={color} onClick={copy}>
            {copied ? <IconCheck size={iconSize} /> : <IconCopy size={iconSize} />}
          </ActionIcon>
        </Tooltip>
      )}
    </CopyButton>
  );
}

export const toJson = (data: unknown) => JSON.stringify(data, null, 2);
