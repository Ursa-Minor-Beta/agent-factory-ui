import { Group, Loader, Stack, Text } from '@mantine/core';
import { IconAlertTriangle, IconCheck, IconRobot, IconTool } from '@tabler/icons-react';
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

const formatDuration = (ms: number) => (ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`);

interface ToolCallRowProps {
  name: string;
  label?: string; // Overrides the label derived from name
  status: 'running' | 'completed' | 'failed';
  toolType?: 'builtin' | 'agent' | 'client';
  depth?: number;
  durationMs?: number;
  error?: string | string[];
}

// One server tool call; failed = error returned to the LLM - a warning, not a run failure
export function ToolCallRow({ name, label, status, toolType, depth = 0, durationMs, error }: ToolCallRowProps) {
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
      {(Array.isArray(error) ? error : error ? [error] : []).map((err) => (
        <Text key={err} size="xs" c="orange" pl={36} truncate title={err}>
          {err}
        </Text>
      ))}
    </Stack>
  );
}

// Tool calls of an answered message
export function MessageToolCalls({ toolCalls }: { toolCalls: MessageToolCall[] }) {
  if (!toolCalls.length) return null;
  return (
    <Stack gap={2} mb={4}>
      {toolCalls.map((call) => (
        <ToolCallRow key={call.id} name={call.name} label={call.label} status={call.status} error={call.error} />
      ))}
    </Stack>
  );
}
