import { useState, useEffect, useMemo } from 'react';
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
  Loader,
  Center,
} from '@mantine/core';
import {
  IconAlertCircle,
  IconClock,
  IconCheck,
  IconX,
  IconPlayerPlay,
  IconCopy,
  IconRefresh,
} from '@tabler/icons-react';
import { runsApi } from '../api';
import type { Run, RunDetailsModalProps } from '../types';
import { statusColors, nodeStatusColors, formatDuration, resolveRunOutput, extractInnerFileRefs } from '../types';
import { FileRefPreview } from '../pages/Chat/ChatMessages/FileContent';

// Helper to render JSON data, extracting file refs for separate display
function DataWithFileRefs({ data }: { data: unknown }) {
  const fileRefs = useMemo(() => {
    if (!data) return [];
    return extractInnerFileRefs(data);
  }, [data]);

  // Create a cleaned version of data with file refs replaced by placeholders
  const cleanedData = useMemo(() => {
    if (!data || fileRefs.length === 0) return data;

    const replaceRefs = (obj: unknown): unknown => {
      if (typeof obj === 'string' && obj.startsWith('inner:')) {
        return '[File Reference]';
      }
      if (Array.isArray(obj)) {
        return obj.map(replaceRefs);
      }
      if (typeof obj === 'object' && obj !== null) {
        const result: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(obj)) {
          result[key] = replaceRefs(value);
        }
        return result;
      }
      return obj;
    };

    return replaceRefs(data);
  }, [data, fileRefs.length]);

  if (!data) {
    return (
      <Text size="sm" c="dimmed" ta="center" py="md">
        No data
      </Text>
    );
  }

  return (
    <>
      <Code block style={{ backgroundColor: 'transparent' }}>
        {JSON.stringify(cleanedData, null, 2)}
      </Code>
      {fileRefs.length > 0 && (
        <Box mt="sm">
          <Text size="xs" c="dimmed" mb="xs">Files ({fileRefs.length})</Text>
          <FileRefPreview
            fileRefs={fileRefs.map((ref) => ({
              fileId: ref.fileId,
              mimeType: guessMimeType(ref.fieldName),
              fieldName: ref.path || ref.fieldName,
            }))}
          />
        </Box>
      )}
    </>
  );
}

// Guess mime type from field name
function guessMimeType(fieldName: string): string {
  const lower = fieldName.toLowerCase();
  if (lower.includes('screenshot') || lower.includes('image') || lower.includes('png')) {
    return 'image/png';
  }
  if (lower.includes('jpg') || lower.includes('jpeg') || lower.includes('photo')) {
    return 'image/jpeg';
  }
  if (lower.includes('pdf')) {
    return 'application/pdf';
  }
  return 'application/octet-stream';
}

