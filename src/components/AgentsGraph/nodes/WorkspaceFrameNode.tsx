import { memo } from 'react';
import { Anchor, Box, Text } from '@mantine/core';
import { Link } from 'react-router-dom';
import type { Node, NodeProps } from '@xyflow/react';
import { routes } from '../../../config/routes';

export type WorkspaceFrameNodeData = { label: string; workspaceId: string | null; width: number; height: number; agentIds: string[] };

// Labelled background frame around one workspace's agents (all-agents graph); click focuses the workspace
export const WorkspaceFrameNode = memo(function WorkspaceFrameNode({ data }: NodeProps<Node<WorkspaceFrameNodeData>>) {
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
      <Text size="lg" fw={700} c="dimmed" tt="uppercase" px="md" pt={8}>
        {data.workspaceId ? (
          // nodrag + stopPropagation: following the link must not drag or focus the frame
          <Anchor
            component={Link}
            to={routes.workspace(data.workspaceId)}
            inherit
            c="dimmed"
            className="nodrag"
            onClick={(event) => event.stopPropagation()}
          >
            {data.label}
          </Anchor>
        ) : (
          data.label
        )}
      </Text>
    </Box>
  );
});
