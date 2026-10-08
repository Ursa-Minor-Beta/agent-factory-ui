import { Text, Badge, ActionIcon, Group, Tooltip } from '@mantine/core';
import { InfoTable } from '../../../common/InfoTable';
import { IconRefresh } from '@tabler/icons-react';

interface GitHubSync {
  id: string;
  userId: string;
  entityType: string;
  entityId: string;
  providerName: string;
  publicRepo: boolean;
  repository: string;
  branch: string;
  path: string;
  status: string;
  lastCommitSha: string | null;
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface GitHubStatusProps {
  syncStatus: GitHubSync;
  isLoading: boolean;
  onRefresh: () => void
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'synced': return 'green';
    case 'pending': return 'yellow';
    case 'error': return 'red';
    default: return 'gray';
  }
};

const formatDate = (date: string | null) => {
  if (!date) return 'Never';
  return new Date(date).toLocaleString();
};

export function GitHubStatus({ syncStatus, isLoading, onRefresh }: GitHubStatusProps) {
  return (
    <InfoTable
        rows={[
          // {
          //   label: 'Status',
          //   value: (
          //     <Group justify='space-between'>
          //       <Badge color={isLoading ? '' : getStatusColor(syncStatus.status)} variant="light" size="sm">
          //         {isLoading ? 'Updating...' : syncStatus.status}
          //       </Badge>
          //     <Tooltip label="Refresh GitHub data">
          //       <ActionIcon
          //         variant="subtle"
          //         color="gray"
          //         loading={isLoading}
          //         onClick={onRefresh}
          //       >
          //         <IconRefresh size={16} />
          //       </ActionIcon>
          //     </Tooltip>
          //   </Group>
          //   ),
          // },

          ...(isLoading ? [] : [{
              label: 'Repository',
              value: (
                <>
                  <Text size="xs" style={{ wordBreak: 'break-all' }}>
                    {syncStatus.repository}
                  </Text>
                  {syncStatus.publicRepo && (
                    <Badge size="xs" color="blue" variant="light" mt={4}>
                      Public
                    </Badge>
                  )}
                </>
              ),
            },
            {
              label: 'Branch',
              value: syncStatus.branch,
            },
            {
              label: 'Path',
              value: (
                <Text size="xs" style={{ wordBreak: 'break-all' }}>
                  {syncStatus.path}
                </Text>
              ),
            },
            {
              label: 'Last Commit',
              value: (
                <Text size="xs" ff="monospace" c="dimmed">
                  {syncStatus.lastCommitSha?.substring(0, 7)}
                </Text>
              ),
              hide: !syncStatus.lastCommitSha,
            },
            {
              label: 'Last Synced',
              value: formatDate(syncStatus.lastSyncedAt),
            },
            {
              label: 'Provider',
              value: syncStatus.providerName,
              hide: !syncStatus.providerName,
            }]
          )

        ]}
      />
  );
}
