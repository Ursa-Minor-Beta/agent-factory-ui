import { Box, Group, Text } from '@mantine/core';
import { IconCheck, IconX } from '@tabler/icons-react';

export interface ToolCallEntry {
  name: string;
  input?: unknown;
  result?: unknown;
}

/** Extracts `toolCalls` array from an LLM node output, if present. */
export function getToolCalls(output: unknown): ToolCallEntry[] | null {
  if (!output || typeof output !== 'object') return null;
  const calls = (output as { toolCalls?: unknown }).toolCalls;
  if (!Array.isArray(calls) || calls.length === 0) return null;
  return calls.filter((c): c is ToolCallEntry => !!c && typeof c === 'object' && 'name' in c);
}

function isFailed(result: unknown): boolean {
  if (!result || typeof result !== 'object') return false;
  const r = result as Record<string, unknown>;
  return r.ok === false || typeof r.error === 'string';
}

/** Compact tree of tool calls, shown in the folded node header. */
export function ToolCallsTree({ calls, depth = 0 }: { calls: ToolCallEntry[]; depth?: number }) {
  return (
    <Box mt={depth === 0 ? 4 : 0} ml={depth === 0 ? 26 : 16}>
      {calls.map((call, i) => {
        const last = i === calls.length - 1;
        const nested = getToolCalls(call.result);
        const failed = isFailed(call.result);
        return (
          <Box key={i}>
            <Group gap={4} wrap="nowrap">
              <Text size="xs" c="dimmed" ff="monospace">{last ? '└─' : '├─'}</Text>
              <Text size="xs" ff="monospace" truncate>{call.name}</Text>
              {call.result !== undefined &&
                (failed ? (
                  <IconX size={12} color="var(--mantine-color-red-6)" />
                ) : (
                  <IconCheck size={12} color="var(--mantine-color-green-6)" />
                ))}
            </Group>
            {nested && <ToolCallsTree calls={nested} depth={depth + 1} />}
          </Box>
        );
      })}
    </Box>
  );
}
