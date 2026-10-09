import { Text, Stack, Loader, Timeline, Group, ActionIcon, Tooltip, Anchor } from '@mantine/core';
import { IconGitCommit, IconCloudUpload, IconCloudDownload } from '@tabler/icons-react';
import { GitHubSyncStatus } from '../../../../types/github';

interface GitHubCommit {
  sha: string;
  message: string;
  date: string;
  author: string;
}

interface CommitHistoryProps {
  commits: GitHubCommit[];
  loading: boolean;
  status?: string;
  currentCommitSha?: string | null;
  pullingCommit?: string | null;
  onPullCommit?: (sha: string) => void;
  repository?: string;
}

export function CommitHistory({ commits, loading, status, currentCommitSha, pullingCommit, onPullCommit, repository }: CommitHistoryProps) {
  const getCommitUrl = (sha: string) => {
    if (!repository) return null;
    return `https://github.com/${repository}/commit/${sha}`;
  };
  const hasUnpushedChanges = status === GitHubSyncStatus.LOCAL_AHEAD;

  return (
    <>
      {loading ? (
        <Stack align="center" py="md">
          <Loader size="sm" />
          <Text size="xs" c="dimmed">Loading commits...</Text>
        </Stack>
      ) : commits.length === 0 && !hasUnpushedChanges ? (
        <Text size="xs" c="dimmed">No commits found</Text>
      ) : (
        <Timeline active={hasUnpushedChanges ? 0 : -1} bulletSize={20} lineWidth={2}>
          {hasUnpushedChanges && (
            <Timeline.Item
              bullet={<IconCloudUpload size={12} />}
              color="orange"
              title={
                <Text size="xs" c="orange" fw={500}>
                  Unpushed local changes
                </Text>
              }
            >
              <Text size="xs" c="dimmed" mt={4}>
                Push to sync with remote
              </Text>
            </Timeline.Item>
          )}
          {commits.slice(0, 10).map((commit) => {
            const isCurrent = currentCommitSha === commit.sha;
            return (
              <Timeline.Item
                key={commit.sha}
                bullet={<IconGitCommit size={12} />}
                color={isCurrent ? 'teal' : undefined}
                title={
                  <Group gap="xs" justify="space-between" align="flex-start" wrap="nowrap">
                    <Text size="xs" lineClamp={2} c={isCurrent ? 'teal' : undefined} fw={isCurrent ? 500 : undefined} style={{ flex: 1, minWidth: 0 }}>
                      {commit.message}
                    </Text>
                    {isCurrent && (
                      <Text size="xs" c="teal" style={{ flexShrink: 0 }}>
                        current
                      </Text>
                    )}
                    {!isCurrent && onPullCommit && (
                      <Tooltip label="Checkout this commit">
                        <ActionIcon
                          size="sm"
                          variant="subtle"
                          loading={pullingCommit === commit.sha}
                          onClick={() => onPullCommit(commit.sha)}
                          style={{ flexShrink: 0 }}
                        >
                          <IconCloudDownload size={14} />
                        </ActionIcon>
                      </Tooltip>
                    )}
                  </Group>
                }
              >
                <Group gap="xs" mt={4} justify="space-between" align="flex-start">
                  <Stack gap={4}>
                    {getCommitUrl(commit.sha) ? (
                      <Anchor href={getCommitUrl(commit.sha)!} target="_blank" size="xs" ff="monospace">
                        {commit.sha.substring(0, 7)}
                      </Anchor>
                    ) : (
                      <Text size="xs" c="dimmed" ff="monospace">
                        {commit.sha.substring(0, 7)}
                      </Text>
                    )}
                    <Text size="xs" c="dimmed">
                      {commit.author}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {new Date(commit.date).toLocaleString()}
                    </Text>
                  </Stack>
                </Group>
              </Timeline.Item>
            );
          })}
        </Timeline>
      )}

      {commits.length > 10 && (
        <Text size="xs" c="dimmed" mt="xs">
          Showing 10 of {commits.length} commits
        </Text>
      )}
    </>
  );
}
