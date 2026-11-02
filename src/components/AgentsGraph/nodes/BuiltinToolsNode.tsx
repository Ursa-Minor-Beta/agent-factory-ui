import { Badge, Card, Group, Stack, Text, Tooltip } from '@mantine/core';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { IconTool } from '@tabler/icons-react';

export type BuiltinToolsNodeData = {
  tools: string[];
  width: number; // layout slot width; the visible box is narrower and centred in it
  small?: boolean; // editor panel: xs title like AgentNameNode
  maxVisible: number; // chips shown before collapsing the rest into "+N" (keeps the node short for the fixed row gap)
};

const NARROW_RATIO = 0.7;

// All built-in tools of one agent in a single node
export function BuiltinToolsNode({ data }: NodeProps<Node<BuiltinToolsNodeData>>) {
  const { tools, width, maxVisible, small } = data;
  const visible = tools.slice(0, maxVisible);
  const hidden = tools.length - visible.length;
  return (
    <div style={{ width, display: 'flex', justifyContent: 'center' }}>
      {/* Card - same background as AgentCard */}
      <Card withBorder radius="md" p={6} style={{ width: width * NARROW_RATIO, borderStyle: 'dotted', cursor: 'default' }}>
        <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
        <Stack gap={2} align="center">
          {/* Same title style as AgentCard / AgentNameNode next to it */}
          <Group gap={6} wrap="nowrap" mb={2}>
            <IconTool size={small ? 12 : 16} />
            <Text size={small ? 'xs' : undefined} fw={600}>Tools</Text>
          </Group>
          {visible.map((tool) => (
            <Text key={tool} size="xs" ff="monospace" truncate maw="100%">{tool}</Text>
          ))}
          {hidden > 0 && (
            <Tooltip
              label={<Stack gap={0}>{tools.slice(maxVisible).map((t) => <Text key={t} size="xs" ff="monospace">{t}</Text>)}</Stack>}
            >
              <Badge size="xs" variant="light">+{hidden} more</Badge>
            </Tooltip>
          )}
        </Stack>
      </Card>
    </div>
  );
}
