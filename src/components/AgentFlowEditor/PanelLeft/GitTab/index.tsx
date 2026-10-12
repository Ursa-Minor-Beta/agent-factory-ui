import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Stack, Alert, Accordion, Anchor } from '@mantine/core';
import { IconAlertCircle, IconGitFork } from '@tabler/icons-react';
import type { Agent } from '../../../../types/agent';
import { useGitHubData } from './useGitHubData';
import { GitHubStatus } from './GitHubStatus';
import { CommitHistory } from './CommitHistory';
import { GitSyncActions } from './GitSyncActions';
import { githubApi } from '../../../../api/github';

interface GitTabProps {
  agent: Partial<Agent> | null;
}

export function GitTab({ agent }: GitTabProps) {
  const { syncStatus, commits, loading, loadingCommits, error, refresh } = useGitHubData(agent);
  const [pushing, setPushing] = useState(false);
  const [pulling, setPulling] = useState(false);
  const [pullingCommit, setPullingCommit] = useState<string | null>(null);

  if (!agent?.id) {
    return (
      <Stack gap="md" p="xs">
        <Alert color="gray" icon={<IconAlertCircle size={16} />}>
          Save the agent first to enable GitHub sync
        </Alert>
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

  const isSubAgent = agent?.github?.rootId && agent.github.rootId !== agent.id;
  // For sub-agents, use the root agent's ID for sync operations
  const syncAgentId = isSubAgent ? agent.github?.rootId : agent.id;

  if (!syncStatus) {
    return (
      <Stack gap="md" p="xs">
        {isSubAgent && (
          <Alert color="blue" icon={<IconGitFork size={16} />}>
            This agent is a dependency of{' '}
            <Anchor component={Link} to={`/agents/${agent.github?.rootId}/editor`} size="sm">
              root agent
            </Anchor>
          </Alert>
        )}
        <Alert color="gray" icon={<IconAlertCircle size={16} />}>
          This agent is not linked to a GitHub repository
        </Alert>
      </Stack>
    );
  }

  const handlePush = async () => {
    if (!syncAgentId) return;
    setPushing(true);
    try {
      await githubApi.pushAgent(syncAgentId, {});
      refresh();
    } catch (err) {
      console.error('Push failed:', err);
    } finally {
      setPushing(false);
    }
  };

  const handlePull = async () => {
    if (!syncAgentId) return;
    setPulling(true);
    try {
      await githubApi.pullAgent(syncAgentId);
      refresh();
    } catch (err) {
      console.error('Pull failed:', err);
    } finally {
      setPulling(false);
    }
  };

  const handlePullCommit = async (commitSha: string) => {
    if (!syncAgentId) return;
    setPullingCommit(commitSha);
    try {
      await githubApi.pullAgent(syncAgentId, { commitSha });
      refresh();
    } catch (err) {
      console.error('Pull commit failed:', err);
    } finally {
      setPullingCommit(null);
    }
  };

  return (
    <Stack gap="xs" p="xs">

      <GitSyncActions
        status={syncStatus.status}
        loading={loading || loadingCommits}
        pushing={pushing}
        pulling={pulling}
        publicRepo={syncStatus.publicRepo}
        onRefresh={refresh}
        onPush={handlePush}
        onPull={handlePull}
      />

      <Accordion
        multiple={true}
        defaultValue={["commits"]}
        variant="separated"
        >
        <Accordion.Item value="status">
          <Accordion.Control>Info</Accordion.Control>
          <Accordion.Panel>
            <GitHubStatus
              syncStatus={syncStatus}
              onRefresh={refresh}
              isLoading={loading || loadingCommits}
              isSubAgent={isSubAgent}
              rootId={agent.github?.rootId}
            />
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="commits">
          <Accordion.Control>Commit History</Accordion.Control>
          <Accordion.Panel>
            <CommitHistory
              commits={commits}
              loading={loadingCommits}
              status={syncStatus.status}
              currentCommitSha={syncStatus.lastCommitSha}
              pullingCommit={pullingCommit}
              onPullCommit={handlePullCommit}
              repository={syncStatus.repository}
              publicRepo={syncStatus.publicRepo}
            />
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </Stack>
  );
}
