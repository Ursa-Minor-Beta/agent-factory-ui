import { Paper, Text, Tooltip } from '@mantine/core';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import type { NodeStatus } from '../../../types';
import type { GraphSizes } from '../types';

export const NAME_NODE_SIZES: GraphSizes = { nodeWidth: 160, slot: 190, rowGap: 90 };

export type AgentNameNodeData = { name: string; current: boolean; isNew?: boolean; runStatus?: NodeStatus };

// Name-only node (editor side panel); running agents get a glow via AgentsGraph.css
export function AgentNameNode({ data }: NodeProps<Node<AgentNameNodeData>>) {
  const { name, current, isNew, runStatus } = data;
  return (
    <Paper
      withBorder
      className={runStatus ? `agents-graph-run-${runStatus}` : undefined}
      radius="md"
      px="xs"
      py={6}
      style={{
        width: NAME_NODE_SIZES.nodeWidth,
        cursor: current ? 'default' : 'pointer',
        boxShadow: current ? '0 0 0 2px var(--mantine-color-cyan-5)' : 'var(--mantine-shadow-xs)',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Tooltip label={current ? null : 'Switch to the agent'} openDelay={1000}>
        <Text size="xs" ta="center" truncate fs={isNew ? 'italic' : undefined}>
          {name}
        </Text>
      </Tooltip>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </Paper>
  );
}
