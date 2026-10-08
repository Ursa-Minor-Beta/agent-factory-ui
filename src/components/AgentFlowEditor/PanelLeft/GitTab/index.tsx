import { Stack, Alert, Group, ActionIcon, Tooltip } from '@mantine/core';
import { IconAlertCircle, IconRefresh } from '@tabler/icons-react';
import type { Agent } from '../../../../types/agent';
import { useGitHubData } from './useGitHubData';
import { GitHubStatus } from './GitHubStatus';
import { CommitHistory } from './CommitHistory';

interface GitTabProps {
  agent: Partial<Agent> | null;
}

export function GitTab({ agent }: GitTabProps) {
  const { syncStatus, commits, loading, loadingCommits, error, refresh } = useGitHubData(agent?.id);

  if (!agent?.id) {
    return (
      <Stack gap="md" p="xs">
        <Alert color="gray" icon={<IconAlertCircle size={16} />}>
          Save the agent first to enable GitHub sync
        </Alert>
      </Stack>
    );
  }

  // if (loading) {
  //   return (
  //     <Stack align="center" justify="center" p="xl">
  //       <Alert color="blue">Loading GitHub status...</Alert>
  //     </Stack>
  //   );
  // }

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
        <Alert color="gray" icon={<IconAlertCircle size={16} />}>
          This agent is not linked to a GitHub repository
        </Alert>
      </Stack>
    );
  }

  return (
    <Stack gap="md" p="xs">
      <GitHubStatus syncStatus={syncStatus} onRefresh={refresh} isLoading={loading || loadingCommits}/>
      <CommitHistory commits={commits} loading={loadingCommits} />
    </Stack>
  );
}
