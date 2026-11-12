import { ActionIcon, CopyButton, Group, Text, Tooltip } from '@mantine/core';
import { IconCheck, IconCopy } from '@tabler/icons-react';
import { type ReactNode } from 'react';

interface CopyIdProps {
  /** Value copied to the clipboard */
  value: string;
  /** Text shown next to the button; defaults to `value` */
  label?: ReactNode;
  /** Tooltip, e.g. "Copy Agent ID" */
  tooltip?: string;
  dimmed?: boolean;
}

/** Monospace id with a copy button; clicks don't reach a clickable table row */
export function CopyId({ value, label, tooltip = 'Copy ID', dimmed = false }: CopyIdProps) {
  return (
    <Group gap="xs" wrap="nowrap">
      <Text size="sm" ff="monospace" c={dimmed ? 'dimmed' : undefined}>
        {label ?? value}
      </Text>
      <CopyButton value={value}>
        {({ copied, copy }) => (
          <Tooltip label={copied ? 'Copied' : tooltip}>
            <ActionIcon
              size="xs"
              variant="subtle"
              color={copied ? 'teal' : 'gray'}
              onClick={(e) => {
                e.stopPropagation();
                copy();
              }}
            >
              {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
            </ActionIcon>
          </Tooltip>
        )}
      </CopyButton>
    </Group>
  );
}
