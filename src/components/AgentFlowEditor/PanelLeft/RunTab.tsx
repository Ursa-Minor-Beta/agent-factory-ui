import { useState, useCallback, useRef } from 'react';
import { Box, Button, TextInput, Textarea, Stack, Text, Alert, ScrollArea, Loader, Group, ActionIcon, Card } from '@mantine/core';
import { IconPlayerPlay, IconPlayerStop, IconAlertCircle, IconListDetails } from '@tabler/icons-react';
import { sessionsApi, type ChatStatusEvent } from '../../../api/sessions';
import type { Agent, InputSchema } from '../../../types';
import { getInputSchema } from '../../../pages/Chat/types';
import { useRunDetailsModal } from '../../RunDetailsModal';
import { MessageContent } from '../../../pages/Chat/ChatMessages';

interface RunTabProps {
  agent: Agent | null;
  onNodeStatus?: (nodeId: string, status: string) => void;
}

interface RunOutput {
  response?: unknown; // Raw response - MessageContent will parse it
  error?: string;
  runId?: string;
  nodeStatuses: Array<{ nodeId: string; status: string; statusText?: string }>;
}

export function RunTab({ agent, onNodeStatus }: RunTabProps) {
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState<RunOutput | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { openRunDetails } = useRunDetailsModal();

  // Use saved agent to get input schema (matches what backend will run)
  const inputSchema: InputSchema = agent ? getInputSchema(agent) : {};
  const inputFields = Object.entries(inputSchema);

  const handleInputChange = useCallback((key: string, value: string) => {
    setInputs((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleRun = useCallback(async () => {
    if (!agent || running) return;

    setRunning(true);
    setOutput({ nodeStatuses: [] });

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // Build input object from form values (skip empty values)
    const input: Record<string, unknown> = {};
    for (const [key, schema] of Object.entries(inputSchema)) {
      const value = inputs[key];
      if (!value) continue; // Skip empty values

      if (schema.type === 'number') {
        input[key] = Number(value);
      } else if (schema.type === 'boolean') {
        input[key] = value === 'true';
      } else {
        input[key] = value;
      }
    }

    try {
      await sessionsApi.chatStream(
        agent.id,
        { input, incognito: true },
        {
          onInit: (data) => {
            setOutput((prev) => ({
              ...prev!,
              runId: data.runId,
            }));
          },
          onStatus: (data: ChatStatusEvent) => {
            setOutput((prev) => ({
              ...prev!,
              nodeStatuses: [
                ...(prev?.nodeStatuses || []),
                { nodeId: data.nodeId, status: data.status, statusText: data.statusText },
              ],
            }));
            onNodeStatus?.(data.nodeId, data.status);
          },
          onDone: (data) => {
            // Store raw response - MessageContent will handle parsing
            setOutput((prev) => ({
              ...prev!,
              response: data.response,
            }));
          },
          onError: (data) => {
            setOutput((prev) => ({
              ...prev!,
              error: data.message,
            }));
          },
        },
        abortController.signal
      );
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        // Cancelled by user
        return;
      }
      setOutput((prev) => ({
        ...prev!,
        error: err instanceof Error ? err.message : 'Run failed',
      }));
    } finally {
      setRunning(false);
      abortControllerRef.current = null;
    }
  }, [agent, running, inputs, inputSchema, onNodeStatus]);

  const handleStop = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  if (!agent) {
    return (
      <Box p="xs">
        <Text size="sm" c="dimmed">No agent loaded</Text>
      </Box>
    );
  }

  return (
    <Stack gap="sm" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Input fields */}
      {inputFields.length > 0 ? (
        <Card withBorder >
          <Text size="xs" fw={500}>Inputs</Text>
          {inputFields.map(([key, schema]) => {
            const label = key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim();
            const placeholder = schema.default ? `Default: ${schema.default}` : '';

            // Use Textarea for string types, TextInput for others
            if (schema.type === 'string') {
              return (
                <Textarea
                  key={key}
                  label={label}
                  placeholder={placeholder}
                  value={inputs[key] || ''}
                  onChange={(e) => handleInputChange(key, e.target.value)}
                  minRows={2}
                  maxRows={4}
                  size="xs"
                  mb="xs"
                />
              );
            }

            return (
              <TextInput
                key={key}
                label={label}
                placeholder={placeholder}
                value={inputs[key] || ''}
                onChange={(e) => handleInputChange(key, e.target.value)}
                size="xs"
                mb="xs"
              />
            );
          })}
        </Card>
      ) : (
        <Text size="xs" c="dimmed">No input fields defined</Text>
      )}

      {/* Run/Stop button */}
      {running ? (
        <Button
          leftSection={<IconPlayerStop size={16} />}
          color='dark'
          size="xs"
          onClick={handleStop}
        >
          Stop
        </Button>
      ) : (
        <Button
          leftSection={<IconPlayerPlay size={16} />}
          color="cyan"
          size="xs"
          onClick={handleRun}
        >
          Run
        </Button>
      )}

      {/* Output area */}
      {output && (
        <Card style={{ flex: 1, minHeight: 0 }} withBorder>
          <Group justify="space-between" mb="xs">
            <Text size="xs" fw={500}>Output</Text>
            {output.runId && !running && (
              <ActionIcon
                size="xs"
                variant="subtle"
                title="View run details"
                onClick={() => openRunDetails(output.runId!)}
              >
                <IconListDetails size={14} />
              </ActionIcon>
            )}
          </Group>
          <ScrollArea style={{ flex: 1 }} offsetScrollbars>
            {/* Node statuses */}
            {output.nodeStatuses.length > 0 && (
              <ScrollArea.Autosize mah={80} offsetScrollbars mb="xs" ps='xs' style={{ border: '1px solid var(--mantine-color-default-border)', borderRadius: 'var(--mantine-radius-sm)' }}>
                <Stack gap={2}>
                  {output.nodeStatuses.map((ns, i) => (
                    <Text key={i} size="xs" c="dimmed">
                      {ns.nodeId}: {ns.statusText || ns.status}
                    </Text>
                  ))}
                </Stack>
              </ScrollArea.Autosize>
            )}

            {/* Loading indicator */}
            {running && (
              <Box mb="xs">
                <Loader size="xs" />
              </Box>
            )}

            {/* Error */}
            {output.error && (
              <Alert icon={<IconAlertCircle size={14} />} color="red" fz="xs" mb="xs">
                {output.error}
              </Alert>
            )}

            {/* Response - MessageContent handles parsing and display */}
            {output.response && (
              <Card withBorder>
                  <MessageContent content={output.response} />
              </Card>
            )}
          </ScrollArea>
        </Card>
      )}
    </Stack>
  );
}
