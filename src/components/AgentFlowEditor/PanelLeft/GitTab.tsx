import { useEffect, useState } from 'react';
import { Stack, Text, Badge, Loader, Alert, Timeline, Box, Divider, Group, Card } from '@mantine/core';
import { IconBrandGithub, IconAlertCircle, IconGitCommit } from '@tabler/icons-react';
import type { Agent } from '../../../types/agent';
import { api } from '../../../api/client';
import { InfoTable } from '../../common/InfoTable';

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

interface GitHubCommit {
  sha: string;
  message: string;
  date: string;
  author: string;
}

interface GitTabProps {
  agent: Partial<Agent> | null;
}

export function GitTab({ agent }: GitTabProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<GitHubSync | null>(null);
  const [commits, setCommits] = useState<GitHubCommit[]>([]);
  const [loadingCommits, setLoadingCommits] = useState(false);

  useEffect(() => {
    if (!agent?.id) {
      setSyncStatus(null);
      setCommits([]);
      return;
    }

    loadGitHubStatus();
  }, [agent?.id]);

  const loadGitHubStatus = async () => {
    if (!agent?.id) return;

    setLoading(true);
    setError(null);

    try {
      const response = await api.get<GitHubSync | null>(`/api/agents/${agent.id}/github`);
      setSyncStatus(response);

      // Load commits if agent is linked
      if (response) {
        loadCommits();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load GitHub status');
    } finally {
      setLoading(false);
    }
  };

  const loadCommits = async () => {
    if (!agent?.id) return;

    setLoadingCommits(true);

    try {
      const response = await api.get<GitHubCommit[]>(`/api/agents/${agent.id}/github/commits`);
      setCommits(response);
    } catch (err) {
      console.error('Failed to load commits:', err);
      setCommits([]);
    } finally {
      setLoadingCommits(false);
    }
  };

  if (!agent?.id) {
    return (
      <Stack gap="md" p="xs">
        <Alert color="gray" icon={<IconAlertCircle size={16} />}>
          Save the agent first to enable GitHub sync
        </Alert>
      </Stack>
    );
  }

  if (loading) {
    return (
      <Stack align="center" justify="center" p="xl">
        <Loader size="sm" />
        <Text size="sm" c="dimmed">Loading GitHub status...</Text>
      </Stack>
    );
  }

  if (error) {
    return (
      <Stack gap="md" p="xs">
        <Alert color="red" icon={<IconAlertCircle size={16} />}>
          {error}
        </Alert>
      </Stack>
    );
  }

  if (!syncStatus) {
    return (
      <Stack gap="md" p="xs">
        <Group gap="xs">
          <IconBrandGithub size={20} />
          <Text size="sm" fw={500}>Not Linked</Text>
        </Group>

        <Text size="xs" c="dimmed">
          This agent is not linked to a GitHub repository
        </Text>

        <Badge color="gray" variant="light">
          Not linked
        </Badge>
      </Stack>
    );
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

  return (
    <Stack gap="md" p="xs">

      <Card withBorder>
        <InfoTable
          rows={[
            {
              label: 'Status',
              value: (
                <Badge color={getStatusColor(syncStatus.status)} variant="light" size="sm">
                  {syncStatus.status}
                </Badge>
              ),
            },
            {
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
            },
          ]}
        />
      </Card>

      <Card withBorder>
        <Text size="sm" fw={500} mb="xs">Commit History</Text>

        {loadingCommits ? (
          <Stack align="center" py="md">
            <Loader size="sm" />
            <Text size="xs" c="dimmed">Loading commits...</Text>
          </Stack>
        ) : commits.length === 0 ? (
          <Text size="xs" c="dimmed">No commits found</Text>
        ) : (
          <Timeline active={-1} bulletSize={20} lineWidth={2}>
            {commits.slice(0, 10).map((commit) => (
              <Timeline.Item
                key={commit.sha}
                bullet={<IconGitCommit size={12} />}
                title={
                  <Text size="xs" lineClamp={2}>
                    {commit.message}
                  </Text>
                }
              >
                <Stack gap={4} mt={4}>
                  <Text size="xs" c="dimmed" ff="monospace">
                    {commit.sha.substring(0, 7)}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {commit.author}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {new Date(commit.date).toLocaleString()}
                  </Text>
                </Stack>
              </Timeline.Item>
            ))}
          </Timeline>
        )}

        {commits.length > 10 && (
          <Text size="xs" c="dimmed" mt="xs">
            Showing 10 of {commits.length} commits
          </Text>
        )}
      </Card >
    </Stack>
  );
}
