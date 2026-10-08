import { Text, Stack, Loader, Timeline } from '@mantine/core';
import { IconGitCommit } from '@tabler/icons-react';

interface GitHubCommit {
  sha: string;
  message: string;
  date: string;
  author: string;
}

interface CommitHistoryProps {
  commits: GitHubCommit[];
  loading: boolean;
}

export function CommitHistory({ commits, loading }: CommitHistoryProps) {
  return (
    <>
      {loading ? (
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
    </>
  );
}
