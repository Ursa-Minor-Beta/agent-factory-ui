import { ActionIcon, Badge, Card, Group, Tooltip } from '@mantine/core';
import { IconRefresh, IconCloudUpload, IconCloudDownload } from '@tabler/icons-react';
import { GitHubSyncStatus } from '../../../../types/github';

interface GitSyncActionsProps {
  status: string;
  loading: boolean;
  pushing: boolean;
  pulling: boolean;
  publicRepo?: boolean;
  onRefresh: () => void;
  onPush: () => void;
  onPull: () => void;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case GitHubSyncStatus.SYNCED: return 'teal';
    case GitHubSyncStatus.LOCAL_AHEAD: return 'orange';
    case GitHubSyncStatus.REMOTE_AHEAD: return 'blue';
    case GitHubSyncStatus.CONFLICT: return 'red';
    default: return 'gray';
  }
};

export function GitSyncActions({
  status,
  loading,
  pushing,
  pulling,
  publicRepo,
  onRefresh,
  onPush,
  onPull,
}: GitSyncActionsProps) {
  const isPushActive = status === GitHubSyncStatus.LOCAL_AHEAD;
  const isPullActive = status === GitHubSyncStatus.REMOTE_AHEAD;

  return (
    <Card withBorder p="xs">
      <Group gap="xs" justify="space-between">
        <Group gap="xs">
          <Tooltip label="Refresh GitHub data">
            <ActionIcon
              variant="default"
              loading={loading}
              onClick={(e) => {
                e.stopPropagation();
                onRefresh();
              }}
            >
              <IconRefresh size={16} />
            </ActionIcon>
          </Tooltip>
          {!publicRepo && (
            <Tooltip label="Push local changes to GitHub">
              <ActionIcon
                variant="default"
                disabled={!isPushActive}
                loading={pushing}
                onClick={onPush}
              >
                <IconCloudUpload size={16} />
              </ActionIcon>
            </Tooltip>
          )}
          <Tooltip label="Pull remote changes from GitHub">
            <ActionIcon
              variant="default"
              disabled={!isPullActive}
              loading={pulling}
              onClick={onPull}
            >
              <IconCloudDownload size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>
        <Badge color={loading ? '' : getStatusColor(status)} variant="light" size="sm">
          {loading ? 'Updating...' : status}
        </Badge>
      </Group>
    </Card>
  );
}
