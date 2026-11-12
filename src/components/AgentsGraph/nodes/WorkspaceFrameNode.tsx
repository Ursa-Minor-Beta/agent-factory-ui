import { Box, Text } from '@mantine/core';
import type { Node, NodeProps } from '@xyflow/react';

export type WorkspaceFrameNodeData = { label: string; width: number; height: number; agentIds: string[] };

// Labelled background frame around one workspace's agents (all-agents graph); click focuses the workspace
export function WorkspaceFrameNode({ data }: NodeProps<Node<WorkspaceFrameNodeData>>) {
  return (
    <Box
      style={{
        width: data.width,
        height: data.height,
        border: '1px dashed var(--mantine-color-default-border)',
        borderRadius: 'var(--mantine-radius-lg)',
        background: 'color-mix(in srgb, var(--mantine-color-default) 40%, transparent)',
        cursor: 'pointer',
      }}
    >
      <Text size="sm" fw={600} c="dimmed" px="md" pt={6}>
        {data.label}
      </Text>
    </Box>
  );
}
