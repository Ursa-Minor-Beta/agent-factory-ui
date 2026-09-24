import { Text, Stack, Paper, Group, ScrollArea } from '@mantine/core';
import type { NodeType } from '../../api';
import type { AgentNode } from '../../types';
import { NodeTypeAddButtons } from './NodeTypeAddButtons';

interface NodeTypeListProps {
  nodeTypes: NodeType[];
  currentNodes: AgentNode[];
  onAdd: (nodeType: NodeType, exampleIndex?: number) => void;
  onViewDetails: (nodeType: NodeType) => void;
}

export function NodeTypeList({ nodeTypes, currentNodes, onAdd, onViewDetails }: NodeTypeListProps) {
  const isNodeTypeDisabled = (type: string) => {
    // Only allow one input and one output node
    if (type === 'input' || type === 'output') {
      return currentNodes.some(node => node.type === type);
    }
    return false;
  };

  return (
    <ScrollArea style={{ flex: 1 }} offsetScrollbars>
      <Stack gap={4}>
        {nodeTypes.map((nodeType) => {
          const disabled = isNodeTypeDisabled(nodeType.type);
          return (
            <Paper
              key={nodeType.type}
              withBorder
              p="xs"
              style={{ cursor: 'pointer' }}
              title="Details"
              onClick={() => onViewDetails(nodeType)}
            >
              <Group justify="space-between" wrap="nowrap" gap={4}>
                <Text size="sm" fw={500} truncate style={{ flex: 1 }}>
                  {nodeType.type}
                </Text>
                <div onClick={(e) => e.stopPropagation()}>
                  <NodeTypeAddButtons
                    nodeType={nodeType}
                    disabled={disabled}
                    onAdd={onAdd}
                  />
                </div>
              </Group>
            </Paper>
          );
        })}
        {nodeTypes.length === 0 && (
          <Text size="sm" c="dimmed" ta="center" py="md">
            No node types available
          </Text>
        )}
      </Stack>
    </ScrollArea>
  );
}
