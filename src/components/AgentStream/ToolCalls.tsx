import { useState, type CSSProperties } from 'react';
import { Box, Collapse, Group, Loader, Stack, Text, Timeline, UnstyledButton } from '@mantine/core';
import { useLocalStorage } from '@mantine/hooks';
import { IconAlertCircle, IconAlertTriangle, IconCheck, IconChevronDown, IconChevronRight, IconCircleCheck, IconRobot, IconTool } from '@tabler/icons-react';
import classes from './ToolCallTimeline.module.css';
import type { MessageToolCall } from '../../types';

// Known tools: [running, done] labels
const TOOL_LABELS: Record<string, [string, string]> = {
  save_memory: ['Saving to memory', 'Saved to memory'],
  get_memory: ['Reading memory', 'Read memory'],
};

// "save_memory" -> "Save memory"
const humanize = (name: string) => {
  const words = name.replace(/[_-]+/g, ' ').trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

export function toolLabel(name: string, running = false) {
  const labels = TOOL_LABELS[name];
  if (running) return `${labels?.[0] ?? humanize(name)}...`;
  return labels?.[1] ?? humanize(name);
}

// { query: "x", limit: 5 } -> 'query: "x", limit: 5'
export const formatArgs = (args: Record<string, unknown>) =>
  Object.entries(args)
    .map(([key, value]) => `${key}: ${JSON.stringify(value) ?? String(value)}`)
    .join(', ');

export const formatDuration = (ms: number) => (ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`);

interface ToolCallRowProps {
  name: string;
  label?: string; // Overrides the label derived from name
  status: 'running' | 'completed' | 'failed';
  toolType?: 'builtin' | 'agent' | 'client';
  depth?: number;
  args?: Record<string, unknown>;
  durationMs?: number;
  error?: string | string[];
}

// One server tool call; failed = error returned to the LLM - a warning, not a run failure
export function ToolCallRow({ name, label, status, toolType, depth = 0, args, durationMs, error }: ToolCallRowProps) {
  const ToolIcon = toolType === 'agent' ? IconRobot : IconTool;
  return (
    <Stack gap={0} pl={depth * 12}>
      <Group gap={6} wrap="nowrap">
        {status === 'running' ? (
          <Loader size={10} />
        ) : status === 'failed' ? (
          <IconAlertTriangle size={12} color="var(--mantine-color-orange-5)" />
        ) : (
          <IconCheck size={12} color="var(--mantine-color-green-5)" />
        )}
        <ToolIcon size={12} color="var(--mantine-color-dimmed)" />
        <Text size="xs" c="dimmed" truncate style={{ flex: 1 }}>
          {label ?? toolLabel(name, status === 'running')}
        </Text>
        {durationMs !== undefined && (
          <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
            {formatDuration(durationMs)}
          </Text>
        )}
      </Group>
      {args && Object.keys(args).length > 0 && (
        <Text size="xs" c="dimmed" ff="monospace" pl={36} truncate title={JSON.stringify(args, null, 2)}>
          {formatArgs(args)}
        </Text>
      )}
      {(Array.isArray(error) ? error : error ? [error] : []).map((err) => (
        <Text key={err} size="xs" c="orange" pl={36} truncate title={err}>
          {err}
        </Text>
      ))}
    </Stack>
  );
}

export interface TimelineToolCall {
  id: string;
  name: string;
  label?: string; // Overrides the label derived from name once finished
  status: 'running' | 'completed' | 'failed';
  args?: Record<string, unknown>;
  depth?: number;
  durationMs?: number;
  error?: string | string[];
}

const STATUS_COLORS = { running: 'cyan', completed: 'green', failed: 'orange' } as const;

// "11 tools: 10 succeeded, 1 failed"
const summarize = (calls: TimelineToolCall[]) => {
  const count = (status: TimelineToolCall['status']) => calls.filter((call) => call.status === status).length;
  const parts = [
    [count('running'), 'running'],
    [count('completed'), 'succeeded'],
    [count('failed'), 'failed'],
  ].flatMap(([n, word]) => (n ? [`${n} ${word}`] : []));
  return `${calls.length} ${calls.length === 1 ? 'tool' : 'tools'}: ${parts.join(', ')}`;
};

// Shown/hidden per tool call list, keyed by its first call id (same id live and once answered) - lost on refresh
const expandedLists = new Map<string, boolean>();

// Tool calls as a collapsible vertical timeline: outline bullet = status, title = tool, args and errors below.
// Live run opens with the last choice; the answered message keeps the run's state; older messages start hidden
export function ToolCallTimeline({ calls, live = false }: { calls: TimelineToolCall[]; live?: boolean }) {
  const [lastChoice, setLastChoice] = useLocalStorage({
    key: 'tool-calls-expanded',
    defaultValue: false,
    getInitialValueInEffect: false,
  });
  const key = calls[0]?.id ?? '';
  const [expanded, setExpanded] = useState(() => expandedLists.get(key) ?? (live && lastChoice));
  if (live && !expandedLists.has(key)) expandedLists.set(key, expanded);

  const toggle = () => {
    expandedLists.set(key, !expanded);
    setLastChoice(!expanded);
    setExpanded(!expanded);
  };

  const Chevron = expanded ? IconChevronDown : IconChevronRight;
  return (
    <Stack gap={6} mb="md">
      <UnstyledButton onClick={toggle} title={expanded ? 'Hide tool calls' : 'Show tool calls'}>
        <Group gap={4} wrap="nowrap">
          <Chevron size={12} color="var(--mantine-color-dimmed)" />
          <Text size="xs" c="dimmed" truncate>
            {summarize(calls)}
          </Text>
        </Group>
      </UnstyledButton>
      <Collapse expanded={expanded}>
        <ToolCallTree nodes={buildTree(calls)} />
      </Collapse>
    </Stack>
  );
}

interface ToolCallNode extends TimelineToolCall {
  children: ToolCallNode[];
}

// Flat pre-order list with depth -> tree (a call's children follow it with depth + 1)
const buildTree = (calls: TimelineToolCall[]) => {
  const roots: ToolCallNode[] = [];
  const stack: ToolCallNode[] = [];
  for (const call of calls) {
    const node = { ...call, children: [] };
    const depth = call.depth ?? 0;
    stack.length = Math.min(stack.length, depth);
    (stack[stack.length - 1]?.children ?? roots).push(node);
    stack.push(node);
  }
  return roots;
};

// Children render as a nested timeline inside the parent item, so the parent's line spans its whole subtree
function ToolCallTree({ nodes }: { nodes: ToolCallNode[] }) {
  return (
    <Timeline bulletSize={16} lineWidth={1} classNames={{ item: classes.item, itemBullet: classes.itemBullet }}>
          {nodes.map(({ id, name, label, status, args, durationMs, error, children }) => {
            const running = status === 'running';
            const errors = Array.isArray(error) ? error : error ? [error] : [];
            return (
              <Timeline.Item
                key={id}
                style={{ '--item-color': `var(--mantine-color-${STATUS_COLORS[status]}-5)` } as CSSProperties}
                bullet={
                  running ? <span className={classes.orbit} />
                    : status === 'failed' ? <IconAlertCircle size={16} stroke={1.5} />
                    : <IconCircleCheck size={16} stroke={1.5} />
                }
                title={
                  <Group gap={6} wrap="nowrap">
                    <Text size="xs" truncate style={{ flex: 1 }}>
                      {(!running && label) || toolLabel(name, running)}
                    </Text>
                    {durationMs !== undefined && (
                      <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
                        {formatDuration(durationMs)}
                      </Text>
                    )}
                  </Group>
                }
              >
                {args && Object.keys(args).length > 0 && (
                  <Text size="xs" c="dimmed" ff="monospace" truncate title={JSON.stringify(args, null, 2)}>
                    {formatArgs(args)}
                  </Text>
                )}
                {errors.map((err) => (
                  <Text key={err} size="xs" c="orange" truncate title={err}>
                    {err}
                  </Text>
                ))}
                {children.length > 0 && (
                  <Box mt="sm">
                    <ToolCallTree nodes={children} />
                  </Box>
                )}
              </Timeline.Item>
            );
          })}
    </Timeline>
  );
}

// Tool calls of an answered message
export function MessageToolCalls({ toolCalls }: { toolCalls: MessageToolCall[] }) {
  if (!toolCalls.length) return null;
  return (
    <Box mb={4}>
      <ToolCallTimeline calls={toolCalls} />
    </Box>
  );
}
