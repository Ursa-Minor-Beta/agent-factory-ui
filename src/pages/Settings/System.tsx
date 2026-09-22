import { useState, useEffect } from 'react';
import {
  Box,
  Text,
  Button,
  Card,
  Stack,
  Group,
  Alert,
  Code,
  Badge,
  Loader,
  Modal,
  Anchor,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconInfoCircle,
  IconHeartbeat,
  IconRefresh,
  IconAlertCircle,
  IconCheck,
  IconExternalLink,
} from '@tabler/icons-react';
import { systemApi, type ApiInfo, type HealthCheck, type ReseedResult } from '../../api';
import { config } from '../../config';

export function SystemSettings() {
  const [apiInfo, setApiInfo] = useState<ApiInfo | null>(null);
  const [healthCheck, setHealthCheck] = useState<HealthCheck | null>(null);
  const [reseedResult, setReseedResult] = useState<ReseedResult | null>(null);
  const [loadingApi, setLoadingApi] = useState(false);
  const [loadingHealth, setLoadingHealth] = useState(false);
  const [loadingReseed, setLoadingReseed] = useState(false);
  const [error, setError] = useState('');
  const [reseedModalOpened, { open: openReseedModal, close: closeReseedModal }] = useDisclosure(false);

  const handleGetApiInfo = async () => {
    setLoadingApi(true);
    setError('');
    try {
      const data = await systemApi.getApiInfo();
      setApiInfo(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get API info');
    } finally {
      setLoadingApi(false);
    }
  };

  const handleHealthCheck = async () => {
    setLoadingHealth(true);
    setError('');
    try {
      const data = await systemApi.getHealth();
      setHealthCheck(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Health check failed');
    } finally {
      setLoadingHealth(false);
    }
  };

  const handleReseed = async () => {
    setLoadingReseed(true);
    setError('');
    try {
      const data = await systemApi.reseedSystemAgents();
      setReseedResult(data);
      closeReseedModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reseed failed');
    } finally {
      setLoadingReseed(false);
    }
  };

  useEffect(() => {
    handleGetApiInfo();
    handleHealthCheck();
  }, []);

  return (
    <Box>
      <Text fw={500} size="lg" mb="xs">System</Text>
      <Text c="dimmed" size="sm" mb="md">
        System settings and diagnostics
      </Text>

      {error && (
        <Alert
          icon={<IconAlertCircle size={16} />}
          color="red"
          mb="md"
          withCloseButton
          onClose={() => setError('')}
        >
          {error}
        </Alert>
      )}

      <Stack gap="md">
        {/* API Info Card */}
        <Card withBorder>
          <Group justify="space-between" mb="md">
            <Group gap="xs">
              <IconInfoCircle size={20} />
              <Text fw={500}>API Information</Text>
            </Group>
            <Button
              leftSection={loadingApi ? <Loader size={14} /> : <IconRefresh size={16} />}
              onClick={handleGetApiInfo}
              disabled={loadingApi}
              variant="light"
            >
              Refresh
            </Button>
          </Group>
          {apiInfo && (
            <Stack gap="xs">
              <Group gap="xs">
                <Text size="sm" c="dimmed">Name:</Text>
                <Code>{apiInfo.name}</Code>
              </Group>
              <Group gap="xs">
                <Text size="sm" c="dimmed">Version:</Text>
                <Code>{apiInfo.version}</Code>
              </Group>
              <Group gap="xs">
                <Text size="sm" c="dimmed">Swagger:</Text>
                <Anchor
                  href={`${config.apiBaseUrl}/docs`}
                  target="_blank"
                  size="sm"
                >
                  API Documentation <IconExternalLink size={14} style={{ verticalAlign: 'middle' }} />
                </Anchor>
              </Group>
            </Stack>
          )}
        </Card>

        {/* Health Check Card */}
        <Card withBorder>
          <Group justify="space-between" mb="md">
            <Group gap="xs">
              <IconHeartbeat size={20} />
              <Text fw={500}>Health Check</Text>
            </Group>
            <Button
              leftSection={loadingHealth ? <Loader size={14} /> : <IconRefresh size={16} />}
              onClick={handleHealthCheck}
              disabled={loadingHealth}
              variant="light"
            >
              Refresh
            </Button>
          </Group>
          {healthCheck && (
            <Stack gap="xs">
              <Group gap="xs">
                <Text size="sm" c="dimmed">Status:</Text>
                <Badge
                  color={healthCheck.status === 'ok' ? 'green' : 'red'}
                  leftSection={healthCheck.status === 'ok' ? <IconCheck size={12} /> : null}
                >
                  {healthCheck.status}
                </Badge>
              </Group>
              <Group gap="xs">
                <Text size="sm" c="dimmed">Timestamp:</Text>
                <Code>{new Date(healthCheck.timestamp).toLocaleString()}</Code>
              </Group>
            </Stack>
          )}
        </Card>

        {/* Reseed System Agents Card */}
        <Card withBorder>
          <Group justify="space-between" mb="md">
            <Group gap="xs">
              <IconRefresh size={20} />
              <Text fw={500}>Reseed System Agents</Text>
            </Group>
            <Button
              leftSection={<IconRefresh size={16} />}
              onClick={openReseedModal}
              variant="light"
              color="orange"
            >
              Reseed Agents
            </Button>
          </Group>
          <Text size="sm" c="dimmed" mb="md">
            Reseed system agents from the default configuration. This will update existing system agents and create any missing ones.
          </Text>
          {reseedResult && (
            <Stack gap="xs">
              {reseedResult.updated.length > 0 && (
                <Group gap="xs" align="flex-start">
                  <Text size="sm" c="dimmed">Updated:</Text>
                  <Group gap={4} wrap="wrap">
                    {reseedResult.updated.map((name) => (
                      <Badge key={name} variant="light" color="blue" size="sm">
                        {name}
                      </Badge>
                    ))}
                  </Group>
                </Group>
              )}
              {reseedResult.created.length > 0 && (
                <Group gap="xs" align="flex-start">
                  <Text size="sm" c="dimmed">Created:</Text>
                  <Group gap={4} wrap="wrap">
                    {reseedResult.created.map((name) => (
                      <Badge key={name} variant="light" color="green" size="sm">
                        {name}
                      </Badge>
                    ))}
                  </Group>
                </Group>
              )}
              {reseedResult.updated.length === 0 && reseedResult.created.length === 0 && (
                <Text size="sm" c="dimmed">No changes were made.</Text>
              )}
            </Stack>
          )}
        </Card>
      </Stack>

      {/* Reseed Confirmation Modal */}
      <Modal
        opened={reseedModalOpened}
        onClose={closeReseedModal}
        title="Reseed System Agents"
        size="sm"
        centered
      >
        <Stack>
          <Text size="sm">
            Are you sure you want to reseed system agents?
          </Text>
          <Text size="sm" c="dimmed">
            This will update existing system agents and create any missing ones from the default configuration.
          </Text>
          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={closeReseedModal} disabled={loadingReseed}>
              Cancel
            </Button>
            <Button color="orange" onClick={handleReseed} loading={loadingReseed}>
              Reseed
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}
