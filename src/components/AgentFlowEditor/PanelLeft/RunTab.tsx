import { useState, useCallback, useRef, useEffect, type RefObject } from 'react';
import { Box, Button, Stack, Text, ScrollArea, Group, ActionIcon, Card, Switch, Slider, Collapse } from '@mantine/core';
import { useLocalStorage } from '@mantine/hooks';
import { IconPlayerPlay, IconPlayerStop, IconListDetails, IconChevronDown, IconChevronUp } from '@tabler/icons-react';
import type { ChatStatusEvent } from '../../../api/sessions';
import type { Agent, InputSchema, NodeStatus } from '../../../types';
import { getInputSchema } from '../../../pages/Chat/types';
import { AgentInputField } from '../../../pages/Chat/AgentInputField';
import { buildAgentInput, hasMissingRequired } from '../../../pages/Chat/models/agentInput';
import { useRunDetailsModal } from '../../RunDetailsModal';
import { MessageContent } from '../../../pages/Chat/ChatMessages';
import { useChatFavicon } from '../../../pages/Chat/useChatFavicon';
import { useAgentStream, RunStatus, RunSteps, RunErrorAlert } from '../../AgentStream';
import type { AgentStreamResult } from '../../AgentStream/useAgentStream';

interface RunTabProps {
  agent: Partial<Agent> | null;
  onRunStart?: () => void;
  onNodeStatus?: (nodeId: string, status: ChatStatusEvent['status'], minRunningMs: number) => void;
  onRunEnd?: () => void;
  onRunClear?: () => void;
  runRequest?: number; // Incremented by the editor toolbar Run button to start a run from outside
  onInputsRequired?: () => void; // Required inputs are empty - editor shows this tab
  onRunningChange?: (running: boolean) => void;
  onAgentStatusesChange?: (statuses: Record<string, NodeStatus>) => void; // Run status per agent: this one + called sub-agents
  runnerRef?: RefObject<AgentRunner | null>; // Set to this tab's run function - lets the assistant run the agent here
}

// Runs the agent with the given input (form values when omitted); null when it can't start
export type AgentRunner = (input?: Record<string, unknown>) => Promise<AgentStreamResult | null>;

const INPUTS_STORAGE_KEY = 'agent-editor-run-inputs';

const ANIMATE_STORAGE_KEY = 'agent-editor-run-animate';
const SPEED_STORAGE_KEY = 'agent-editor-run-speed';
const INPUTS_OPEN_STORAGE_KEY = 'agent-editor-run-inputs-open';

// Min time each executed node is shown as "running" during the animation
const MIN_RUNNING_MS = 50;
const MAX_RUNNING_MS = 2000;
const DEFAULT_RUNNING_MS = 400;

