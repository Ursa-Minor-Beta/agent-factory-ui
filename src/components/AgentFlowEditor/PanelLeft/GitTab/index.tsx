import { Stack, Alert, Accordion, ActionIcon, Badge, Group, Tooltip, Text, ButtonGroup, Card } from '@mantine/core';
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'synced': return 'green';
      case 'pending': return 'yellow';
      case 'error': return 'red';
      default: return 'gray';
    }
  };

  return (
    <Stack gap="xs" p="xs">

      <Card withBorder p='xs'>
        <Group gap="xs" justify="space-between">
          <Badge color={loading || loadingCommits ? '' : getStatusColor(syncStatus.status)} variant="light" size="sm">
            {loading || loadingCommits ? 'Updating...' : syncStatus.status}
          </Badge>
          <Group gap="xs">
            <Tooltip label="Refresh GitHub data">
              <ActionIcon
                loading={loading || loadingCommits}
                onClick={ (e) => {
                  e.stopPropagation()
                  refresh()
                }}
              >
                <IconRefresh size={16} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>
      </Card>

      <Accordion
        multiple={true}
        defaultValue={["status"]} 
        variant="separated" 
        >
        <Accordion.Item value="status">
          <Accordion.Control>Info</Accordion.Control>
          <Accordion.Panel>
            <GitHubStatus syncStatus={syncStatus} onRefresh={refresh} isLoading={loading || loadingCommits}/>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="commits">
          <Accordion.Control>Commit History</Accordion.Control>
          <Accordion.Panel>
            <CommitHistory commits={commits} loading={loadingCommits} />
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </Stack>
  );
}
