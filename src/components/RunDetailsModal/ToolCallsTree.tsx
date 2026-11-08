import { Anchor, Box, Group, Text } from '@mantine/core';
import { IconCheck, IconX } from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import type { Run } from '../../types';
import { formatDuration } from '../../types';
import { buildRunDetailsSearch } from './useRunDetailsModal';
import { ChildRunsTree } from './ChildRunsTree';

type Trail = Parameters<typeof buildRunDetailsSearch>[1];

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

/**
 * Pairs tool calls with the child runs they started, in call order (by tool name).
 * Returns the run per call index and the child runs left unmatched.
 */
export function matchToolCallRuns(calls: ToolCallEntry[], runs: Run[]) {
  const remaining = [...runs];
  const matched = calls.map((call) => {
    const idx = remaining.findIndex((r) => r.triggeredBy?.toolName === call.name);
    return idx === -1 ? undefined : remaining.splice(idx, 1)[0];
  });
  return { matched, unmatched: remaining };
}

interface ToolCallsTreeProps {
  calls: ToolCallEntry[];
  // Child runs started by these calls - matching rows link to the run
  childRuns?: (Run | undefined)[];
  trail?: Trail;
  depth?: number;
}

/** Compact tree of tool calls, shown in the folded node header. */
export function ToolCallsTree({ calls, childRuns, trail = [], depth = 0 }: ToolCallsTreeProps) {
  return (
    <Box mt={depth === 0 ? 4 : 0} ml={depth === 0 ? 26 : 16}>
      {calls.map((call, i) => {
        const last = i === calls.length - 1;
        const nested = getToolCalls(call.result);
        const failed = isFailed(call.result);
        const child = childRuns?.[i];
        return (
          <Box key={i}>
            <Group gap={4} wrap="nowrap">
              <Text size="xs" c="dimmed" ff="monospace">{last ? '└─' : '├─'}</Text>
              {child ? (
                <Anchor
                  component={Link}
                  to={buildRunDetailsSearch(child.id, trail)}
                  size="xs"
                  ff="monospace"
                  truncate
                  // Inside the accordion control - don't toggle the node
                  onClick={(e: React.MouseEvent) => e.stopPropagation()}
                >
                  {call.name}
                </Anchor>
              ) : (
                <Text size="xs" ff="monospace" truncate>{call.name}</Text>
              )}
              {call.result !== undefined &&
                (failed ? (
                  <IconX size={12} color="var(--mantine-color-red-6)" />
                ) : (
                  <IconCheck size={12} color="var(--mantine-color-green-6)" />
                ))}
              {child && (
                <Text size="xs" c="dimmed">{formatDuration(child.startedAt, child.completedAt)}</Text>
              )}
            </Group>
            {nested && <ToolCallsTree calls={nested} depth={depth + 1} />}
            {!nested && !!child?.childRuns?.length && (
              <ChildRunsTree
                runs={child.childRuns}
                trail={[...trail, { id: child.id, name: child.agentName || child.agentId }]}
                depth={depth + 1}
              />
            )}
          </Box>
        );
      })}
    </Box>
  );
}
