import { useState, useCallback, useRef } from 'react';
import { Box, Button, TextInput, Textarea, Stack, Text, Alert, ScrollArea, Loader, Group, ActionIcon, Card, Switch } from '@mantine/core';
import { IconPlayerPlay, IconPlayerStop, IconAlertCircle, IconListDetails } from '@tabler/icons-react';
import { sessionsApi, type ChatStatusEvent } from '../../../api/sessions';
import type { Agent, InputSchema } from '../../../types';
import { getInputSchema } from '../../../pages/Chat/types';
import { useRunDetailsModal } from '../../RunDetailsModal';
import { MessageContent } from '../../../pages/Chat/ChatMessages';

interface RunTabProps {
  agent: Partial<Agent> | null;
  onRunStart?: () => void;
  onNodeStatus?: (nodeId: string, status: ChatStatusEvent['status']) => void;
  onRunEnd?: () => Promise<void>;
  onRunClear?: () => void;
}

const INPUTS_STORAGE_KEY = 'agent-editor-run-inputs';

const ANIMATE_STORAGE_KEY = 'agent-editor-run-animate';

interface RunOutput {
  response?: unknown; // Raw response - MessageContent will parse it
  error?: string;
  runId?: string;
  nodeStatuses: Array<{ nodeId: string; status: string; statusText?: string }>;
}

export function RunTab({ agent, onRunStart, onNodeStatus, onRunEnd, onRunClear }: RunTabProps) {
  // Last used inputs are remembered per agent
  const inputsStorageKey = agent?.id ? `${INPUTS_STORAGE_KEY}-${agent.id}` : null;
  const [inputs, setInputs] = useState<Record<string, string>>(() => {
    if (!inputsStorageKey) return {};
    try {
      return JSON.parse(localStorage.getItem(inputsStorageKey) || '{}');
    } catch {
      return {};
    }
  });
  const [animate, setAnimate] = useState(() => localStorage.getItem(ANIMATE_STORAGE_KEY) === 'true');
  // Ref so stream callbacks of an ongoing run see toggle changes
  const animateRef = useRef(animate);

  const handleAnimateChange = useCallback((value: boolean) => {
    setAnimate(value);
    animateRef.current = value;
    localStorage.setItem(ANIMATE_STORAGE_KEY, String(value));
    if (!value) onRunClear?.();
  }, [onRunClear]);
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState<RunOutput | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { openRunDetails } = useRunDetailsModal();

  // Use saved agent to get input schema (matches what backend will run)
  // Only call getInputSchema if agent has nodes (not a new unsaved agent)
  const inputSchema: InputSchema = agent?.nodes ? getInputSchema(agent as Agent) : {};
  const inputFields = Object.entries(inputSchema);

  const handleInputChange = useCallback((key: string, value: string) => {
    setInputs((prev) => {
      const next = { ...prev, [key]: value };
      if (inputsStorageKey) localStorage.setItem(inputsStorageKey, JSON.stringify(next));
      return next;
    });
  }, [inputsStorageKey]);

  const handleRun = useCallback(async () => {
    if (!agent?.id || running) return;

    setRunning(true);
    setOutput({ nodeStatuses: [] });
    if (animateRef.current) onRunStart?.();

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

    // Final response/error held back until the node animation finishes
    const result: Pick<RunOutput, 'response' | 'error'> = {};

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
            if (animateRef.current) onNodeStatus?.(data.nodeId, data.status);
          },
          onDone: (data) => {
            // Store raw response - MessageContent will handle parsing
            result.response = data.response;
          },
          onError: (data) => {
            result.error = data.message;
          },
        },
        abortController.signal
      );
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        // Cancelled by user
      } else {
        result.error = err instanceof Error ? err.message : 'Run failed';
      }
    } finally {
      abortControllerRef.current = null;
      if (animateRef.current) await onRunEnd?.();
      setOutput((prev) => ({ ...prev!, ...result }));
      setRunning(false);
    }
  }, [agent, running, inputs, inputSchema, onRunStart, onNodeStatus, onRunEnd]);

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

  if (!agent.id) {
    return (
      <Box p="xs">
        <Text size="sm" c="dimmed">Save agent first to run</Text>
      </Box>
    );
  }

  return (
    <Stack gap="sm" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Input fields */}
      <Card withBorder >
        {inputFields.length > 0 ? (
          <>
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
          </>
        ) : (
          <Text size="xs" c="dimmed">No input fields defined</Text>
        )}
        <Group justify="space-between" mb="xs" h="3rem">
          <Switch
            label="Animate run"
            size="xs"
            checked={animate}
            onChange={(e) => handleAnimateChange(e.currentTarget.checked)}
          />
          {animate && (
            <Button size="xs" variant="subtle" disabled={running} onClick={onRunClear}>
              Clear
            </Button>
          )}
        </Group>
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
      </Card>

      {/* Output area */}
      {output && (
        <Card style={{ flex: 1, minHeight: 0 }} withBorder>
          <Group mb="xs">
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
            <>
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
            </>
          </ScrollArea>
        </Card>
      )}
    </Stack>
  );
}