export function RunDetailsModal({ run: initialRun, opened, onClose }: RunDetailsModalProps) {
  const [run, setRun] = useState<Run | null>(initialRun);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setRun(initialRun);
  }, [initialRun]);

  // Resolve nodeRef references in output
  const resolvedOutput = useMemo(() => {
    if (!run) return null;
    return resolveRunOutput(run);
  }, [run]);

  const handleRefresh = async () => {
    if (!run) return;
    try {
      setLoading(true);
      const data = await runsApi.getById(run.id);
      setRun(data);
    } catch {
      // Keep existing data on error
    } finally {
      setLoading(false);
    }
  };

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
          {(run.status === 'pending' || run.status === 'running' || run.status === 'cancelling') && (
            <Tooltip label="Refresh">
              <ActionIcon variant="subtle" size="sm" onClick={handleRefresh} loading={loading}>
                <IconRefresh size={16} />
              </ActionIcon>
            </Tooltip>
          )}
          <CopyButton value={JSON.stringify(run, null, 2)}>
            {({ copied, copy }) => (
              <Tooltip label={copied ? 'Copied' : 'Copy entire run'}>
                <ActionIcon variant="subtle" size="sm" onClick={copy}>
                  {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                </ActionIcon>
              </Tooltip>
            )}
          </CopyButton>
        </Group>
      }
      fullScreen
    >
      {loading ? (
        <Center py="xl">
          <Loader />
        </Center>
      ) : (
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
            <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light" title={
              <Group gap="xs">
                <Text>Error</Text>
                <CopyButton value={run.error}>
                  {({ copied, copy }) => (
                    <Tooltip label={copied ? 'Copied' : 'Copy error'}>
                      <ActionIcon variant="subtle" size="xs" color="red" onClick={copy}>
                        {copied ? <IconCheck size={12} /> : <IconCopy size={12} />}
                      </ActionIcon>
                    </Tooltip>
                  )}
                </CopyButton>
              </Group>
            }>
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
                {resolvedOutput && Object.keys(resolvedOutput).length > 0 && (
                  <CopyButton value={JSON.stringify(resolvedOutput, null, 2)}>
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
                <ScrollArea.Autosize mah={300}>
                  {resolvedOutput && Object.keys(resolvedOutput).length > 0 ? (
                    <DataWithFileRefs data={resolvedOutput} />
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
                          title={
                            <Group gap="xs">
                              <Text size="xs">Error</Text>
                              <CopyButton value={state.error}>
                                {({ copied, copy }) => (
                                  <Tooltip label={copied ? 'Copied' : 'Copy error'}>
                                    <ActionIcon variant="subtle" size="xs" color="red" onClick={copy}>
                                      {copied ? <IconCheck size={10} /> : <IconCopy size={10} />}
                                    </ActionIcon>
                                  </Tooltip>
                                )}
                              </CopyButton>
                            </Group>
                          }
                        >
                          <Text size="xs">{state.error}</Text>
                        </Alert>
                      )}
                      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                        {state.input !== undefined && (
                          <Paper p="xs" radius="sm" withBorder>
                            <Group justify="space-between" mb={4}>
                              <Text size="xs" c="dimmed" fw={500}>INPUT</Text>
                              <CopyButton value={JSON.stringify(state.input, null, 2)}>
                                {({ copied, copy }) => (
                                  <Tooltip label={copied ? 'Copied' : 'Copy'}>
                                    <ActionIcon variant="subtle" size="xs" onClick={copy}>
                                      {copied ? <IconCheck size={12} /> : <IconCopy size={12} />}
                                    </ActionIcon>
                                  </Tooltip>
                                )}
                              </CopyButton>
                            </Group>
                            <ScrollArea.Autosize mah={200}>
                              <DataWithFileRefs data={state.input} />
                            </ScrollArea.Autosize>
                          </Paper>
                        )}
                        {state.output !== undefined && (
                          <Paper p="xs" radius="sm" withBorder>
                            <Group justify="space-between" mb={4}>
                              <Text size="xs" c="dimmed" fw={500}>OUTPUT</Text>
                              <CopyButton value={JSON.stringify(state.output, null, 2)}>
                                {({ copied, copy }) => (
                                  <Tooltip label={copied ? 'Copied' : 'Copy'}>
                                    <ActionIcon variant="subtle" size="xs" onClick={copy}>
                                      {copied ? <IconCheck size={12} /> : <IconCopy size={12} />}
                                    </ActionIcon>
                                  </Tooltip>
                                )}
                              </CopyButton>
                            </Group>
                            <ScrollArea.Autosize mah={200}>
                              <DataWithFileRefs data={state.output} />
                            </ScrollArea.Autosize>
                          </Paper>
                        )}
                      </SimpleGrid>
                      {state.state !== undefined && (
                        <Paper p="xs" radius="sm" withBorder mt="sm">
                          <Group justify="space-between" mb={4}>
                            <Text size="xs" c="dimmed" fw={500}>STATE</Text>
                            <CopyButton value={JSON.stringify(state.state, null, 2)}>
                              {({ copied, copy }) => (
                                <Tooltip label={copied ? 'Copied' : 'Copy'}>
                                  <ActionIcon variant="subtle" size="xs" onClick={copy}>
                                    {copied ? <IconCheck size={12} /> : <IconCopy size={12} />}
                                  </ActionIcon>
                                </Tooltip>
                              )}
                            </CopyButton>
                          </Group>
                          <ScrollArea.Autosize mah={200}>
                            <DataWithFileRefs data={state.state} />
                          </ScrollArea.Autosize>
                        </Paper>
                      )}
                    </Stack>
                  </Accordion.Panel>
                </Accordion.Item>
              ))}
            </Accordion>
          </Card>
        </Stack>
      )}
    </Modal>
  );
}
