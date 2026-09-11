import {
  Modal,
  Text,
  Card,
  Group,
  Badge,
  Stack,
  Code,
  ScrollArea,
  Accordion,
  Paper,
  Title,
  SimpleGrid,
  Box,
  CopyButton,
  ActionIcon,
  Tooltip,
  Alert,
} from '@mantine/core';
import {
  IconAlertCircle,
  IconClock,
  IconCheck,
  IconX,
  IconPlayerPlay,
  IconCopy,
} from '@tabler/icons-react';
import type { RunDetailsModalProps } from './types';
import { statusColors, nodeStatusColors, formatDuration } from './types';

export function RunDetailsModal({ run, opened, onClose }: RunDetailsModalProps) {
  if (!run) return null;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="sm">
          <Text fw={600}>Run Details</Text>
          <Badge color={statusColors[run.status]} variant="light">
            {run.status}
          </Badge>
        </Group>
      }
      fullScreen
    >
      <Stack gap="lg">
        {/* Header Info Card */}
        <Card withBorder padding="md">
          <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="lg">
            <Box>
              <Text size="xs" c="dimmed" tt="uppercase" fw={500}>
                Agent ID
              </Text>
              <Group gap="xs">
                <Code fz="xs">{run.agentId}</Code>
                <CopyButton value={run.agentId}>
                  {({ copied, copy }) => (
                    <Tooltip label={copied ? 'Copied' : 'Copy'}>
                      <ActionIcon variant="subtle" size="xs" onClick={copy}>
                        {copied ? <IconCheck size={12} /> : <IconCopy size={12} />}
                      </ActionIcon>
                    </Tooltip>
                  )}
                </CopyButton>
              </Group>
            </Box>
            <Box>
              <Text size="xs" c="dimmed" tt="uppercase" fw={500}>
                Started
              </Text>
              <Text size="sm">{new Date(run.startedAt).toLocaleString()}</Text>
            </Box>
            <Box>
              <Text size="xs" c="dimmed" tt="uppercase" fw={500}>
                Duration
              </Text>
              <Text size="sm">{formatDuration(run.startedAt, run.completedAt)}</Text>
            </Box>
            <Box>
              <Text size="xs" c="dimmed" tt="uppercase" fw={500}>
                Run ID
              </Text>
              <Group gap="xs">
                <Code fz="xs">{run.id.slice(0, 12)}...</Code>
                <CopyButton value={run.id}>
                  {({ copied, copy }) => (
                    <Tooltip label={copied ? 'Copied' : 'Copy'}>
                      <ActionIcon variant="subtle" size="xs" onClick={copy}>
                        {copied ? <IconCheck size={12} /> : <IconCopy size={12} />}
                      </ActionIcon>
                    </Tooltip>
                  )}
                </CopyButton>
              </Group>
            </Box>
          </SimpleGrid>
        </Card>

        {run.error && (
          <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light" title="Error">
            {run.error}
          </Alert>
        )}

        {/* Input / Output Section */}
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
          <Card withBorder padding="md">
            <Group justify="space-between" mb="sm">
              <Title order={5}>Input</Title>
              <CopyButton value={JSON.stringify(run.input, null, 2)}>
                {({ copied, copy }) => (
                  <Tooltip label={copied ? 'Copied' : 'Copy'}>
                    <ActionIcon variant="subtle" size="sm" onClick={copy}>
                      {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                    </ActionIcon>
                  </Tooltip>
                )}
              </CopyButton>
            </Group>
            <Paper p="xs" radius="sm" style={{ backgroundColor: 'var(--mantine-color-dark-7)' }}>
              <ScrollArea.Autosize mah={200}>
                <Code block style={{ backgroundColor: 'transparent' }}>
                  {JSON.stringify(run.input, null, 2)}
                </Code>
              </ScrollArea.Autosize>
            </Paper>
          </Card>

          <Card withBorder padding="md">
            <Group justify="space-between" mb="sm">
              <Title order={5}>Output</Title>
              {run.output && (
                <CopyButton value={JSON.stringify(run.output, null, 2)}>
                  {({ copied, copy }) => (
                    <Tooltip label={copied ? 'Copied' : 'Copy'}>
                      <ActionIcon variant="subtle" size="sm" onClick={copy}>
                        {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                      </ActionIcon>
                    </Tooltip>
                  )}
                </CopyButton>
              )}
            </Group>
            <Paper p="xs" radius="sm" style={{ backgroundColor: 'var(--mantine-color-dark-7)' }}>
              <ScrollArea.Autosize mah={200}>
                {run.output ? (
                  <Code block style={{ backgroundColor: 'transparent' }}>
                    {JSON.stringify(run.output, null, 2)}
                  </Code>
                ) : (
                  <Text size="sm" c="dimmed" ta="center" py="md">
                    No output yet
                  </Text>
                )}
              </ScrollArea.Autosize>
            </Paper>
          </Card>
        </SimpleGrid>

        {/* Node States Section */}
        <Card withBorder padding="md">
          <Title order={5} mb="md">
            Node Execution ({Object.keys(run.nodeStates).length} nodes)
          </Title>
          <Accordion variant="separated">
            {Object.entries(run.nodeStates).map(([nodeId, state]) => (
              <Accordion.Item key={nodeId} value={nodeId}>
                <Accordion.Control>
                  <Group gap="sm">
                    <Badge
                      size="sm"
                      color={nodeStatusColors[state.status]}
                      variant="light"
                      leftSection={
                        state.status === 'completed' ? <IconCheck size={10} /> :
                        state.status === 'failed' ? <IconX size={10} /> :
                        state.status === 'running' ? <IconPlayerPlay size={10} /> :
                        <IconClock size={10} />
                      }
                    >
                      {state.status}
                    </Badge>
                    <Text size="sm" fw={500}>{nodeId}</Text>
                    {state.completedAt && state.startedAt && (
                      <Badge size="xs" variant="outline" color="gray">
                        {formatDuration(state.startedAt, state.completedAt)}
                      </Badge>
                    )}
                  </Group>
                </Accordion.Control>
                <Accordion.Panel>
                  <Stack gap="sm">
                    {state.error && (
                      <Alert
                        icon={<IconAlertCircle size={14} />}
                        color="red"
                        variant="light"
                        p="xs"
                        title="Error"
                      >
                        <Text size="xs">{state.error}</Text>
                      </Alert>
                    )}
                    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                      {state.input !== undefined && (
                        <Paper p="xs" radius="sm" withBorder>
                          <Text size="xs" c="dimmed" fw={500} mb={4}>
                            INPUT
                          </Text>
                          <Code block style={{ fontSize: 11 }}>
                            {JSON.stringify(state.input, null, 2)}
                          </Code>
                        </Paper>
                      )}
                      {state.output !== undefined && (
                        <Paper p="xs" radius="sm" withBorder>
                          <Text size="xs" c="dimmed" fw={500} mb={4}>
                            OUTPUT
                          </Text>
                          <Code block style={{ fontSize: 11 }}>
                            {JSON.stringify(state.output, null, 2)}
                          </Code>
                        </Paper>
                      )}
                    </SimpleGrid>
                  </Stack>
                </Accordion.Panel>
              </Accordion.Item>
            ))}
          </Accordion>
        </Card>
      </Stack>
    </Modal>
  );
}
