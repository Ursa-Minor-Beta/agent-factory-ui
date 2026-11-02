import { Badge, Tooltip } from '@mantine/core';
import { Link } from 'react-router-dom';
import { routes } from '../../config/routes';

interface WorkspaceBadgeProps {
  workspaceId?: string | null;
  workspaceName?: string | null;
  size?: 'xs' | 'sm' | 'md';
  truncate?: number;
}

export function WorkspaceBadge({
  workspaceId,
  workspaceName,
  size = 'sm',
  truncate = 8,
}: WorkspaceBadgeProps) {
  const displayName = workspaceName
    ? (truncate ? workspaceName.slice(0, truncate) : workspaceName)
    : 'Global';

  const badgeProps = {
    variant: 'light',
    color: workspaceName ? 'blue' : 'gray',
    radius: 'xs',
    size,
  } as const;

  return (
      <Tooltip label={displayName + ' Workspace scope'}>
        {workspaceId
          ? (
            <Badge
              {...badgeProps}
              component={Link}
              to={routes.workspace(workspaceId)}
              style={{ cursor: 'pointer' }}
            >
              {displayName}
            </Badge>
          )
          : <Badge {...badgeProps}>{displayName}</Badge>
        }
      </Tooltip>
  );
}
