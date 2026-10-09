import { Text, Badge } from '@mantine/core';
import { InfoTable } from '../../../common/InfoTable';

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

const formatDate = (date: string | null) => {
  if (!date) return 'Never';
  return new Date(date).toLocaleString();
};

export function GitHubStatus({ syncStatus, isLoading }: GitHubStatusProps) {
  return (
    <InfoTable
        rows={[
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