export function RunTab({ agent, onRunStart, onNodeStatus, onRunEnd, onRunClear, runRequest, onInputsRequired, onRunningChange, onAgentStatusesChange, runnerRef }: RunTabProps) {
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
  // Tab stays mounted when the editor switches agents - load that agent's remembered inputs
  useEffect(() => {
    try {
      setInputs(inputsStorageKey ? JSON.parse(localStorage.getItem(inputsStorageKey) || '{}') : {});
    } catch {
      setInputs({});
    }
  }, [inputsStorageKey]);
  const [inputsOpen, setInputsOpen] = useLocalStorage({ key: INPUTS_OPEN_STORAGE_KEY, defaultValue: true, getInitialValueInEffect: false });
  const toggleInputsOpen = () => setInputsOpen((prev) => !prev);

  const [animate, setAnimate] = useLocalStorage({ key: ANIMATE_STORAGE_KEY, defaultValue: false, getInitialValueInEffect: false });
  // Ref so stream callbacks of an ongoing run see toggle changes
  const animateRef = useRef(animate);
  animateRef.current = animate;

  const handleAnimateChange = (value: boolean) => {
    setAnimate(value);
    if (!value) onRunClear?.();
  };

  const [storedRunningMs, setRunningMs] = useLocalStorage({ key: SPEED_STORAGE_KEY, defaultValue: DEFAULT_RUNNING_MS, getInitialValueInEffect: false });
  const runningMs = storedRunningMs >= MIN_RUNNING_MS && storedRunningMs <= MAX_RUNNING_MS ? storedRunningMs : DEFAULT_RUNNING_MS;
  // Ref so speed changes apply to an ongoing run
  const runningMsRef = useRef(runningMs);
  runningMsRef.current = runningMs;
  const stream = useAgentStream();
  const { running, start: startStream, cancel: handleStop } = stream;
  useChatFavicon(running);
  // Raw response - MessageContent will parse it
  const [response, setResponse] = useState<string>();
  // Sub-agent id -> its nodes that started and haven't finished yet, and whether any node failed
  const subagentsRef = useRef(new Map<string, { nodes: Set<string>; failed: boolean }>());
  const [agentStatuses, setAgentStatuses] = useState<Record<string, NodeStatus>>({});
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

  const handleRun = useCallback(async (inputOverride?: Record<string, unknown>): Promise<AgentStreamResult | null> => {
    if (!agent?.id || running) return null;

    setResponse(undefined);
    subagentsRef.current.clear();
    setAgentStatuses({ [agent.id]: 'running' });
    if (animateRef.current) onRunStart?.();

    // Explicit input (assistant run) - show it in the form too, so the user sees what ran
    if (inputOverride) {
      const formValues = Object.fromEntries(
        Object.entries(inputOverride).map(([key, value]) => [key, typeof value === 'string' ? value : JSON.stringify(value)])
      );
      setInputs(formValues);
      if (inputsStorageKey) localStorage.setItem(inputsStorageKey, JSON.stringify(formValues));
    }

    const input = inputOverride ?? buildAgentInput(inputSchema, inputs);

    const result = await startStream(
      agent.id,
      { input, incognito: true },
      {
        onStatus: (data: ChatStatusEvent) => {
          if (animateRef.current) onNodeStatus?.(data.nodeId, data.status, runningMsRef.current);
        },
        onSubagentStatus: (data) => {
          // Sub-agent runs while any of its nodes runs
          const sub = subagentsRef.current.get(data.agentId) ?? { nodes: new Set<string>(), failed: false };
          if (data.status === 'started') sub.nodes.add(data.nodeId);
          else sub.nodes.delete(data.nodeId);
          if (data.status === 'failed') sub.failed = true;
          subagentsRef.current.set(data.agentId, sub);
          const subStatus: NodeStatus = sub.nodes.size > 0 ? 'running' : sub.failed ? 'failed' : 'completed';
          setAgentStatuses((prev) => (prev[data.agentId] === subStatus ? prev : { ...prev, [data.agentId]: subStatus }));
        },
      }
    );

    if (animateRef.current) onRunEnd?.();
    setResponse(result.response);
    // Settle everything still running (stopped / failed run)
    const endStatus: NodeStatus = result.error ? 'failed' : 'completed';
    setAgentStatuses((prev) => Object.fromEntries(
      Object.entries(prev).map(([id, status]) => [id, status === 'running' || id === agent.id ? endStatus : status])
    ));
    return result;
  }, [agent, running, inputs, inputSchema, inputsStorageKey, startStream, onRunStart, onNodeStatus, onRunEnd]);

  if (runnerRef) runnerRef.current = handleRun;

  useEffect(() => {
    onRunningChange?.(running);
  }, [running, onRunningChange]);

  // Statuses belong to the agent that ran - drop them when the editor switches agents
  useEffect(() => {
    setAgentStatuses({});
  }, [agent?.id]);

  useEffect(() => {
    onAgentStatusesChange?.(agentStatuses);
  }, [agentStatuses, onAgentStatusesChange]);

  // Toolbar Run: run if every required input has a value (or default), otherwise ask to show this tab
  const handleRunRef = useRef(handleRun);
  handleRunRef.current = handleRun;
  const missingRequired = hasMissingRequired(inputSchema, inputs);
  const missingRequiredRef = useRef(missingRequired);
  missingRequiredRef.current = missingRequired;
  useEffect(() => {
    if (!runRequest) return;
    if (missingRequiredRef.current) {
      setInputsOpen(true);
      onInputsRequired?.();
      return;
    }
    handleRunRef.current();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- react to new run requests only
  }, [runRequest]);

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
            <Group gap={4} mb="xs" onClick={toggleInputsOpen} style={{ cursor: 'pointer', userSelect: 'none' }}>
              {inputsOpen ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
              <Text size="xs" fw={500}>Inputs</Text>
              {!inputsOpen && <Text size="xs" c="dimmed">({inputFields.length})</Text>}
            </Group>
            <Collapse expanded={inputsOpen}>
            {inputFields.map(([key, schema]) => (
              <AgentInputField
                key={key}
                fieldKey={key}
                schema={schema}
                value={inputs[key] || ''}
                onChange={handleInputChange}
                minRows={schema.type === 'string' ? 2 : 1}
                maxRows={12}
                size="xs"
                mb="xs"
              />
            ))}
            </Collapse>
          </>
        ) : (
          <Text size="xs" c="dimmed">No input fields defined</Text>
        )}
        <Group justify="space-between" mb="xs" h="2rem">
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
        {animate && (
          <Group gap="xs" mb="md" wrap="nowrap">
            <Text size="xs" c="dimmed">Slow</Text>
            {/* Value mirrored so right = faster = shorter running time, keeping default fill style */}
            <Slider
              size="xs"
              style={{ flex: 1 }}
              min={MIN_RUNNING_MS}
              max={MAX_RUNNING_MS}
              step={50}
              value={MIN_RUNNING_MS + MAX_RUNNING_MS - runningMs}
              onChange={(value) => setRunningMs(MIN_RUNNING_MS + MAX_RUNNING_MS - value)}
              label={(value) => `${MIN_RUNNING_MS + MAX_RUNNING_MS - value} ms / node`}
            />
            <Text size="xs" c="dimmed">Fast</Text>
          </Group>
        )}
        {/* Run/Stop button */}
        {running ? (
          <Button
            leftSection={<IconPlayerStop size={16} />}
            color='dark'
            size="xs"
            miw={200}
            style={{ alignSelf: 'center' }}
            onClick={handleStop}
          >
            Stop
          </Button>
        ) : (
          <Button
            leftSection={<IconPlayerPlay size={16} />}
            color="cyan"
            size="xs"
            miw={200}
            style={{ alignSelf: 'center' }}
            onClick={() => handleRun()}
          >
            Run
          </Button>
        )}
      </Card>

      {/* Output area */}
      {(running || stream.runId || stream.error || response) && (
        <Card style={{ flex: 1, minHeight: 0 }} withBorder>
          <Group mb="xs">
            <Text size="xs" fw={500}>Output</Text>
            {stream.runId && (
              <ActionIcon
                size="xs"
                variant="subtle"
                title="View run details"
                onClick={() => openRunDetails(stream.runId!)}
              >
                <IconListDetails size={14} />
              </ActionIcon>
            )}
          </Group>
          <ScrollArea style={{ flex: 1 }} offsetScrollbars scrollbars="y" styles={{ content: { display: 'block' } }}>
            <>
              {/* Node statuses */}
              {!animate && <RunSteps steps={stream.steps} />}

              {/* Loading indicator */}
              {running && <RunStatus statusText={stream.statusText} mb="xs" />}

              {/* Error */}
              {stream.error && <RunErrorAlert error={stream.error} size="xs" mb="xs" />}

              {/* Response - MessageContent handles parsing and display */}
              {response && (
                <Card withBorder>
                    <MessageContent content={response} />
                </Card>
              )}
            </>
          </ScrollArea>
        </Card>
      )}
    </Stack>
  );
}
