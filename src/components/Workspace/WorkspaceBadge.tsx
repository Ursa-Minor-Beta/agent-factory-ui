import { Badge, Tooltip } from '@mantine/core';

interface WorkspaceBadgeProps {
  workspaceName?: string | null;
  size?: 'xs' | 'sm' | 'md';
  truncate?: number;
}

export function WorkspaceBadge({
  workspaceName,
  size = 'sm',
  truncate = 8,
}: WorkspaceBadgeProps) {
  const displayName = workspaceName
    ? (truncate ? workspaceName.slice(0, truncate) : workspaceName)
    : 'Global';

  return (
      <Tooltip label={workspaceName + ' Workspace scope'}>
        <Badge
          variant="light"
          color={workspaceName ? 'blue' : 'gray'}
          radius="xs"
          size={size}
        >
          {displayName}
        </Badge>
      </Tooltip>
  );
}
