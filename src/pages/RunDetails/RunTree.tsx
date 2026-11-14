import { Box, Group, Text, UnstyledButton } from '@mantine/core';
import { NodeTypeIcon } from '../../nodes';
import type { Run } from '../../types';
import { formatDuration, statusColors } from '../../types';
import { IconChevronDown, IconChevronRight, IconRobot } from '@tabler/icons-react';
import { RunStatusBadge, getNodeChildRuns } from '../../components/RunDetailsModal';

/** Selection key: "<runId>" for a run, "<runId>/<nodeId>" for a node */
export const nodeKey = (runId: string, nodeId: string) => `${runId}/${nodeId}`;

export function parseSelection(select: string | null, rootId: string) {
  const [runId, ...rest] = (select || rootId).split('/');
  return { runId, nodeId: rest.length ? rest.join('/') : null };
}

export function findRun(run: Run, id: string): Run | null {
  if (run.id === id) return run;
  for (const child of run.childRuns ?? []) {
    const found = findRun(child, id);
    if (found) return found;
  }
  return null;
}

// Started first, not started last
const byStart = (a?: string | null, b?: string | null) => {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return new Date(a).getTime() - new Date(b).getTime();
};

// Time colored by unit: ms - green, s - yellow, m - orange
function Duration({ startedAt, completedAt }: { startedAt: string; completedAt?: string | null }) {
  const ms = (completedAt ? new Date(completedAt).getTime() : Date.now()) - new Date(startedAt).getTime();
  const color = ms < 1000 ? 'green' : ms < 60000 ? 'yellow' : 'orange';
  return (
    <Text size="xs" c={`${color}.5`} ml="auto" style={{ flexShrink: 0 }}>
      {formatDuration(startedAt, completedAt)}
    </Text>
  );
}

interface RowProps {
  label: React.ReactNode;
  depth: number;
  selected: boolean;
  onClick: () => void;
  // Run rows are headers: tinted background + left border in the status color
  headerColor?: string;
}

function Row({ label, depth, selected, onClick, headerColor }: RowProps) {
  const indent = 8 + depth * 16;
  return (
    <UnstyledButton
      onClick={onClick}
      w={`calc(100% - ${headerColor ? indent - 8 : 0}px)`}
      ml={headerColor ? indent - 8 : 0}
      mt={headerColor && depth > 0 ? 4 : 0}
      py={headerColor ? 6 : 3}
      pr="xs"
      pl={headerColor ? 8 : indent}
      style={{
        borderRadius: 'var(--mantine-radius-sm)',
        background: selected
          ? 'var(--mantine-color-cyan-light)'
          : headerColor ? 'var(--mantine-color-default-hover)' : undefined,
        borderLeft: headerColor ? `3px solid var(--mantine-color-${headerColor}-6)` : undefined,
      }}
    >
      {label}
    </UnstyledButton>
  );
}

interface RunTreeProps {
  run: Run;
  selected: string;
  onSelect: (key: string) => void;
  // Ids of folded runs
  collapsedIds: Set<string>;
  onToggle: (runId: string) => void;
  depth?: number;
}

/** Whole run as a tree: run → its nodes → child runs started by each node */
export function RunTree({ run, selected, onSelect, collapsedIds, onToggle, depth = 0 }: RunTreeProps) {
  const nodes = Object.entries(run.nodeStates).sort(([, a], [, b]) => byStart(a.startedAt, b.startedAt));
  const nodeIds = new Set(nodes.map(([id]) => id));
  // Child runs without a known parent node are listed under the run itself
  const orphans = run.childRuns?.filter((child) => !nodes.some(([id]) => getNodeChildRuns(run, id).includes(child))) ?? [];
  const collapsed = collapsedIds.has(run.id);
  const Chevron = collapsed ? IconChevronRight : IconChevronDown;

  return (
    <Box>
      <Row
        depth={depth}
        selected={selected === run.id}
        onClick={() => onSelect(run.id)}
        headerColor={statusColors[run.status]}
        label={
          <Group gap={6} wrap="nowrap" w="100%">
            {/* Inside the row button - a span, not a nested button */}
            <Box
              component="span"
              role="button"
              aria-label={collapsed ? 'Expand' : 'Collapse'}
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                onToggle(run.id);
              }}
              style={{ display: 'flex', flexShrink: 0, cursor: 'pointer' }}
            >
              <Chevron size={14} />
            </Box>
            <IconRobot size={16} style={{ flexShrink: 0 }} />
            <RunStatusBadge status={run.status} iconOnly />
            <Text size="sm" fw={600} truncate>{run.agentName || run.agentId}</Text>
            <Duration startedAt={run.startedAt} completedAt={run.completedAt} />
          </Group>
        }
      />
      {!collapsed && nodes.map(([nodeId, state]) => (
        <Box key={nodeId}>
          <Row
            depth={depth + 1}
            selected={selected === nodeKey(run.id, nodeId)}
            onClick={() => onSelect(nodeKey(run.id, nodeId))}
            label={
              <Group gap={6} wrap="nowrap" w="100%">
                {!!state.nodeType && <NodeTypeIcon type={state.nodeType} size={14} />}
                <RunStatusBadge status={state.status} iconOnly />
                <Text size="xs" c={selected === nodeKey(run.id, nodeId) ? undefined : 'dimmed'} truncate>{nodeId}</Text>
                {state.startedAt && state.completedAt && (
                  <Duration startedAt={state.startedAt} completedAt={state.completedAt} />
                )}
              </Group>
            }
          />
          {nodeIds.has(nodeId) && getNodeChildRuns(run, nodeId).map((child) => (
            <RunTree key={child.id} run={child} selected={selected} onSelect={onSelect} collapsedIds={collapsedIds} onToggle={onToggle} depth={depth + 2} />
          ))}
        </Box>
      ))}
      {!collapsed && orphans.map((child) => (
        <RunTree key={child.id} run={child} selected={selected} onSelect={onSelect} collapsedIds={collapsedIds} onToggle={onToggle} depth={depth + 1} />
      ))}
    </Box>
  );
}

/** Ids of the run and all its child runs */
export function collectRunIds(run: Run): string[] {
  return [run.id, ...(run.childRuns ?? []).flatMap(collectRunIds)];
}
