import { Center, Paper, Text, Tooltip } from '@mantine/core';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import type { AgentGraphNode, NodeStatus } from '../../../types';
import { WorkspaceBadge } from '../../Workspace';
import type { GraphSizes } from '../types';

export const NAME_NODE_SIZES: GraphSizes = { nodeWidth: 160, slot: 190, rowGap: 90 };

export type AgentNameNodeData = {
  name: string;
  current: boolean;
  isNew?: boolean;
  runStatus?: NodeStatus;
  external?: boolean; // agent from another workspace - dashed, shows its workspace
  missing?: boolean; // reference to a deleted/inaccessible agent - red, not clickable
  workspaceId?: string | null;
  workspaceName?: string | null;
  width?: number; // defaults to NAME_NODE_SIZES (card graph renders external agents card-wide)
};

// Name-only node data for an agent of the relation graph
export function nameNodeData(node: AgentGraphNode, currentAgentId?: string): AgentNameNodeData {
  return {
    name: node.missing ? 'Missing agent' : node.name,
    current: node.id === currentAgentId,
    external: node.external,
    missing: node.missing,
    workspaceId: node.workspaceId,
    workspaceName: node.workspaceName,
  };
}

function tooltipLabel({ current, missing, external, workspaceName }: AgentNameNodeData) {
  if (missing) return 'Agent was deleted or you have no access to it';
  if (current) return null;
  if (external) return `Open the agent from ${workspaceName ?? 'another workspace'}`;
  return 'Switch to the agent';
}

// Name-only node (editor side panel, external agents); running agents get a glow via AgentsGraph.css
export function AgentNameNode({ data }: NodeProps<Node<AgentNameNodeData>>) {
  const { name, current, isNew, runStatus, external, missing, workspaceId, workspaceName, width = NAME_NODE_SIZES.nodeWidth } = data;
  return (
    <Paper
      withBorder
      className={runStatus ? `agents-graph-run-${runStatus}` : undefined}
      radius="md"
      px="xs"
      py={6}
      style={{
        width,
        cursor: current || missing ? 'default' : 'pointer',
        boxShadow: current ? '0 0 0 2px var(--mantine-color-cyan-5)' : 'var(--mantine-shadow-xs)',
        ...(external || missing ? { borderStyle: 'dashed', opacity: 0.75 } : {}),
        ...(missing ? { borderColor: 'var(--mantine-color-red-6)' } : {}),
      }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Tooltip label={tooltipLabel(data)} disabled={!tooltipLabel(data)} openDelay={missing ? 0 : 1000}>
        <Text size="xs" ta="center" truncate fs={isNew || missing ? 'italic' : undefined} c={missing ? 'red' : undefined}>
          {name}
        </Text>
      </Tooltip>
      {external && (
        // Badge links to its workspace - keep the click from also triggering the node's click
        <Center mt={4} onClick={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
          <WorkspaceBadge workspaceId={workspaceId ?? undefined} workspaceName={workspaceName ?? undefined} size="xs" />
        </Center>
      )}
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </Paper>
  );
}
