import { Link } from 'react-router-dom';
import { Text, Anchor } from '@mantine/core';
import { InfoTable } from '../../../common/InfoTable';
import { routes } from '../../../../config/routes';

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
  onRefresh: () => void;
  isSubAgent?: boolean;
  rootId?: string;
}

const formatDate = (date: string | null) => {
  if (!date) return 'Never';
  return new Date(date).toLocaleString();
};

export function GitHubStatus({ syncStatus, isLoading, isSubAgent, rootId }: GitHubStatusProps) {
  return (
    <InfoTable
        rows={[
          ...(isLoading ? [] : [
            ...(isSubAgent && rootId ? [{
              label: 'Root agent',
              value: (
                <Anchor component={Link} to={routes.agentEditor(rootId)} size="xs">
                  {rootId}
                </Anchor>
              ),
            }] : []),
            {
              label: 'Repository',
              value: (
                <Text size="xs" style={{ wordBreak: 'break-all' }}>
                  {syncStatus.repository}
                </Text>
              ),
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
              label: 'Branch',
              value: syncStatus.branch,
            },
            {
              label: 'Visibility',
              value: (
                <Text size="xs">
                  {syncStatus.publicRepo ? 'Public' : 'Private'}
                </Text>
              ),
            },
            {
              label: 'Last Commit',
              value: (
                <Text size="xs">
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
