import { Box } from '@mantine/core';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import type { Agent } from '../../../types';
import { AgentCard } from '../../AgentsList/AgentCard';
import type { AgentCardProps } from '../../AgentsList/types';
import type { GraphSizes } from '../types';

export const CARD_NODE_SIZES: GraphSizes = { nodeWidth: 300, slot: 380, rowGap: 180, nodeHeight: 110 };

export type CardActions = Omit<AgentCardProps, 'agent' | 'compact'>;
export type AgentCardNodeData = { agent: Agent; actions: CardActions; external?: boolean }; // external: from another workspace - dashed

// Full compact AgentCard with its actions (agents list)
export function AgentCardNode({ data }: NodeProps<Node<AgentCardNodeData>>) {
  return (
    <Box className={data.external ? 'agents-graph-external' : undefined} style={{ width: CARD_NODE_SIZES.nodeWidth, boxShadow: 'var(--mantine-shadow-xs)' }}>
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <AgentCard agent={data.agent} {...data.actions} compact />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </Box>
  );
}
